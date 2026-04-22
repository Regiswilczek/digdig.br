#!/usr/bin/env python3
"""
=============================================================
AGENTE DE AUDITORIA ADMINISTRATIVA - CAU/PR
=============================================================
Autor: Regis Alessander Wilczek / Manus AI
Versão: 1.0
Data: Abril 2026

Descrição:
    Analisa atos administrativos do CAU/PR (portarias,
    deliberações, portarias normativas) verificando:
    1. Conformidade legal com o Regimento Interno
    2. Irregularidades morais e éticas
    3. Padrões suspeitos de gestão

Uso:
    python agente_auditoria.py --input portarias_completo.json
    python agente_auditoria.py --all  # analisa tudo
    python agente_auditoria.py --relatorio  # gera relatório HTML
=============================================================
"""

import json
import os
import re
import sys
import argparse
from datetime import datetime
from openai import OpenAI

# ─────────────────────────────────────────────────────────────
# CONFIGURAÇÃO
# ─────────────────────────────────────────────────────────────

# Usar gemini-2.5-flash para análise de custo-benefício
MODEL = "gemini-2.5-flash"

# Regimento Interno - Regras Codificadas
REGRAS_REGIMENTO = {
    "comissoes_especiais_max_por_conselheiro": 3,
    "prazo_comissao_processante_dias": 60,
    "prazo_maximo_prorrogacao_processante": 120,
    "autoridade_nomear_cargo_comissao": "Presidente",
    "quorum_deliberacao_plenaria": 0.5,  # maioria simples
    "prazo_publicacao_ato_dias": 5,
    "ad_referendum_requer_ratificacao": True,
    "limite_ad_referendum_consecutivos": 3,  # suspeito se mais que isso
}

# Palavras-chave para análise moral
ALERTAS_MORAIS = {
    "favorecimento": [
        "cônjuge", "esposo", "esposa", "filho", "filha", "irmão", "irmã",
        "sócio", "empresa", "ltda", "mei", "epp"
    ],
    "perseguicao": [
        "oposição", "sindicância", "apuração", "violação", "código de conduta",
        "decoro", "infração", "processo ético"
    ],
    "concentracao_poder": [
        "ad referendum", "praticado pelo presidente", "monocrática"
    ],
    "gastos_suspeitos": [
        "viagem", "diária", "hospedagem", "passagem", "evento", "congresso",
        "webtrip", "agência de viagens"
    ],
    "cabide_empregos": [
        "gratificação", "função gratificada", "cargo em comissão", "assessor especial",
        "assessor técnico", "assessor jurídico"
    ]
}


# ─────────────────────────────────────────────────────────────
# CLIENTE LLM
# ─────────────────────────────────────────────────────────────

client = OpenAI()


