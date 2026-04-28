#!/usr/bin/env python3
"""
seed_leis_kb.py — Insere base legal na KnowledgeBase do tenant CAU-PR

Adiciona 7 documentos legais para que o Piper e o Bud tenham conhecimento
jurídico embutido no system prompt:
  - Art. 37 CF/88 (LIMPE)
  - Lei 12.378/2010 (Lei do CAU)
  - Lei 8.429/92 (Improbidade Administrativa)
  - Resolução CAU/BR nº 51/2013 (Áreas de atuação dos arquitetos)
  - Resolução CAU/BR nº 91/2014 (RRT — Registro de Responsabilidade Técnica)
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

from app.database import async_session_factory
from app.models.tenant import Tenant, KnowledgeBase


# ─── Conteúdo curado das leis ────────────────────────────────────────────────
# Excerpts extraídos dos textos oficiais (Planalto.gov.br e CAU/BR).
# Foco nos artigos relevantes para auditoria de atos administrativos do CAU/PR.
# ─────────────────────────────────────────────────────────────────────────────

LEIS = [
    {
        "titulo": "Art. 37 CF/88 — Princípios LIMPE (Legalidade, Impessoalidade, Moralidade, Publicidade e Eficiência)",
        "tipo": "lei",
        "conteudo": """CONSTITUIÇÃO FEDERAL — Art. 37 (Administração Pública — Princípios LIMPE)
Fonte: https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm

Art. 37. A administração pública direta e indireta de qualquer dos Poderes da União, dos Estados, do Distrito Federal e dos Municípios obedecerá aos princípios de legalidade, impessoalidade, moralidade, publicidade e eficiência e, também, ao seguinte:

I – os cargos, empregos e funções públicas são acessíveis aos brasileiros que preencham os requisitos estabelecidos em lei, assim como aos estrangeiros, na forma da lei;
II – a investidura em cargo ou emprego público depende de aprovação prévia em concurso público de provas ou de provas e títulos, de acordo com a natureza e a complexidade do cargo ou emprego, na forma prevista em lei, ressalvadas as nomeações para cargo em comissão declarado em lei de livre nomeação e exoneração;
V – as funções de confiança, exercidas exclusivamente por servidores ocupantes de cargo efetivo, e os cargos em comissão, a serem preenchidos por servidores de carreira nos casos, condições e percentuais mínimos previstos em lei, destinam-se apenas às atribuições de direção, chefia e assessoramento;

§ 1º A publicidade dos atos, programas, obras, serviços e campanhas dos órgãos públicos deverá ter caráter educativo, informativo ou de orientação social, dela não podendo constar nomes, símbolos ou imagens que caracterizem promoção pessoal de autoridades ou servidores públicos.

§ 4º Os atos de improbidade administrativa importarão a suspensão dos direitos políticos, a perda da função pública, a indisponibilidade dos bens e o ressarcimento ao erário, na forma e gradação previstas em lei, sem prejuízo da ação penal cabível.

§ 5º A lei estabelecerá os prazos de prescrição para ilícitos praticados por qualquer agente, servidor ou não, que causem prejuízos ao erário, ressalvadas as respectivas ações de ressarcimento.

§ 6º As pessoas jurídicas de direito público e as de direito privado prestadoras de serviços públicos responderão pelos danos que seus agentes, nessa qualidade, causarem a terceiros, assegurado o direito de regresso contra o responsável nos casos de dolo ou culpa.

§ 11. Não serão computadas, para efeito dos limites remuneratórios de que trata o inciso XI do caput deste artigo, as parcelas de caráter indenizatório previstas em lei.

APLICAÇÃO PRÁTICA NA AUDITORIA DE ATOS DO CAU/PR:
- Legalidade: todo ato deve ter base legal expressa no Regimento Interno ou na Lei 12.378/2010. Atos sem fundamento legal são indício de irregularidade.
- Impessoalidade: vedado favorecimento pessoal ou perseguição política. Nomeações sem critério técnico e exonerações sem causa são indícios de violação.
- Moralidade: mesmo que "formalmente legal", o ato deve ser ético. Nepotismo, clientelismo e concentração de poder nas mesmas pessoas violam a moralidade administrativa mesmo sem violar regra formal específica.
- Publicidade: atos sem publicação adequada, ementas genéricas que ocultam o real objeto ou beneficiários não identificados são indícios de violação.
- Eficiência: criação de comissões sem resultado documentado, gastos sem contrapartida institucional e concentração de contratações em fornecedores únicos violam a eficiência.""",
    },
    {
        "titulo": "Lei 12.378/2010 — Regulamenta o exercício da Arquitetura e Urbanismo (Lei de criação do CAU)",
        "tipo": "lei",
        "conteudo": """LEI 12.378/2010 — Lei de criação do Conselho de Arquitetura e Urbanismo (CAU)
