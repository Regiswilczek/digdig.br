"""
Importa URLs encontradas pelo Manus para deliberações pendentes.
Faz preview por padrão; use --salvar para efetivar.
"""
import asyncio
import asyncpg
import os
import sys
from dotenv import load_dotenv

load_dotenv()
DB_URL = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
TENANT_ID = "f32ed0e7-c95d-4dec-a332-fa2cf6f20eb4"

# Mapeamento: numero_exato_no_db -> url
# Grupo 2 - DPOPR com número incompleto no DB (formato "XXXX-")
GRUPO2 = {
    "0080-": "https://www.caupr.gov.br/wp-content/uploads/2019/02/DPOPR-0080-03.2018-Indefere-solicita%C3%A7%C3%A3o-de-apoio-institucional.pdf",
    "0081-": "https://www.caupr.gov.br/wp-content/uploads/2019/05/DPOPR-0081-02.2018-Cria-cargos-de-livre-provimento-em-rela%C3%A7%C3%A3o-a-cargos-em-comiss%C3%A3o-do-DAS.pdf",
    "0083-": "https://www.caupr.gov.br/wp-content/uploads/2019/02/DPOPR-0083-03.2018-Processo-de-fiscaliza%C3%A7%C3%A3o.pdf",
    "0084-": "https://www.caupr.gov.br/wp-content/uploads/2020/08/DPOPR-0084-01.2018-Cria-a-Comiss%C3%A3o-de-Reforma-da-Casa-Miguel-Alves-Pereira.pdf",
    "0088-": "https://www.caupr.gov.br/wp-content/uploads/2019/02/DPOPR-0088-01.2018-SESCPR-Baixa-tens%C3%A3o.pdf",
    "0090-": "https://www.caupr.gov.br/wp-content/uploads/2019/02/DPOPR-0090-01.2018-Plano-de-A%C3%A7%C3%A3o-e-Or%C3%A7amento.pdf",
    "0091-": "https://www.caupr.gov.br/wp-content/uploads/2019/02/DPOPR-0091-01.2019.pdf",
    "0092-": "https://www.caupr.gov.br/wp-content/uploads/2019/04/DPOPR-0092-01.2019-Altera-forma%C3%A7%C3%A3o-CPUA.pdf",
    "0094-": "https://www.caupr.gov.br/wp-content/uploads/2019/09/DPOPR-0094-01.2019-Autoriza-a-contrata%C3%A7%C3%A3o-de-assessoria-jur%C3%ADdica.pdf",
    "0096-": "https://www.caupr.gov.br/wp-content/uploads/2019/07/DPOPR-0096-01.2019-N%C3%A3o-aprova%C3%A7%C3%A3o-da-delibera%C3%A7%C3%A3o-ad-referendum-02.2019-Organograma.pdf",
}