def analisar_ato_com_llm(ato: dict, tipo: str) -> dict:
    """Usa LLM para análise profunda de um ato administrativo."""
    
    prompt_sistema = """Você é um auditor especializado em direito administrativo brasileiro e ética pública.
Sua missão é analisar atos administrativos do CAU/PR (Conselho de Arquitetura e Urbanismo do Paraná) 
e identificar TANTO irregularidades legais QUANTO irregularidades morais e éticas.

IMPORTANTE: No Brasil, muitas irregularidades morais são toleradas legalmente, mas são POLITICAMENTE 
relevantes. Você deve identificar TUDO que "cheira errado", mesmo que não seja estritamente ilegal.

Regimento Interno do CAU/PR - Pontos Principais:
- Presidente tem poder de ato Ad Referendum (mas deve ser ratificado pelo plenário)
- Comissões Processantes têm prazo de 60 dias (prorrogável)
- Cargos em comissão são de livre nomeação pelo Presidente
- Conselheiros não podem acumular mais de 3 comissões especiais
- Deliberações plenárias requerem maioria simples

CRITÉRIOS DE ANÁLISE:

1. LEGAL: Violações diretas ao Regimento Interno, Lei 12.378/2010
2. MORAL/ÉTICO: 
   - Nepotismo ou favorecimento (mesmo que "legal")
   - Perseguição política via comissões processantes
   - Concentração de poder (excesso de Ad Referendum)
   - Gastos questionáveis com viagens, eventos, diárias
   - "Cabide de empregos" - cargos desnecessários
   - Falta de transparência (ementas genéricas)
   - Aparelhamento político do conselho

Responda SEMPRE em JSON com esta estrutura:
{
  "status": "conforme|irregular|suspeito|critico",
  "nivel_alerta": "verde|amarelo|laranja|vermelho",
  "irregularidades_legais": [
    {"tipo": "...", "descricao": "...", "artigo_violado": "...", "gravidade": "alta|media|baixa"}
  ],
  "irregularidades_morais": [
    {"tipo": "...", "descricao": "...", "impacto_politico": "...", "gravidade": "alta|media|baixa"}
  ],
  "padroes_suspeitos": ["..."],
  "resumo_executivo": "...",
  "recomendacao_campanha": "..."
}"""

    prompt_usuario = f"""Analise o seguinte ato administrativo do CAU/PR:

TIPO: {tipo.upper()}
NÚMERO: {ato.get('numero', 'N/A')}
DATA: {ato.get('data', 'N/A')}
TÍTULO: {ato.get('titulo', 'N/A')}
EMENTA: {ato.get('ementa', 'N/A')}

Identifique TODAS as irregularidades, tanto legais quanto morais/éticas."""

    try:
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": prompt_sistema},
                {"role": "user", "content": prompt_usuario}
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=1000
        )
        
        resultado = json.loads(response.choices[0].message.content)
        resultado['numero_ato'] = ato.get('numero', 'N/A')
        resultado['data_ato'] = ato.get('data', 'N/A')
        resultado['tipo_ato'] = tipo
        resultado['titulo_ato'] = ato.get('titulo', 'N/A')
        resultado['ementa_ato'] = ato.get('ementa', 'N/A')[:200]
        resultado['link_pdf'] = ato.get('links_pdf', [''])[0] if ato.get('links_pdf') else ''
        return resultado
        
    except Exception as e:
        return {
            "numero_ato": ato.get('numero', 'N/A'),
            "status": "erro",
            "nivel_alerta": "cinza",
            "erro": str(e),
            "irregularidades_legais": [],
            "irregularidades_morais": [],
            "padroes_suspeitos": [],
            "resumo_executivo": f"Erro na análise: {str(e)}",
            "recomendacao_campanha": ""
        }


def analise_rapida_local(ato: dict, tipo: str) -> dict:
    """Análise rápida baseada em regras sem LLM - para triagem inicial."""
    alertas = []
    nivel = "verde"
    
    ementa = (ato.get('ementa', '') + ' ' + ato.get('titulo', '')).lower()
    
    # Verificar padrões suspeitos
    for categoria, palavras in ALERTAS_MORAIS.items():
        for palavra in palavras:
            if palavra.lower() in ementa:
                alertas.append(f"{categoria}: contém '{palavra}'")
                if nivel == "verde":
                    nivel = "amarelo"
    
    # Verificar Ad Referendum excessivo
    if 'ad referendum' in ementa:
        alertas.append("concentracao_poder: ato praticado unilateralmente pelo Presidente")
        nivel = "amarelo"
    
    # Verificar comissões processantes
    if 'comissão processante' in ementa or 'comissao processante' in ementa:
        alertas.append("processo_disciplinar: instauração ou prorrogação de comissão processante")
        nivel = "amarelo"
    
    # Verificar prorrogações múltiplas
    if 'prorroga' in ementa and 'reconduzida' in ementa:
        alertas.append("prazo_excessivo: comissão processante com múltiplas prorrogações")
        nivel = "laranja"
    
    # Verificar contratos com empresas de viagem
    if 'viagem' in ementa or 'turismo' in ementa:
        alertas.append("gastos_suspeitos: contrato com empresa de viagens")
        nivel = "amarelo"
    
    return {
        "numero_ato": ato.get('numero', 'N/A'),
        "tipo_ato": tipo,
        "data_ato": ato.get('data', 'N/A'),
        "titulo_ato": ato.get('titulo', 'N/A'),
        "ementa_ato": ato.get('ementa', 'N/A')[:200],
        "link_pdf": ato.get('links_pdf', [''])[0] if ato.get('links_pdf') else '',
        "nivel_alerta": nivel,
        "alertas_rapidos": alertas,
        "requer_analise_profunda": len(alertas) > 0
    }