Fonte: https://www.planalto.gov.br/ccivil_03/_ato2007-2010/2010/lei/l12378.htm

Art. 1º Esta Lei regulamenta o exercício da profissão de arquiteto e urbanista, dispõe sobre a criação e o funcionamento do Conselho de Arquitetura e Urbanismo do Brasil (CAU/BR) e dos Conselhos de Arquitetura e Urbanismo dos Estados e do Distrito Federal (CAU/UF), e dá outras providências.

Art. 26. Compete ao CAU/BR e aos CAU/UF, no âmbito de suas respectivas atribuições:
I – orientar, disciplinar e fiscalizar o exercício da profissão de arquiteto e urbanista;
II – zelar pelo prestígio e bom nome da profissão;
III – defender os interesses e os direitos dos profissionais da área;
IV – elaborar e aprovar os respectivos regimentos internos;
V – aplicar as sanções disciplinares previstas nesta Lei.

Art. 33. Os membros do plenário e das câmaras especializadas do CAU não percebem remuneração pelo exercício do mandato, podendo receber ajuda de custo e diárias para participação em reuniões e eventos relacionados ao exercício do mandato, nos termos do regimento interno.

Art. 35. Compete ao presidente do CAU, entre outras questões que lhe forem atribuídas pelo Regimento:
I – representar judicialmente e extrajudicialmente o CAU;
II – presidir as reuniões do Conselho do CAU, podendo exercer o voto de desempate.

Art. 36. É de 3 (três) anos o mandato dos conselheiros do CAU/BR e dos CAUs, sendo permitida apenas uma recondução.

Art. 37. Constituem recursos dos Conselhos Regionais de Arquitetura e Urbanismo – CAUs:
I – receitas com anuidades, contribuições, multas, taxas e tarifas de serviços;
II – doações, legados, juros e rendimentos patrimoniais;
III – subvenções.

Art. 38. Os presidentes do CAU/BR e dos CAUs prestarão, anualmente, suas contas ao Tribunal de Contas da União.
§ 1º Após aprovação pelo respectivo Plenário, as contas dos CAUs serão submetidas ao CAU/BR para homologação.

ARTIGOS SOBRE RESPONSABILIDADE TÉCNICA (RRT — vide também Resolução 91/2014):
Art. 45. A execução de obras ou serviços técnicos que envolvam competências privativas de arquitetos e urbanistas somente poderá ser realizada por profissional habilitado e com o RRT devidamente efetuado.
Art. 46. O RRT identifica, para todos os efeitos legais, o responsável técnico pela execução de obras ou serviços.
Art. 50. O RRT é obrigatório e deverá ser efetuado antes do início da atividade técnica.

VEDAÇÕES RELEVANTES PARA AUDITORIA:
- Diárias e ajudas de custo só são cabíveis para reuniões e eventos relacionados ao mandato (Art. 33). Diárias excessivas, sem comprovação de evento ou fora do período de mandato são indícios de irregularidade.
- Contas devem ser prestadas anualmente ao TCU e homologadas pelo CAU/BR (Art. 38). Ausência de publicação das auditorias ou contas não aprovadas são indícios de gestão irregular.
- Recursos do CAU provêm de anuidades profissionais e devem ser aplicados exclusivamente em objetivos institucionais. Gastos com brindes, patrocínios sem relação institucional ou benefícios pessoais a dirigentes são indícios de desvio.""",
    },
    {
        "titulo": "Lei 8.429/92 — Improbidade Administrativa (LIA) — Art. 9, 10 e 11",
        "tipo": "lei",
        "conteudo": """LEI 8.429/1992 — Lei de Improbidade Administrativa (LIA)
Fonte: https://www.planalto.gov.br/ccivil_03/leis/l8429.htm

Esta lei define os atos de improbidade administrativa que o sistema detecta como indícios graves em atos do CAU/PR.

