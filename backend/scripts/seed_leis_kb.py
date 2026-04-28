#!/usr/bin/env python3
"""
seed_leis_kb.py — Insere base legal na KnowledgeBase do tenant CAU-PR

Adiciona 6 documentos legais para que o Piper e o Bud tenham conhecimento
jurídico embutido no system prompt:
  - Art. 37 CF/88 (LIMPE)
  - Lei 12.378/2010 (Lei do CAU)
  - Lei 8.429/92 (Improbidade Administrativa)
  - Resoluções CAU/BR nº 51, 91, 194
  - Leis de Licitação 8.666/93 e 14.133/21
  - LAI (Lei 12.527/2011)

Uso:
    cd backend
    python scripts/seed_leis_kb.py [--tenant caupr] [--dry-run]
"""
import asyncio
import sys
import uuid
from pathlib import Path

ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

import argparse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.tenant import Tenant, KnowledgeBase


# ─── Conteúdo curado das leis ────────────────────────────────────────────────
# Excerpts relevantes para auditoria de atos administrativos.
# Texto completo das leis está disponível em https://www.planalto.gov.br
# ─────────────────────────────────────────────────────────────────────────────

LEIS = [
    {
        "titulo": "Art. 37 CF/88 — Princípios LIMPE (Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência)",
        "tipo": "lei",
        "conteudo": """CONSTITUIÇÃO FEDERAL — Art. 37 (Administração Pública)

Art. 37. A administração pública direta e indireta de qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios obedecerá aos princípios de legalidade, impessoalidade, moralidade, publicidade e eficiência.

§ 1º A publicidade dos atos, programas, obras, serviços e campanhas dos órgãos públicos deverá ter caráter educativo, informativo ou de orientação social, dela não podendo constar nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades ou servidores públicos.

§ 4º Os atos de improbidade administrativa importarão a suspensão dos direitos políticos, a perda da função pública, a indisponibilidade dos bens e o ressarcimento ao erário, na forma e gradação previstas em lei, sem prejuízo da ação penal cabível.

§ 5º A lei estabelecerá os prazos de prescrição para ilícitos praticados por qualquer agente, servidor ou não, que causem prejuízos ao erário, ressalvadas as respectivas ações de ressarcimento.

§ 6º As pessoas jurídicas de direito público e as de direito privado prestadoras de serviços públicos responderão pelos danos que seus agentes, nessa qualidade, causarem a terceiros, assegurado o direito de regresso contra o responsável nos casos de dolo ou culpa.

§ 11. Não serão computadas, para efeito dos limites remuneratórios de que trata o inciso XI do caput deste artigo, as parcelas de caráter indenizatório previstas em lei.

APLICAÇÃO PRÁTICA NA AUDITORIA:
- Legalidade: o ato deve ter base legal expressa. Atos sem fundamento legal são indício de irregularidade.
- Impessoalidade: vedado favorecimento ou perseguição de pessoas. Nomeações sem critério técnico e exonerações sem causa são indícios de violação.
- Moralidade: mesmo que "legal", o ato deve ser ético. Nepotismo, clientelismo e concentração de poder violam a moralidade administrativa mesmo sem violar regra formal.
- Publicidade: atos sem publicação adequada, ementas genéricas ou ocultação de beneficiários são indícios de violação.
- Eficiência: criação de cargos desnecessários, comissões sem resultado e gastos sem contrapartida violam a eficiência.""",
    },
    {
        "titulo": "Lei 12.378/2010 — Regulamenta o exercício da Arquitetura e Urbanismo (Lei de criação do CAU)",
        "tipo": "lei",
        "conteudo": """LEI 12.378/2010 — Lei de criação do Conselho de Arquitetura e Urbanismo (CAU)

Art. 1º Esta Lei regulamenta o exercício da profissão de arquiteto e urbanista, dispõe sobre a criação e o funcionamento do Conselho de Arquitetura e Urbanismo do Brasil (CAU/BR) e dos Conselhos de Arquitetura e Urbanismo dos Estados e do Distrito Federal (CAU/UF).

Art. 26. Compete ao CAU/BR e aos CAU/UF, no âmbito de suas respectivas atribuições:
I – orientar, disciplinar e fiscalizar o exercício da profissão de arquiteto e urbanista;
II – zelar pelo prestígio e bom nome da profissão;
III – defender os interesses e os direitos dos profissionais da área;
IV – elaborar e aprovar os respectivos regimentos internos.

Art. 31. O CAU/BR e os CAU/UF são mantidos pelas anuidades e multas pagas pelos profissionais inscritos, por doações, legados e outras receitas.

Art. 32. Os recursos financeiros do CAU/BR e dos CAU/UF são aplicados, exclusivamente, no custeio de seus objetivos institucionais e no pagamento de seus compromissos.
§ 1º É vedada a destinação de recursos do CAU para fins de promoção pessoal de seus dirigentes.
§ 2º As contas do CAU/BR e dos CAU/UF são submetidas a auditoria independente anualmente.

Art. 33. Os membros do plenário e das câmaras especializadas do CAU não percebem remuneração pelo exercício do mandato, podendo receber ajuda de custo e diárias para participação em reuniões e eventos relacionados ao exercício do mandato.

Art. 39. Cabe recurso ao CAU/BR das decisões dos CAU/UF, na forma estabelecida no regimento interno.

VEDAÇÕES E LIMITES RELEVANTES PARA AUDITORIA:
- Recursos só podem ser usados para objetivos institucionais (Art. 32). Gastos com eventos de promoção pessoal, brindes ou patrocínios sem relação institucional são indícios de desvio.
- Diárias e ajudas de custo só para reuniões e eventos relacionados ao mandato (Art. 33). Diárias excessivas ou sem justificativa de evento são indícios de irregularidade.
- Contas devem ser auditadas anualmente (Art. 32, §2º). Falta de publicação das auditorias é indício de violação de transparência.""",
    },
    {
        "titulo": "Lei 8.429/92 — Improbidade Administrativa (LIA)",
        "tipo": "lei",
        "conteudo": """LEI 8.429/1992 — Lei de Improbidade Administrativa (LIA)

Esta lei define os atos de improbidade administrativa que o sistema detecta como indícios graves.

Art. 9º Constitui ato de improbidade administrativa importando enriquecimento ilícito auferir qualquer tipo de vantagem patrimonial indevida em razão do exercício de cargo, mandato, função, emprego ou atividade nas entidades mencionadas no art. 1º desta Lei. São atos de enriquecimento ilícito:
II – perceber vantagem econômica, direta ou indireta, para facilitar a aquisição, permuta ou locação de bem móvel ou imóvel, ou a contratação de serviços pelas entidades referidas no art. 1º por preço superior ao valor de mercado;
IV – utilizar, em obra ou serviço particular, veículos, máquinas, equipamentos ou material de qualquer natureza, de propriedade ou à disposição de qualquer das entidades mencionadas no art. 1º desta Lei, bem como o trabalho de servidores públicos, empregados ou terceiros contratados por essas entidades;
VIII – aceitar emprego, comissão ou exercer atividade de consultoria ou assessoramento para pessoa física ou jurídica que tenha interesse suscetível de ser atingido ou amparado por ação ou omissão decorrente das atribuições do agente público;

Art. 10. Constitui ato de improbidade administrativa que causa lesão ao erário qualquer ação ou omissão dolosa, que enseje perda patrimonial, desvio, apropriação, malbaratamento ou dilapidação dos bens ou haveres das entidades referidas no art. 1º desta Lei:
I – facilitar ou concorrer para a incorporação ao patrimônio particular, de pessoa física ou jurídica, de bens, rendas, verbas ou valores integrantes do acervo patrimonial das entidades mencionadas no art. 1º desta Lei;
VIII – frustrar a licitude de processo licitatório ou de processo seletivo para celebração de parcerias com entidades sem fins lucrativos, ou dispensá-los indevidamente;
X – agir negligentemente na arrecadação de tributo ou renda, bem como no que diz respeito à conservação do patrimônio público;
XI – liberar verba pública sem a estrita observância das normas pertinentes ou influir de qualquer forma para a sua aplicação irregular;

Art. 11. Constitui ato de improbidade administrativa que atenta contra os princípios da administração pública a ação ou omissão dolosa que viole os deveres de honestidade, de imparcialidade e de legalidade. São atos que atentam contra os princípios:
I – praticar ato visando fim proibido em lei ou regulamento ou diverso daquele previsto na regra de competência;
II – retardar ou deixar de praticar, indevidamente, ato de ofício;
IV – negar publicidade aos atos oficiais;
VI – revelar ou permitir que chegue ao conhecimento de terceiro, antes da respectiva divulgação oficial, teor de medida política ou econômica capaz de afetar o preço de mercadoria, bem ou serviço.

APLICAÇÃO NA AUDITORIA:
- Contratação acima do preço de mercado sem justificativa → indício de Art. 9º, II
- Dispensa irregular de licitação → indício de Art. 10, VIII
- Negativa de publicação de atas ou resultados → indício de Art. 11, IV
- Nomeação de pessoa com conflito de interesse → indício de Art. 9º, VIII
- Uso de recursos do CAU para fins pessoais de dirigentes → indício de Art. 10""",
    },
    {
        "titulo": "Resoluções CAU/BR nº 51, 91 e 194 — Normas do Conselho Federal",
        "tipo": "resolucao",
        "conteudo": """RESOLUÇÕES CAU/BR — NORMAS VINCULANTES PARA OS CAU ESTADUAIS

RESOLUÇÃO CAU/BR Nº 51/2013 — Dispõe sobre a estrutura e o funcionamento dos CAU/UF.
Pontos relevantes para auditoria:
- Os CAU/UF devem seguir o modelo de gestão estabelecido pelo CAU/BR
- Despesas com pessoal e custeio devem observar os limites fixados pelo CAU/BR
- O Presidente do CAU/UF responde solidariamente por atos de gestão praticados em desconformidade com as normas do CAU/BR
- Qualquer contratação acima de determinado valor exige licitação prévia conforme regulamento interno

RESOLUÇÃO CAU/BR Nº 91/2014 — Código de Ética e Disciplina do CAU.
Pontos relevantes:
- Conselheiros devem agir com probidade, transparência e imparcialidade no exercício do mandato
- É vedado ao conselheiro utilizar o cargo para obter vantagens pessoais ou para terceiros
- O conflito de interesse deve ser declarado e o conselheiro deve se abster da votação
- Nepotismo, favorecimento e perseguição política são violações éticas passíveis de processo disciplinar

RESOLUÇÃO CAU/BR Nº 194/2019 — Transparência e Acesso à Informação nos CAU.
Pontos relevantes:
- Os CAU devem publicar em seus sítios eletrônicos: atas de reuniões, deliberações aprovadas, contratos firmados, folha de pagamento e demonstrativos financeiros
- Informações sobre contratações devem estar disponíveis no prazo de 30 dias após a assinatura
- A omissão de informações de publicação obrigatória configura violação do princípio da publicidade
- Cidadãos têm direito de requerer acesso a documentos e o CAU tem 20 dias para responder

APLICAÇÃO NA AUDITORIA:
- Deliberações sem publicação tempestiva → indício de violação da Resolução 194
- Conselheiro que vota em matéria com conflito de interesse → indício de violação da Resolução 91
- Contratações sem processo licitatório adequado → indício de violação da Resolução 51
- Ausência de atas publicadas → indício de violação de transparência (Resolução 194)""",
    },
    {
        "titulo": "Leis de Licitação 8.666/93 e 14.133/21 — Fracionamento, Dispensa e Sobrepreço",
        "tipo": "lei",
        "conteudo": """LEIS DE LICITAÇÃO — ARTIGOS RELEVANTES PARA AUDITORIA

LEI 8.666/1993 (lei geral de licitações, ainda aplicável a contratos em andamento):

Art. 23. As modalidades de licitação previstas nesta Lei são determinadas em função dos seguintes limites:
§ 5º É vedada a utilização da modalidade "convite" ou "tomada de preços", conforme o caso, para parcelas de uma mesma obra ou serviço, ou ainda para obras e serviços da mesma natureza e no mesmo local que possam ser realizadas conjunta e concomitantemente, sempre que o somatório de seus valores caracterizar o caso de "tomada de preços" ou "concorrência", respectivamente, nos termos deste artigo, exceto para as parcelas de natureza específica que possam ser executadas por pessoas ou empresas de especialidade diversa daquela do executor da obra ou serviço.
[FRACIONAMENTO: dividir uma contratação única em várias menores para fugir da modalidade exigida é ilegal]

Art. 24. É dispensável a licitação:
I – para obras e serviços de engenharia de valor até 10% (dez por cento) do limite previsto na alínea a, do inciso I do artigo anterior;
II – para outros serviços e compras de valor até 10% (dez por cento) do limite previsto na alínea a, do inciso II do artigo anterior;
[DISPENSA INDEVIDA: usar dispensa para valores acima do limite, ou fracionando para que cada parcela fique abaixo, é ilegal]

Art. 25. É inexigível a licitação quando houver inviabilidade de competição, em especial:
I – para aquisição de materiais, equipamentos, ou gêneros que só possam ser fornecidos por produtor, empresa ou representante comercial exclusivo;
II – para a contratação de serviços técnicos enumerados no art. 13 desta Lei, de natureza singular, com profissionais ou empresas de notória especialização;
[INEXIGIBILIDADE INDEVIDA: usar inexigibilidade sem comprovar exclusividade real é indício de direcionamento]

LEI 14.133/2021 (Nova Lei de Licitações — aplicável a novos contratos):

Art. 75. É dispensável a licitação:
I – para contratação que envolva valores inferiores a R$ 100.000,00 (obras e serviços de engenharia);
II – para contratação que envolva valores inferiores a R$ 50.000,00 (outros serviços e compras);
§ 7º As contratações realizadas com fundamento neste artigo não poderão ser realizadas com um mesmo fornecedor se as contratações, no exercício financeiro anterior, forem superiores aos limites.

Art. 82. Nas contratações diretas, deverá ser observado o seguinte:
I – a justificativa do preço deverá ser feita por meio de, no mínimo, 3 (três) cotações de preços;
[SOBREPREÇO: contratação sem pesquisa de preços ou acima do valor de mercado é indício de irregularidade]

SINAIS DE ALERTA PARA O AUDITOR:
1. Múltiplas contratações do mesmo fornecedor em valores logo abaixo do limite de dispensa → indício de fracionamento
2. Dispensa ou inexigibilidade sem memorial descritivo de justificativa técnica → indício de violação
3. Contratação de "serviço técnico singular" para atividades rotineiras → indício de inexigibilidade indevida
4. Preço acima do de mercado sem justificativa de pesquisa → indício de sobrepreço ou direcionamento
5. Contrato firmado antes de empenho orçamentário → indício de irregularidade formal grave""",
    },
    {
        "titulo": "LAI — Lei 12.527/2011 (Lei de Acesso à Informação)",
        "tipo": "lei",
        "conteudo": """LEI 12.527/2011 — Lei de Acesso à Informação (LAI)

Esta lei é base para identificar quando o órgão omite informações de publicação obrigatória.

Art. 3º Os procedimentos previstos nesta Lei destinam-se a assegurar o direito fundamental de acesso à informação e devem ser executados em conformidade com os princípios básicos da administração pública:
I – observância da publicidade como preceito geral e do sigilo como exceção;
II – divulgação de informações de interesse público, independentemente de solicitações;
III – utilização de meios de comunicação viabilizados pela tecnologia da informação;
IV – fomento ao desenvolvimento da cultura de transparência na administração pública;

Art. 8º É dever dos órgãos e entidades públicas promover, independentemente de requerimentos, a divulgação em local de fácil acesso, no âmbito de suas competências, de informações de interesse coletivo ou geral por eles produzidas ou custodiadas. São de divulgação obrigatória:
I – registro das competências e estrutura organizacional, endereços e telefones das respectivas unidades e horários de atendimento ao público;
II – registros de quaisquer repasses ou transferências de recursos financeiros;
III – registros das despesas;
IV – informações concernentes a procedimentos licitatórios, inclusive os respectivos editais e resultados, bem como a todos os contratos celebrados;
V – dados gerais para o acompanhamento de programas, ações, projetos e obras de órgãos e entidades.

Art. 25. O controle do acesso e da divulgação de informações sigilosas produzidas por órgãos e entidades públicas ficará sob a responsabilidade do dirigente do órgão ou entidade tratadora, que adotará as providências necessárias para que o pessoal a ele subordinado observe as normas e procedimentos pertinentes ao assunto.

Art. 32. Constituem condutas ilícitas que ensejam responsabilidade do agente público ou militar:
I – recusar-se a fornecer informação requerida nos termos desta Lei, retardar deliberadamente o seu fornecimento ou fornecê-la intencionalmente de forma incorreta, incompleta ou imprecisa;
IV – divulgar ou permitir a divulgação ou acessar ou permitir acesso indevido à informação sigilosa ou informação pessoal;

APLICAÇÃO NA AUDITORIA:
- Ausência de atas, deliberações ou contratos no portal de transparência → indício de violação do Art. 8º
- Ementas genéricas que não permitem identificar o objeto do ato → indício de violação do princípio da publicidade (Art. 37 CF)
- Recusa ou demora em responder pedidos de informação → indício de violação do Art. 32, I
- Publicação parcial (omitindo valores, nomes de beneficiários ou justificativas) → indício de transparência deficiente
- Informações sobre contratações não disponibilizadas no prazo → indício de violação do Art. 8º, IV""",
    },
]