# Grupo 3 - com ano (matches claros)
GRUPO3_OK = {
    "16.2023": "https://www.caupr.gov.br/wp-content/uploads/2025/01/DPOPR-176-16.2024_-_Manutencao_do_Auto_de_Infracao_-_PC_1690777.2023_assinado.pdf",
    "022/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-134-04.2021-Aprova-a-Deliberacao-CEP-no-022.2021-Informacoes-ao-CAUBR-assinado.pdf",
    "024/2022": "https://www.caupr.gov.br/wp-content/uploads/2023/03/DPOPR-151-07.2023-Aprova-Deliberacao-024.2022-COA-Atualizacao-da-Deliberacao-de-Diarias-e-Jetons.pdf",
    "025/2015": "https://www.caupr.gov.br/wp-content/uploads/2017/09/Deliberac%CC%A7a%CC%83o-025-15-Edital-de-patroci%CC%81nio.pdf",
    "25/2021": "https://www.caupr.gov.br/wp-content/uploads/2021/06/DPOPR-130-01.2021-Aprova-a-Deliberacao-no-025.2021-CEP-CAU.PR_.pdf",
    "028/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-138-11.2021-Aprova-a-Deliberacao-no-28.2021-Interrupcao-de-Registro-Protocolo-1270353.2021-assinado.pdf",
    "029/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-136-04.2021-Aprova-a-Deliberacao-no-029.2021-CPFi-Edital-de-TFG-assinado.pdf",
    "031/2022": "https://www.caupr.gov.br/wp-content/uploads/2022/12/DPOPR-148-03.2022-Aprova-a-Deliberacao-no-031.2022-da-CPFi.pdf",
    "033/2022": "https://www.caupr.gov.br/wp-content/uploads/2023/01/DPOPR-149-04.2022-Aprova-a-Deliberacao-no-033-da-CPFi.pdf",
    "036/2021": "https://www.caupr.gov.br/wp-content/uploads/2021/08/DPOPR-133-07.2021-Aprova-a-Deliberacao-CEP-no-036.2021-assinado.pdf",
    "037/2023": "https://www.caupr.gov.br/wp-content/uploads/2025/08/DPOPR_184-13_-_Aprova_criacao_de_CTSI_ACAO_CIVIL_PUBLICA_N._0000089-37.2023.5.09.0003_assinado.pdf",
    "038/2021": "https://www.caupr.gov.br/wp-content/uploads/2021/08/DPOPR-133-08.2021-Aprova-a-Deliberacao-CEP-no-038.2021-assinado.pdf",
    "039/2021": "https://www.caupr.gov.br/wp-content/uploads/2021/08/DPOPR-133-09.2021-Aprova-a-Deliberacao-CEP-no-039.2021-assinado.pdf",
    "040/2021": "https://www.caupr.gov.br/wp-content/uploads/2021/08/DPOPR-133-10.2021-Aprova-a-Deliberacao-CEP-no-040.2021-assinado.pdf",
    "044/2021": "https://www.caupr.gov.br/wp-content/uploads/2021/08/DPOPR-133-14.2021-Aprova-a-Deliberacao-CEP-no-044.2021-assinado.pdf",
    "046/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-134-02.2021-Aprova-a-Deliberacao-CEP-no-046.2021-Interrupcao-de-Registro-assinado.pdf",
    "067/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-135-05.2021-Aprova-Deliberacao-CEP-no-067.2021-%E2%80%93-Protocolo-1345946.2021-assinado.pdf",
    "068/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-135-06.2021-Aprova-Deliberacao-CEP-no-068.2021-%E2%80%93-Protocolo-1206007.2020-assinado.pdf",
    "087/2022": "https://www.caupr.gov.br/wp-content/uploads/2022/10/DPOPR-146-14.2022-Aprova-a-Deliberacao-no-087.3033-CEP-Protocolo-no-1580499.2022-assinado.pdf",
    "90/2022": "https://www.caupr.gov.br/wp-content/uploads/2022/05/Ad-Referendum-01.2022-Projeto-de-Lei-no-90.2022-assinado.pdf",
    "101/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-137-05.2021-Aprova-a-Deliberacao-no-101.2021-CEP-CAUPR-Protocolo-1415464.2021-assinado.pdf",
    "102/2020": "https://www.caupr.gov.br/wp-content/uploads/2020/01/DPOPR-0102-02.2019-Processo-%C3%89tico-Disicplinar.pdf",
    "103/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-137-03.2021-Aprova-Deliberacao-n%C2%B0-103.2021-CEP-CAUPR-%E2%80%93-Protocolo-1410216.2021-assinado.pdf",
    "104/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/05/DPOPR-139-06.2021-Aprova-a-Deliberacao-no-104.2021-CEP-Pc-1433305.2021-assinado.pdf",
    "104/2023": "https://www.caupr.gov.br/wp-content/uploads/2023/12/DPOPR-162-05.2023-Aprova-Deliberacao-CEP-no-104.2023.pdf",
    "125/2023": "https://www.caupr.gov.br/wp-content/uploads/2023/12/DPOPR-162-07.2023-Aprova-Deliberacao-CEP-no-125.2023.pdf",
    "132/2021": "https://www.caupr.gov.br/wp-content/uploads/2021/08/DPOPR-132-01.2021-Aprova-Criacao-Comissao-Temporaria-Parlamentar-assinado.pdf",
    "133/2021": "https://www.caupr.gov.br/wp-content/uploads/2021/08/DPOPR-133-01.2021-Renovacao-Comissao-Temporaria-das-Sedes-1.pdf",
    "134/2021": "https://www.caupr.gov.br/wp-content/uploads/2021/09/DPOPR-134-01.2021-Aprova-a-Reprogramacao-Orcamentaria.pdf",
    "135/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-135-01.2021-Aprova-o-Ingresso-de-Acao-Contra-a-Seguradora-de-Londrina-assinado.pdf",
    "138/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-138-01.2021-Aprova-o-arquivamento-de-processo-etico-Protocolo-no-735459.2018-assinado.pdf",
    "139/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/05/DPOPR-139-01.2021-Homologa-a-Composicao-das-Comissoes-Ordinarias-assinado.pdf",
    "140/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/05/DPOPR-140-01.2022-Aprova-Contas-Dezembro.2021-assinado.pdf",
    "141/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/06/DPOPR-141-01.2022-Aprova-Contas-de-Janeiro-2021.pdf",
    "145/2021": "https://www.caupr.gov.br/wp-content/uploads/2022/04/DPOPR-138-14.2021-Aprova-a-Deliberacao-CEP-no-145.2021-assinado.pdf",
    "161/2023": "https://www.caupr.gov.br/wp-content/uploads/2023/12/DPOPR-161-01.2023-Aprova-o-Planejamento-Orcamentario-de-2024.pdf",
    "169/2023": "https://www.caupr.gov.br/wp-content/uploads/2024/07/DPEPR-169-10.2024-Aprovar-o-encaminhamento-das-Deliberacao-no-16.23-02.24-04.24-e-05.2024-ao-CAUBR_assinado.pdf",
    "178-14/2025": "https://www.caupr.gov.br/wp-content/uploads/2025/03/DPOPR-178-14-V2-Coordenador-Adjunto-para-Comissao-Temporaria-de-Analise-de-Processo-Etico-1.pdf",
    "184-13/2025": "https://www.caupr.gov.br/wp-content/uploads/2025/08/DPOPR_184-13_-_Aprova_criacao_de_CTSI_ACAO_CIVIL_PUBLICA_N._0000089-37.2023.5.09.0003_assinado.pdf",
    "184-14/2025": "https://www.caupr.gov.br/wp-content/uploads/2025/08/DPOPR_184-14_-_Aprova_criacao_de_CTSI_DANOS_DIARIAS_PARA_PARTICIPACAO_DO_FESTIVAL_DE_INVERNO_assinado.pdf",
    "254/2020": "https://www.caupr.gov.br/wp-content/uploads/2021/06/DPOPR-128-01.2021-Aprova-a-Deliberacao-no-254-CEP-CAU.PR_.pdf",
    # 022/2023 stored as 22/2023 in DB
    "22/2023": "https://www.caupr.gov.br/wp-content/uploads/2023/12/DPOPR-162-09.2023-Aprova-Deliberacao-no-22.2023-CPUA.pdf",
}