Art. 9º Constitui ato de improbidade administrativa importando enriquecimento ilícito auferir qualquer tipo de vantagem patrimonial indevida em razão do exercício de cargo, mandato, função, emprego ou atividade nas entidades mencionadas no art. 1º desta Lei, e notadamente:
I – receber, para si ou para outrem, dinheiro, bem móvel ou imóvel, ou qualquer outra vantagem econômica, direta ou indireta, a título de comissão, percentagem, gratificação ou presente de quem tenha interesse, direto ou indireto, que possa ser atingido ou amparado por ação ou omissão decorrente das atribuições do agente público;
II – perceber vantagem econômica, direta ou indireta, para facilitar a aquisição, permuta ou locação de bem móvel ou imóvel, ou a contratação de serviços por preço superior ao valor de mercado;
IV – utilizar, em obra ou serviço particular, veículos, máquinas, equipamentos ou material de qualquer natureza, de propriedade ou à disposição do órgão, bem como o trabalho de servidores públicos, empregados ou terceiros contratados;
VIII – aceitar emprego, comissão ou exercer atividade de consultoria ou assessoramento para pessoa física ou jurídica que tenha interesse suscetível de ser atingido ou amparado por ação ou omissão decorrente das atribuições do agente público;

Art. 10. Constitui ato de improbidade administrativa que causa lesão ao erário qualquer ação ou omissão dolosa, que enseje perda patrimonial, desvio, apropriação, malbaratamento ou dilapidação dos bens ou haveres das entidades referidas no art. 1º desta Lei, e notadamente:
I – facilitar ou concorrer para a incorporação ao patrimônio particular, de pessoa física ou jurídica, de bens, rendas, verbas ou valores integrantes do acervo patrimonial das entidades mencionadas;
VIII – frustrar a licitude de processo licitatório ou dispensá-lo indevidamente;
X – agir negligentemente na arrecadação de tributo ou renda, bem como no que diz respeito à conservação do patrimônio público;
XI – liberar verba pública sem a estrita observância das normas pertinentes ou influir de qualquer forma para a sua aplicação irregular;

Art. 11. Constitui ato de improbidade administrativa que atenta contra os princípios da administração pública a ação ou omissão dolosa que viole os deveres de honestidade, de imparcialidade e de legalidade. São atos que atentam contra os princípios:
I – praticar ato visando fim proibido em lei ou regulamento ou diverso daquele previsto na regra de competência;
II – retardar ou deixar de praticar, indevidamente, ato de ofício;
IV – negar publicidade aos atos oficiais;
VI – revelar ou permitir que chegue ao conhecimento de terceiro, antes da respectiva divulgação oficial, teor de medida política ou econômica capaz de afetar o mercado.

APLICAÇÃO NA AUDITORIA DO CAU/PR:
- Contratação acima do preço de mercado sem justificativa → indício de Art. 9º, II
- Dispensa irregular de licitação → indício de Art. 10, VIII
- Negativa de publicação de atas ou resultados de processos disciplinares → indício de Art. 11, IV
- Nomeação de pessoa com conflito de interesse (ex: familiar de dirigente) → indício de Art. 9º, VIII
- Uso de recursos do CAU para fins pessoais de dirigentes → indício de Art. 10, I""",
    },
    {
        "titulo": "Resolução CAU/BR nº 51/2013 — Áreas de Atuação Privativas dos Arquitetos e Urbanistas",
        "tipo": "resolucao",
        "conteudo": """RESOLUÇÃO CAU/BR Nº 51, DE 12 DE JULHO DE 2013
Dispõe sobre as áreas de atuação privativas dos arquitetos e urbanistas e as áreas de atuação compartilhadas com outras profissões regulamentadas.
Fonte: https://caubr.gov.br/wp-content/uploads/2015/06/Resolucao51_CAUBR_06_2015_WEB.pdf

Art. 1º Os arquitetos e urbanistas constituem categoria uniprofissional, de formação generalista, cujas atividades, atribuições e campos de atuação encontram-se discriminados no art. 2º da Lei nº 12.378, de 31 de dezembro de 2010.