def analisar_padroes_globais(todos_atos: list) -> dict:
    """Analisa padrões globais em todos os atos."""
    
    # Contar Ad Referendum por período
    ad_referendum = [a for a in todos_atos if 'ad_referendum' in a.get('tipo', '').lower() 
                     or 'ad referendum' in a.get('titulo', '').lower()]
    
    # Contar prorrogações de comissões processantes
    prorrogacoes = [a for a in todos_atos if 'prorroga' in a.get('ementa', '').lower() 
                    and 'processante' in a.get('ementa', '').lower()]
    
    # Contar nomeações
    nomeacoes = [a for a in todos_atos if 'nomeia' in a.get('ementa', '').lower() 
                 or 'nomeia' in a.get('titulo', '').lower()]
    
    # Contar exonerações
    exoneracoes = [a for a in todos_atos if 'exonera' in a.get('ementa', '').lower() 
                   or 'exonera' in a.get('titulo', '').lower()]
    
    # Contratos com empresas
    contratos_viagem = [a for a in todos_atos if 'viagem' in a.get('ementa', '').lower() 
                        or 'turismo' in a.get('ementa', '').lower()]
    
    padroes = {
        "total_atos_analisados": len(todos_atos),
        "total_ad_referendum": len(ad_referendum),
        "total_prorrogacoes_processante": len(prorrogacoes),
        "total_nomeacoes": len(nomeacoes),
        "total_exoneracoes": len(exoneracoes),
        "total_contratos_viagem": len(contratos_viagem),
        "ratio_ad_referendum": f"{len(ad_referendum)/max(len(todos_atos),1)*100:.1f}%",
        "alertas_padroes": []
    }
    
    # Alertas de padrão
    if len(ad_referendum) > 10:
        padroes["alertas_padroes"].append(
            f"ALERTA: {len(ad_referendum)} atos Ad Referendum detectados - possível concentração de poder"
        )
    
    if len(prorrogacoes) > 5:
        padroes["alertas_padroes"].append(
            f"ALERTA: {len(prorrogacoes)} prorrogações de comissões processantes - possível uso como instrumento político"
        )
    
    if len(contratos_viagem) > 3:
        padroes["alertas_padroes"].append(
            f"ALERTA: {len(contratos_viagem)} contratos/atos relacionados a viagens - verificar gastos"
        )
    
    if len(exoneracoes) > len(nomeacoes) * 1.5:
        padroes["alertas_padroes"].append(
            f"ALERTA: Proporção exoneração/nomeação suspeita ({len(exoneracoes)}/{len(nomeacoes)}) - possível perseguição"
        )
    
    return padroes