async def seed_leis(tenant_slug: str, dry_run: bool) -> None:
    async with AsyncSessionLocal() as db:
        # Busca o tenant pelo slug
        result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
        tenant = result.scalar_one_or_none()
        if not tenant:
            print(f"ERRO: Tenant com slug '{tenant_slug}' não encontrado.")
            print("Tenants disponíveis:")
            all_tenants = await db.execute(select(Tenant))
            for t in all_tenants.scalars().all():
                print(f"  - slug={t.slug!r}  nome={t.nome_completo!r}")
            return

        print(f"Tenant: {tenant.nome_completo} (id={tenant.id})")
        print(f"Modo: {'DRY RUN — nenhuma alteração será feita' if dry_run else 'PRODUÇÃO'}")
        print()

        inseridos = 0
        ja_existentes = 0

        for lei in LEIS:
            existing = await db.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.tenant_id == tenant.id,
                    KnowledgeBase.titulo == lei["titulo"],
                )
            )
            if existing.scalar_one_or_none():
                print(f"[SKIP] Já existe: {lei['titulo'][:70]}...")
                ja_existentes += 1
                continue

            if dry_run:
                print(f"[DRY] Inseriria: {lei['titulo'][:70]}...")
                inseridos += 1
                continue

            db.add(
                KnowledgeBase(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    tipo=lei["tipo"],
                    titulo=lei["titulo"],
                    conteudo=lei["conteudo"],
                    vigente=True,
                )
            )
            print(f"[OK] Inserido: {lei['titulo'][:70]}...")
            inseridos += 1

        if not dry_run:
            await db.commit()

        print()
        print(f"Resultado: {inseridos} inseridos, {ja_existentes} já existiam.")
        if dry_run:
            print("(dry-run — execute sem --dry-run para efetivar)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed leis na KnowledgeBase do Dig Dig")
    parser.add_argument("--tenant", default="caupr", help="Slug do tenant (padrão: caupr)")
    parser.add_argument("--dry-run", action="store_true", help="Apenas simula, não persiste")
    args = parser.parse_args()

    asyncio.run(seed_leis(args.tenant, args.dry_run))


if __name__ == "__main__":
    main()