Art. 2º São áreas de atuação PRIVATIVAS dos arquitetos e urbanistas (somente eles podem executar):
I – DA ARQUITETURA E URBANISMO:
a) projeto arquitetônico de edificação ou de reforma de edificação;
b) projeto arquitetônico de monumento;
c) coordenação e compatibilização de projeto arquitetônico com projetos complementares;
d) relatórios técnicos de arquitetura (memorial descritivo, caderno de especificações);
e) desempenho de cargo ou função técnica concernente à elaboração ou análise de projeto arquitetônico;
f) ensino de teoria e projeto de arquitetura em cursos de graduação;
g) coordenação de curso de graduação em Arquitetura e Urbanismo;
h) projeto urbanístico;
i) projeto urbanístico para fins de regularização fundiária.

Art. 3º São áreas de atuação COMPARTILHADAS entre arquitetos e urbanistas e outros profissionais legalmente habilitados:
I – elaboração de laudos técnicos, perícias, avaliações e arbitragens referentes à construção civil;
II – planejamento físico-territorial e projetos de infraestrutura;
III – gestão e administração de obras e serviços de engenharia.

Art. 8º É vedada a assunção de responsabilidade técnica por atividade que extrapole as áreas de atuação do profissional, conforme a graduação e o registro no CAU.

RELEVÂNCIA PARA AUDITORIA DO CAU/PR:
Esta resolução é base para detectar:
- Contratação de profissional não habilitado para serviços privativos de arquitetos (ex: engenheiro realizando projeto arquitetônico sem colaboração de arquiteto)
- Assunção de RRT por profissional em área fora de sua especialização
- Pagamento a profissional por serviço fora de sua área de atuação legal
- Verificar se fiscalizações do CAU/PR sobre exercício ilegal da profissão são efetivamente realizadas ou se há omissão sistemática""",
    },
    {
        "titulo": "Resolução CAU/BR nº 91/2014 — RRT (Registro de Responsabilidade Técnica)",
        "tipo": "resolucao",
        "conteudo": """RESOLUÇÃO CAU/BR Nº 91, DE 9 DE OUTUBRO DE 2014
Dispõe sobre o Registro de Responsabilidade Técnica (RRT) referente a projetos, obras e demais serviços técnicos no âmbito da Arquitetura e Urbanismo.
Fonte: https://transparencia.caubr.gov.br/arquivos/resolucao91.pdf

Art. 1º A elaboração de projetos, a execução de obras e a realização de quaisquer outros serviços técnicos no âmbito da Arquitetura e Urbanismo ficam sujeitas ao Registro de Responsabilidade Técnica (RRT) nos termos desta Resolução, em conformidade com a Lei nº 12.378, de 31 de dezembro de 2010.

Art. 2º O RRT deverá ser efetuado:
I – previamente ao início da atividade técnica, quando se tratar das atividades do grupo Execução;
II – antes ou durante o período de realização da atividade técnica, para projetos e demais serviços;
III – em até 30 dias do início da atividade para as demais hipóteses.
Parágrafo único: Em situação de emergência oficialmente decretada, o RRT pode ser efetuado em até 90 dias após cessada a emergência.

Art. 3º O RRT identifica, para todos os efeitos legais, o responsável pela realização de atividade técnica no âmbito da Arquitetura e Urbanismo.

Art. 4º O RRT será efetuado segundo os seguintes tipos:
I – RRT Individual: efetuado por um único arquiteto e urbanista responsável pela atividade;
II – RRT Múltiplo: quando mais de um profissional é responsável por atividades distintas na mesma obra ou serviço;
III – RRT Múltiplo Mensal: para atividades de caráter continuado, como fiscalização ou gestão de obras.

Art. 5º Em conformidade com o art. 47 da Lei nº 12.378, de 2010, as providências relativas ao RRT são de responsabilidade do arquiteto e urbanista que executa a atividade técnica.

Art. 22. O valor do RRT é fixado pelo CAU/UF, conforme tabela aprovada pelo CAU/BR.

Art. 25. O RRT somente poderá ser cancelado mediante requerimento do profissional responsável e desde que a atividade técnica não tenha sido iniciada.