def gerar_relatorio_html(resultados: list, padroes: dict, arquivo_saida: str = "relatorio_auditoria.html"):
    """Gera relatório HTML interativo."""
    
    # Contar por nível
    niveis = {"vermelho": 0, "laranja": 0, "amarelo": 0, "verde": 0, "cinza": 0}
    for r in resultados:
        nivel = r.get("nivel_alerta", "cinza")
        niveis[nivel] = niveis.get(nivel, 0) + 1
    
    # Filtrar irregulares
    irregulares = [r for r in resultados if r.get("nivel_alerta") in ["vermelho", "laranja", "amarelo"]]
    irregulares.sort(key=lambda x: {"vermelho": 0, "laranja": 1, "amarelo": 2}.get(x.get("nivel_alerta", "cinza"), 3))
    
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Auditoria CAU/PR - Relatório de Irregularidades</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; }}
        
        .header {{ background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 40px; text-align: center; border-bottom: 3px solid #e94560; }}
        .header h1 {{ font-size: 2.5em; color: #e94560; margin-bottom: 10px; }}
        .header p {{ color: #aaa; font-size: 1.1em; }}
        
        .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 30px; }}
        .stat-card {{ background: #1a1a2e; border-radius: 12px; padding: 25px; text-align: center; border-left: 4px solid; }}
        .stat-card.vermelho {{ border-color: #e94560; }}
        .stat-card.laranja {{ border-color: #ff6b35; }}
        .stat-card.amarelo {{ border-color: #ffd700; }}
        .stat-card.verde {{ border-color: #4caf50; }}
        .stat-card h2 {{ font-size: 3em; margin-bottom: 5px; }}
        .stat-card.vermelho h2 {{ color: #e94560; }}
        .stat-card.laranja h2 {{ color: #ff6b35; }}
        .stat-card.amarelo h2 {{ color: #ffd700; }}
        .stat-card.verde h2 {{ color: #4caf50; }}
        .stat-card p {{ color: #aaa; font-size: 0.9em; }}
        
        .padroes {{ background: #1a1a2e; margin: 20px 30px; padding: 25px; border-radius: 12px; border-left: 4px solid #e94560; }}
        .padroes h2 {{ color: #e94560; margin-bottom: 15px; }}
        .alerta-padrao {{ background: rgba(233,69,96,0.1); border: 1px solid rgba(233,69,96,0.3); border-radius: 8px; padding: 12px; margin: 8px 0; color: #ff8fa3; }}
        
        .section {{ padding: 20px 30px; }}
        .section h2 {{ color: #e94560; font-size: 1.5em; margin-bottom: 20px; border-bottom: 1px solid #333; padding-bottom: 10px; }}
        
        .ato-card {{ background: #1a1a2e; border-radius: 12px; padding: 20px; margin: 15px 0; border-left: 5px solid; transition: transform 0.2s; }}
        .ato-card:hover {{ transform: translateX(5px); }}
        .ato-card.vermelho {{ border-color: #e94560; }}
        .ato-card.laranja {{ border-color: #ff6b35; }}
        .ato-card.amarelo {{ border-color: #ffd700; }}
        
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 0.8em; font-weight: bold; margin: 2px; }}
        .badge.vermelho {{ background: rgba(233,69,96,0.2); color: #e94560; border: 1px solid #e94560; }}
        .badge.laranja {{ background: rgba(255,107,53,0.2); color: #ff6b35; border: 1px solid #ff6b35; }}
        .badge.amarelo {{ background: rgba(255,215,0,0.2); color: #ffd700; border: 1px solid #ffd700; }}
        
        .ato-header {{ display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }}
        .ato-numero {{ font-size: 1.2em; font-weight: bold; color: #fff; }}
        .ato-data {{ color: #aaa; font-size: 0.9em; }}
        .ato-ementa {{ color: #ccc; font-size: 0.95em; margin: 10px 0; line-height: 1.5; }}
        
        .irregularidades {{ margin-top: 15px; }}
        .irr-titulo {{ font-size: 0.85em; font-weight: bold; color: #aaa; text-transform: uppercase; margin: 10px 0 5px; }}
        .irr-item {{ background: rgba(255,255,255,0.05); border-radius: 6px; padding: 10px; margin: 5px 0; font-size: 0.9em; }}
        .irr-item.legal {{ border-left: 3px solid #e94560; }}
        .irr-item.moral {{ border-left: 3px solid #ff6b35; }}
        
        .resumo {{ background: rgba(233,69,96,0.1); border-radius: 8px; padding: 12px; margin-top: 10px; font-size: 0.9em; color: #ff8fa3; font-style: italic; }}
        .recomendacao {{ background: rgba(255,215,0,0.1); border-radius: 8px; padding: 12px; margin-top: 8px; font-size: 0.9em; color: #ffd700; }}
        
        .pdf-link {{ display: inline-block; margin-top: 10px; color: #4fc3f7; font-size: 0.85em; text-decoration: none; }}
        .pdf-link:hover {{ text-decoration: underline; }}
        
        .filtros {{ background: #1a1a2e; padding: 15px 30px; display: flex; gap: 10px; flex-wrap: wrap; }}
        .filtro-btn {{ padding: 8px 20px; border-radius: 20px; border: 1px solid; cursor: pointer; font-size: 0.9em; background: transparent; transition: all 0.2s; }}
        .filtro-btn.vermelho {{ border-color: #e94560; color: #e94560; }}
        .filtro-btn.laranja {{ border-color: #ff6b35; color: #ff6b35; }}
        .filtro-btn.amarelo {{ border-color: #ffd700; color: #ffd700; }}
        .filtro-btn:hover {{ background: rgba(255,255,255,0.1); }}
        
        .footer {{ text-align: center; padding: 30px; color: #555; border-top: 1px solid #222; margin-top: 40px; }}
    </style>
</head>
<body>

<div class="header">
    <h1>🔍 Auditoria Administrativa CAU/PR</h1>
    <p>Relatório de Irregularidades Legais e Éticas | Gerado em {datetime.now().strftime('%d/%m/%Y às %H:%M')}</p>
    <p style="margin-top:10px; color:#e94560;">Total de atos analisados: <strong>{padroes.get('total_atos_analisados', 0)}</strong></p>
</div>

<div class="stats">
    <div class="stat-card vermelho">
        <h2>{niveis.get('vermelho', 0)}</h2>
        <p>🔴 CRÍTICO<br>Violações Graves</p>
    </div>
    <div class="stat-card laranja">
        <h2>{niveis.get('laranja', 0)}</h2>
        <p>🟠 GRAVE<br>Irregularidades Morais</p>
    </div>
    <div class="stat-card amarelo">
        <h2>{niveis.get('amarelo', 0)}</h2>
        <p>🟡 ATENÇÃO<br>Suspeitos</p>
    </div>
    <div class="stat-card verde">
        <h2>{niveis.get('verde', 0)}</h2>
        <p>🟢 CONFORME<br>Sem Irregularidades</p>
    </div>
</div>

<div class="padroes">
    <h2>⚠️ Padrões Globais Detectados</h2>
    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap:15px; margin-bottom:20px;">
        <div style="text-align:center;"><strong style="color:#e94560; font-size:2em;">{padroes.get('total_ad_referendum', 0)}</strong><br><small>Atos Ad Referendum</small></div>
        <div style="text-align:center;"><strong style="color:#ff6b35; font-size:2em;">{padroes.get('total_prorrogacoes_processante', 0)}</strong><br><small>Prorrogações de Comissões Processantes</small></div>
        <div style="text-align:center;"><strong style="color:#ffd700; font-size:2em;">{padroes.get('total_nomeacoes', 0)}</strong><br><small>Nomeações</small></div>
        <div style="text-align:center;"><strong style="color:#ff8fa3; font-size:2em;">{padroes.get('total_exoneracoes', 0)}</strong><br><small>Exonerações</small></div>
    </div>
    {''.join(f'<div class="alerta-padrao">⚠️ {alerta}</div>' for alerta in padroes.get('alertas_padroes', []))}
</div>

<div class="section">
    <h2>📋 Atos com Irregularidades ({len(irregulares)} encontrados)</h2>
"""
    
    for r in irregulares:
        nivel = r.get("nivel_alerta", "amarelo")
        irr_legais = r.get("irregularidades_legais", [])
        irr_morais = r.get("irregularidades_morais", [])
        alertas_rapidos = r.get("alertas_rapidos", [])
        
        html += f"""
    <div class="ato-card {nivel}">
        <div class="ato-header">
            <div>
                <span class="ato-numero">{r.get('tipo_ato', '').upper()} Nº {r.get('numero_ato', 'N/A')}</span>
                <span class="badge {nivel}">{'🔴 CRÍTICO' if nivel=='vermelho' else '🟠 GRAVE' if nivel=='laranja' else '🟡 ATENÇÃO'}</span>
            </div>
            <span class="ato-data">{r.get('data_ato', 'N/A')}</span>
        </div>
        <div class="ato-ementa">{r.get('ementa_ato', r.get('titulo_ato', 'N/A'))[:300]}</div>
"""
        
        if irr_legais:
            html += '<div class="irregularidades"><div class="irr-titulo">⚖️ Irregularidades Legais</div>'
            for irr in irr_legais[:3]:
                html += f'<div class="irr-item legal"><strong>{irr.get("tipo","")}</strong>: {irr.get("descricao","")}</div>'
            html += '</div>'
        
        if irr_morais:
            html += '<div class="irregularidades"><div class="irr-titulo">🎭 Irregularidades Morais/Éticas</div>'
            for irr in irr_morais[:3]:
                html += f'<div class="irr-item moral"><strong>{irr.get("tipo","")}</strong>: {irr.get("descricao","")}</div>'
            html += '</div>'
        
        if alertas_rapidos and not irr_legais and not irr_morais:
            html += '<div class="irregularidades"><div class="irr-titulo">🔍 Alertas Detectados</div>'
            for alerta in alertas_rapidos[:3]:
                html += f'<div class="irr-item moral">{alerta}</div>'
            html += '</div>'
        
        resumo = r.get("resumo_executivo", "")
        if resumo:
            html += f'<div class="resumo">📝 {resumo}</div>'
        
        recomendacao = r.get("recomendacao_campanha", "")
        if recomendacao:
            html += f'<div class="recomendacao">🎯 Uso na Campanha: {recomendacao}</div>'
        
        link_pdf = r.get("link_pdf", "")
        if link_pdf:
            html += f'<a href="{link_pdf}" target="_blank" class="pdf-link">📄 Ver documento original</a>'
        
        html += '</div>'
    
    html += f"""
</div>

<div class="footer">
    <p>Relatório gerado pelo Agente de Auditoria CAU/PR | {datetime.now().strftime('%d/%m/%Y')}</p>
    <p style="margin-top:5px; color:#333;">Desenvolvido para apoiar a campanha de retomada da gestão do CAU/PR</p>
</div>

</body>
</html>"""
    
    with open(arquivo_saida, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"✅ Relatório HTML gerado: {arquivo_saida}")
    return arquivo_saida


# ─────────────────────────────────────────────────────────────
# FUNÇÃO PRINCIPAL
# ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Agente de Auditoria CAU/PR')
    parser.add_argument('--portarias', default='portarias_completo.json', help='JSON de portarias')
    parser.add_argument('--deliberacoes', default='deliberacoes_completo.json', help='JSON de deliberações')
    parser.add_argument('--modo', choices=['rapido', 'profundo', 'padrao'], default='rapido',
                        help='rapido=sem LLM, profundo=com LLM, padrao=LLM apenas nos suspeitos')
    parser.add_argument('--max-atos', type=int, default=100, help='Máximo de atos a analisar')
    parser.add_argument('--relatorio', default='relatorio_auditoria.html', help='Arquivo HTML de saída')
    args = parser.parse_args()
    
    print("=" * 60)
    print("  AGENTE DE AUDITORIA ADMINISTRATIVA - CAU/PR")
    print("=" * 60)
    
    todos_atos = []
    resultados = []
    
    # Carregar portarias
    if os.path.exists(args.portarias):
        with open(args.portarias, 'r', encoding='utf-8') as f:
            portarias = json.load(f)
        print(f"\n📁 Portarias carregadas: {len(portarias)}")
        todos_atos.extend([{**p, '_tipo': 'portaria'} for p in portarias])
    
    # Carregar deliberações
    if os.path.exists(args.deliberacoes):
        with open(args.deliberacoes, 'r', encoding='utf-8') as f:
            deliberacoes = json.load(f)
        print(f"📁 Deliberações carregadas: {len(deliberacoes)}")
        todos_atos.extend([{**d, '_tipo': 'deliberacao'} for d in deliberacoes])
    
    print(f"\n🔍 Total de atos para análise: {len(todos_atos)}")
    
    # Limitar se necessário
    atos_para_analisar = todos_atos[:args.max_atos]
    
    # Analisar padrões globais
    print("\n📊 Analisando padrões globais...")
    padroes = analisar_padroes_globais(todos_atos)
    
    print(f"\n{'='*40}")
    print("PADRÕES DETECTADOS:")
    for alerta in padroes.get('alertas_padroes', []):
        print(f"  ⚠️  {alerta}")
    print(f"{'='*40}\n")
    
    # Analisar atos individualmente
    print(f"🔍 Analisando {len(atos_para_analisar)} atos (modo: {args.modo})...")
    
    for i, ato in enumerate(atos_para_analisar):
        tipo = ato.get('_tipo', 'desconhecido')
        
        if args.modo == 'rapido':
            resultado = analise_rapida_local(ato, tipo)
        elif args.modo == 'profundo':
            print(f"  [{i+1}/{len(atos_para_analisar)}] Analisando {tipo} {ato.get('numero', 'N/A')}...")
            resultado = analisar_ato_com_llm(ato, tipo)
        else:  # padrao
            # Primeiro triagem rápida
            resultado_rapido = analise_rapida_local(ato, tipo)
            # Se suspeito, análise profunda com LLM
            if resultado_rapido.get('requer_analise_profunda'):
                print(f"  [{i+1}/{len(atos_para_analisar)}] 🔍 Análise profunda: {tipo} {ato.get('numero', 'N/A')}...")
                resultado = analisar_ato_com_llm(ato, tipo)
            else:
                resultado = resultado_rapido
        
        resultados.append(resultado)
        
        # Mostrar alertas importantes
        nivel = resultado.get('nivel_alerta', 'verde')
        if nivel in ['vermelho', 'laranja']:
            print(f"  🚨 ALERTA {nivel.upper()}: {tipo} {ato.get('numero', 'N/A')} - {ato.get('ementa', '')[:60]}...")
    
    # Salvar resultados JSON
    with open('resultados_auditoria.json', 'w', encoding='utf-8') as f:
        json.dump({
            'data_analise': datetime.now().isoformat(),
            'padroes_globais': padroes,
            'resultados': resultados
        }, f, ensure_ascii=False, indent=2)
    
    print(f"\n✅ Resultados salvos: resultados_auditoria.json")
    
    # Gerar relatório HTML
    print(f"\n📊 Gerando relatório HTML...")
    gerar_relatorio_html(resultados, padroes, args.relatorio)
    
    # Resumo final
    niveis = {}
    for r in resultados:
        n = r.get('nivel_alerta', 'cinza')
        niveis[n] = niveis.get(n, 0) + 1
    
    print(f"\n{'='*60}")
    print("RESUMO DA AUDITORIA:")
    print(f"  🔴 Críticos: {niveis.get('vermelho', 0)}")
    print(f"  🟠 Graves:   {niveis.get('laranja', 0)}")
    print(f"  🟡 Atenção:  {niveis.get('amarelo', 0)}")
    print(f"  🟢 Conformes: {niveis.get('verde', 0)}")
    print(f"{'='*60}")
    print(f"\n🎯 Relatório HTML: {args.relatorio}")
    print(f"📄 Dados JSON: resultados_auditoria.json")


if __name__ == '__main__':
    main()