# Matches duvidosos - excluídos por ora (Manus errou o PDF):
#   "15/2023" -> PDF é de 2017, deliberação 023-15 (=15/2015), não 15/2023
#   "022/2022" -> PDF é DPOPR 2025 sobre CTSI, sem relação com 022/2022
#   "028/2022" -> mesmo PDF da 028/2021 (DPOPR fala em "no 28.2021")
#   "029/2022" -> mesmo PDF da 029/2021

ALL_UPDATES = {**GRUPO2, **GRUPO3_OK}


async def main():
    salvar = "--salvar" in sys.argv
    conn = await asyncpg.connect(DB_URL, statement_cache_size=0)

    # Verificar quais números realmente existem no DB e estão pendentes
    pendentes = await conn.fetch(
        "SELECT id, numero FROM atos WHERE tenant_id=$1 AND tipo='deliberacao' AND url_pdf IS NULL",
        TENANT_ID,
    )
    pendentes_dict = {r["numero"]: str(r["id"]) for r in pendentes}

    matches = []
    nao_encontrados = []

    for numero, pdf_url in ALL_UPDATES.items():
        if numero in pendentes_dict:
            matches.append((pendentes_dict[numero], numero, pdf_url))
        else:
            nao_encontrados.append(numero)

    print(f"\n{'='*60}")
    print(f"  IMPORTAÇÃO URLS MANUS")
    print(f"  Matches encontrados: {len(matches)}")
    print(f"  Não encontrados no DB: {len(nao_encontrados)}")
    print(f"  Modo: {'SALVAR' if salvar else 'PREVIEW (use --salvar para efetivar)'}")
    print(f"{'='*60}\n")

    print("MATCHES:")
    for ato_id, numero, url in matches:
        filename = url.split("/")[-1][:60]
        print(f"  {numero:20s} -> {filename}")

    if nao_encontrados:
        print(f"\nNÃO ENCONTRADOS NO DB (já resolvidos ou número diferente):")
        for n in nao_encontrados:
            print(f"  {n}")

    if salvar and matches:
        print(f"\nSalvando {len(matches)} URLs...")
        for ato_id, numero, url in matches:
            await conn.execute("UPDATE atos SET url_pdf=$1 WHERE id=$2", url, ato_id)
            print(f"  OK {numero}")
        print(f"\nOK {len(matches)} URLs salvas!")
        print("   Rode agora: python scripts/scrape_deliberacoes_local.py --fase 1")
    elif not salvar:
        print(f"\nRode com --salvar para efetivar.")

    await conn.close()


asyncio.run(main())