RELEVÂNCIA PARA AUDITORIA DO CAU/PR:
O RRT é a principal fonte de receita do CAU/PR (junto com as anuidades). Irregularidades envolvendo RRT incluem:
- Cobrança irregular de valores de RRT acima ou fora da tabela aprovada pelo CAU/BR
- Cancelamento indevido de RRTs sem o pedido formal do profissional
- Falhas sistemáticas na fiscalização de obras sem RRT (omissão na arrecadação de multas)
- Isenções ou reduções de RRT concedidas sem base regulamentar (favorecimento)
- Concentração de poder de gestão do SICCAU (sistema de RRT) em poucos servidores não eleitos
- RRTs registrados por profissionais suspensos ou com irregularidades no CAU (falha de fiscalização)""",
    },
    {
        "titulo": "Leis de Licitação 8.666/93 e 14.133/21 — Fracionamento, Dispensa e Sobrepreço",
        "tipo": "lei",
        "conteudo": """LEIS DE LICITAÇÃO — ARTIGOS SOBRE FRACIONAMENTO, DISPENSA E SOBREPREÇO
Fontes: Lei 8.666/93 (https://www.planalto.gov.br/ccivil_03/leis/l8666cons.htm)
        Lei 14.133/21 (https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/l14133.htm)

─── LEI 8.666/1993 (lei geral de licitações — aplicável a contratos em andamento) ───

Art. 23. As modalidades de licitação são determinadas em função dos valores estimados da contratação.
§ 5º É VEDADA a utilização de modalidade menos rigorosa para parcelas de uma mesma obra ou serviço, ou para obras e serviços da mesma natureza e no mesmo local que possam ser realizadas conjunta e concomitantemente, sempre que o somatório dos valores caracterizar modalidade mais exigente.
[ALERTA FRACIONAMENTO: dividir uma contratação única em várias menores para fugir da modalidade licitatória exigida é ILEGAL]

Art. 24. É DISPENSÁVEL a licitação:
I – para obras e serviços de engenharia de valor até 10% do limite para convite;
II – para outros serviços e compras de valor até 10% do limite para convite;
[ALERTA: usar dispensa para valores acima do limite, ou fracionando para que cada parcela fique abaixo do limite, é ILEGAL]
IV – nos casos de emergência ou de calamidade pública, quando a urgência não permitir a realização de licitação (prazo máximo de 180 dias, vedada prorrogação);
XIII – na contratação de instituição brasileira incumbida regimental ou estatutariamente da pesquisa, do ensino ou do desenvolvimento institucional;
XXI – para a aquisição de bens destinados exclusivamente à pesquisa científica e tecnológica com recursos de financiamento concedidos por agências de fomento.

Art. 25. É INEXIGÍVEL a licitação quando houver inviabilidade de competição, em especial:
I – para aquisição de materiais, equipamentos ou serviços que só possam ser fornecidos por produtor, empresa ou representante exclusivo;
II – para a contratação de serviços técnicos de natureza singular, com profissionais ou empresas de notória especialização;
[ALERTA: usar inexigibilidade sem comprovar exclusividade real ou singularidade técnica é indício de direcionamento de contrato]

─── LEI 14.133/2021 (Nova Lei de Licitações — aplicável a novos contratos) ───

Art. 75. É dispensável a licitação:
I – para contratações que envolvam valores inferiores a R$ 100.000,00 (obras e serviços de engenharia);
II – para contratações que envolvam valores inferiores a R$ 50.000,00 (outros serviços e compras);
§ 7º As contratações com dispensa não podem ser realizadas com o mesmo fornecedor se, no exercício financeiro, o total ultrapassar os limites do caput.

Art. 82. Nas contratações diretas, deverá ser observado:
I – justificativa do preço por meio de, no mínimo, 3 cotações de preços;
[ALERTA SOBREPREÇO: contratação sem pesquisa de preços ou acima do valor de mercado é indício de irregularidade]

SINAIS DE ALERTA PARA O AUDITOR DO CAU/PR:
1. Múltiplas contratações do mesmo fornecedor em valores logo abaixo do limite de dispensa → indício de FRACIONAMENTO
2. Dispensa ou inexigibilidade sem memorial técnico de justificativa → indício de DISPENSA INDEVIDA
3. Contratação de "serviço técnico singular" para atividades rotineiras (limpeza, manutenção, TI básica) → indício de INEXIGIBILIDADE INDEVIDA
4. Preço acima do praticado no mercado sem justificativa de pesquisa → indício de SOBREPREÇO ou direcionamento
5. Contrato firmado antes de empenho orçamentário ou sem dotação identificada → indício de IRREGULARIDADE FORMAL GRAVE
6. Mesmo fornecedor recebendo contratos sucessivos em anos consecutivos sem nova licitação → indício de favorecimento""",
    },
    {
        "titulo": "LAI — Lei 12.527/2011 (Lei de Acesso à Informação) — Art. 3, 8 e 32",
        "tipo": "lei",
        "conteudo": """LEI 12.527/2011 — Lei de Acesso à Informação (LAI)
Fonte: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2011/lei/l12527.htm

Esta lei é base para identificar quando o CAU/PR omite informações de publicação obrigatória.

Art. 3º Os procedimentos previstos nesta Lei destinam-se a assegurar o direito fundamental de acesso à informação e devem ser executados em conformidade com os princípios básicos da administração pública:
I – observância da publicidade como preceito geral e do sigilo como exceção;
II – divulgação de informações de interesse público, independentemente de solicitações;
III – utilização de meios de comunicação viabilizados pela tecnologia da informação;
IV – fomento ao desenvolvimento da cultura de transparência na administração pública;
V – desenvolvimento do controle social da administração pública.

Art. 8º É dever dos órgãos e entidades públicas promover, independentemente de requerimentos, a divulgação em local de fácil acesso, no âmbito de suas competências, de informações de interesse coletivo ou geral. São de divulgação OBRIGATÓRIA:
§ 1º Na divulgação das informações a que se refere o caput, deverão constar, no mínimo:
I – registro das competências e estrutura organizacional, endereços e telefones das respectivas unidades e horários de atendimento ao público;
II – registros de quaisquer repasses ou transferências de recursos financeiros;
III – registros das despesas;
IV – informações concernentes a procedimentos licitatórios, inclusive os respectivos editais e resultados, bem como a todos os contratos celebrados;
V – dados gerais para o acompanhamento de programas, ações, projetos e obras de órgãos e entidades;
VI – respostas a perguntas mais frequentes da sociedade.
§ 2º Para cumprimento do disposto no caput, os órgãos e entidades públicas deverão utilizar todos os meios e instrumentos legítimos de que dispuserem, sendo obrigatória a divulgação em sítios oficiais da rede mundial de computadores (internet).

Art. 25. O controle do acesso e da divulgação de informações sigilosas produzidas por órgãos e entidades públicas ficará sob a responsabilidade do dirigente do órgão ou entidade.

Art. 32. Constituem condutas ilícitas que ensejam responsabilidade do agente público:
I – recusar-se a fornecer informação requerida nos termos desta Lei, retardar deliberadamente o seu fornecimento ou fornecê-la intencionalmente de forma incorreta, incompleta ou imprecisa;
IV – divulgar ou permitir a divulgação ou acessar ou permitir acesso indevido à informação sigilosa ou informação pessoal.

APLICAÇÃO NA AUDITORIA DO CAU/PR:
- Ausência de atas de reuniões plenárias, deliberações ou contratos no portal → indício de violação do Art. 8º, §1º, I e IV
- Ementas genéricas que não permitem identificar o objeto do ato ou o beneficiário → indício de violação do princípio da publicidade (Art. 37 CF combinado com Art. 3º LAI)
- Processos disciplinares mantidos em sigilo por tempo excessivo sem base legal → indício de violação dos Arts. 3º e 25
- Informações sobre salários, diárias e contratos ausentes ou incompletas → indício de violação do Art. 8º, §1º, II e III
- Demora superior a 20 dias para resposta a pedidos de informação → indício de violação do Art. 32, I""",
    },
]


async def seed_leis(tenant_slug: str, dry_run: bool) -> None:
    async with async_session_factory() as db:
        result = await db.execute(select(Tenant).where(Tenant.slug == tenant_slug))
        tenant = result.scalar_one_or_none()
        if not tenant:
            print(f"ERRO: Tenant com slug '{tenant_slug}' não encontrado.")
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
                print(f"[SKIP] Já existe: {lei['titulo'][:80]}...")
                ja_existentes += 1
                continue

            if dry_run:
                print(f"[DRY] Inseriria: {lei['titulo'][:80]}...")
                inseridos += 1
                continue

            db.add(
                KnowledgeBase(
                    id=uuid.uuid4(),
                    tenant_id=tenant.id,
                    tipo=lei["tipo"],
                    titulo=lei["titulo"],
                    conteudo=lei["conteudo"],
                )
            )
            print(f"[OK] Inserido: {lei['titulo'][:80]}...")
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
