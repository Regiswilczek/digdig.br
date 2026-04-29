#!/usr/bin/env python3
"""
seed_leis_kb.py — Insere/atualiza base legal na KnowledgeBase do tenant CAU-PR

9 documentos legais para o Piper e Bud:
  1. Art. 37 CF/88 (LIMPE)
  2. Lei 12.378/2010 (Lei do CAU)
  3. Lei 8.429/92 (Improbidade Administrativa)
  4. Leis de Licitação 8.666/93 e 14.133/21
  5. LAI (Lei 12.527/2011)
  6. Resolução CAU/BR nº 52/2013 (Código de Ética — curada)
  7. Resolução CAU/BR nº 143/2017 (Processo Ético-Disciplinar — curada)
  8. Regimento Interno CAU-PR 2026 (curado)
  9. Lei 9.784/1999 (Processo Administrativo — curada)

Uso:
    cd backend
    python scripts/seed_leis_kb.py [--tenant caupr] [--dry-run]

Comportamento: UPSERT — atualiza o conteúdo se o título já existir, insere se não existir.
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
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session_factory
from app.models.tenant import Tenant, KnowledgeBase

# ─── Conteúdo curado das leis ────────────────────────────────────────────────
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
APLICAÇÃO PRÁTICA NA AUDITORIA DE ATOS DO CAU/PR:
- Legalidade: todo ato deve ter base legal expressa no Regimento Interno ou na Lei 12.378/2010. Atos sem fundamento legal são indício de irregularidade.
- Impessoalidade: vedado favorecimento pessoal ou perseguição política. Nomeações sem critério técnico e exonerações sem causa são indícios de violação.
- Moralidade: mesmo que formalmente legal, o ato deve ser ético. Nepotismo, clientelismo e concentração de poder nas mesmas pessoas violam a moralidade administrativa.
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
ARTIGOS SOBRE RESPONSABILIDADE TÉCNICA (RRT):
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
3. Contratação de serviço técnico singular para atividades rotineiras → indício de INEXIGIBILIDADE INDEVIDA
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
    {
        "titulo": "Resolução CAU/BR nº 52/2013 — Código de Ética e Disciplina (curada)",
        "tipo": "resolucao",
        "conteudo": """RESOLUÇÃO CAU/BR Nº 52, DE 6 DE SETEMBRO DE 2013
Aprova o Código de Ética e Disciplina do Conselho de Arquitetura e Urbanismo do Brasil (CAU/BR).

NOTA DE CURADORIA: Este documento contém as regras éticas essenciais para auditoria de conduta de conselheiros, servidores e profissionais do CAU-PR. Princípios genéricos e recomendações foram omitidos para focar nas infrações objetivas (regras).

════════════════════════════════════════════════════════════════
1. OBRIGAÇÕES GERAIS
════════════════════════════════════════════════════════════════

1.2. Regras:
1.2.1. O arquiteto e urbanista deve responsabilizar-se pelas tarefas ou trabalhos executados por seus auxiliares, equipes, ou sociedades profissionais que estiverem sob sua administração ou direção.
1.2.3. O arquiteto e urbanista deve defender sua opinião, rejeitando injunções, coerções, imposições, exigências ou pressões contrárias às suas convicções profissionais que possam comprometer os valores técnicos, éticos e a qualidade estética do seu trabalho.
1.2.4. O arquiteto e urbanista deve recusar relações de trabalho firmadas em pressupostos não condizentes com os termos deste Código.
1.2.5. O arquiteto e urbanista deve considerar-se impedido de assumir responsabilidades profissionais que extrapolem os limites de suas atribuições, habilidades e competências.

════════════════════════════════════════════════════════════════
2. OBRIGAÇÕES PARA COM O INTERESSE PÚBLICO
════════════════════════════════════════════════════════════════

2.2. Regras:
2.2.3. O arquiteto e urbanista deve, no exercício das atividades profissionais, zelar pela conservação e preservação do patrimônio público.
2.2.6. O arquiteto e urbanista deve prescindir de utilizar o saber profissional para emitir opiniões que deturpem conscientemente a verdade, persuadindo leigos, a fim de obter resultados que convenham a si ou a grupos para os quais preste serviço ou os quais represente.

════════════════════════════════════════════════════════════════
3. OBRIGAÇÕES PARA COM O CONTRATANTE
════════════════════════════════════════════════════════════════

3.2. Regras:
3.2.9. O arquiteto e urbanista deve declarar-se impedido de assumir a autoria de trabalho que não tenha realizado, bem como de representar ou ser representado por outrem de modo falso ou enganoso.
3.2.13. O arquiteto e urbanista deve manter seus contratantes informados sobre quaisquer fatos ou conflitos de interesses que possam alterar, perturbar ou impedir a prestação de seus serviços profissionais.
3.2.15. O arquiteto e urbanista deve manter sigilo sobre os negócios confidenciais de seus contratantes, a menos que tenha consentimento prévio formal do contratante ou mandado de autoridade judicial.
3.2.16. O arquiteto e urbanista deve recusar-se a receber, sob qualquer pretexto, qualquer honorário, provento, remuneração, comissão, gratificação, vantagem, retribuição ou presente de qualquer natureza oferecidos pelos fornecedores de insumos de seus contratantes.
3.2.18. O arquiteto e urbanista deve recusar-se a receber honorários, pagamentos, ou vantagens de duas partes de um mesmo contrato vigente.

════════════════════════════════════════════════════════════════
4. OBRIGAÇÕES PARA COM A PROFISSÃO
════════════════════════════════════════════════════════════════

4.2. Regras:
4.2.1. O arquiteto e urbanista deve declarar-se impedido de contratar, representar ou associar-se a pessoas que estejam sob sanção disciplinar, excluídas ou suspensas por seus respectivos conselhos profissionais.
4.2.6. O arquiteto e urbanista deve denunciar fato de seu conhecimento que transgrida a ética profissional e as obrigações deste Código.
4.2.8. O arquiteto e urbanista, quando chamado a cumprir tarefas de fiscalização, controle ou gerenciamento técnico de contratos, deve abster-se de qualquer atitude motivada por interesses privados que comprometam seus deveres profissionais, devendo sempre fundamentar claramente suas decisões e pareceres em critérios estritamente técnicos e funcionais.
4.2.9. O arquiteto e urbanista, em qualquer situação em que deva emitir parecer técnico, nomeadamente no caso de litígio, deve agir sempre com imparcialidade.

════════════════════════════════════════════════════════════════
5. OBRIGAÇÕES PARA COM OS COLEGAS
════════════════════════════════════════════════════════════════

5.2. Regras:
5.2.1. O arquiteto e urbanista deve repudiar a prática de plágio e de qualquer apropriação parcial ou integral de propriedade intelectual de outrem.
5.2.2. O arquiteto e urbanista deve declarar-se impedido de oferecer vantagens, ou de prometer facilidades, com o fim de obter contratos para prestação de serviços profissionais.
5.2.3. O arquiteto e urbanista deve declarar-se impedido de propor ou de aceitar contratos para a prestação de serviços profissionais com remunerações aviltantes ou extorsivas.
5.2.4. O arquiteto e urbanista deve declarar-se impedido de associar-se a qualquer pessoa ou empresa que utilize seu nome para o exercício ilegal da profissão.
5.2.5. O arquiteto e urbanista deve declarar-se impedido de usar de má-fé, de emitir falsas declarações, ou de tentar prejudicar a reputação, o negócio ou o trabalho de colega ou de outro profissional.
5.2.6. O arquiteto e urbanista deve declarar-se impedido de substituir colega em trabalho já iniciado, sem o seu conhecimento prévio.

════════════════════════════════════════════════════════════════
6. OBRIGAÇÕES PARA COM O CONSELHO DE ARQUITETURA E URBANISMO
════════════════════════════════════════════════════════════════

6.2. Regras:
6.2.1. O arquiteto e urbanista deve colaborar com o CAU em suas atividades de orientação, disciplina e fiscalização do exercício profissional.
6.2.3. O arquiteto e urbanista que se comprometer a assumir cargo de conselheiro do CAU deve conhecer as suas responsabilidades legais e morais.

ATENÇÃO AUDITORIAL: As regras 4.2.8 e 4.2.9 são as mais críticas para auditar a conduta de conselheiros e servidores do CAU-PR em comissões de licitação, fiscalização de contratos e comissões processantes. A regra 5.2.5 é a base para punir perseguição política interna (tentar prejudicar a reputação de colega).

════════════════════════════════════════════════════════════════
METADADOS PARA SEED DA KNOWLEDGEBASE
════════════════════════════════════════════════════════════════
tipo: resolucao_etica
titulo: Resolução CAU/BR nº 52/2013 — Código de Ética (curada)
versao: 2013-09-06
vigente_desde: 2013-09-16
url_original: https://transparencia.caubr.gov.br/resolucao52/""",
    },
    {
        "titulo": "Resolução CAU/BR nº 143/2017 — Processo Ético-Disciplinar (curada)",
        "tipo": "resolucao",
        "conteudo": """RESOLUÇÃO CAU/BR Nº 143, DE 23 DE JUNHO DE 2017
(com alterações da Resolução CAU/BR nº 224, de 23 de setembro de 2022)

Dispõe sobre as normas para condução do processo ético-disciplinar no âmbito dos Conselhos de Arquitetura e Urbanismo dos Estados e do Distrito Federal (CAU/UF) e do Conselho de Arquitetura e Urbanismo do Brasil (CAU/BR), para aplicação e execução das sanções de mesma natureza, para o pedido de revisão e para a reabilitação profissional.

NOTA DE CURADORIA: Este documento contém os artigos essenciais para auditoria de processos ético-disciplinares no CAU-PR. Artigos de menor relevância auditorial (regras de protocolo interno, reabilitação profissional e disposições transitórias) foram omitidos. Redações duplicadas foram consolidadas na versão vigente (Resolução 224/2022).

════════════════════════════════════════════════════════════════
CAPÍTULO I — DISPOSIÇÕES PRELIMINARES
════════════════════════════════════════════════════════════════

Art. 1° Esta Resolução estabelece normas para instauração, instrução e julgamento dos processos ético-disciplinares no âmbito dos CAU/UF e do CAU/BR, para aplicação e execução das sanções de mesma natureza, para o pedido de revisão e para a reabilitação profissional.

§ 1° Os procedimentos aplicam-se aos profissionais de Arquitetura e Urbanismo que cometerem infrações ético-disciplinares previstas no Código de Ética e Disciplina do CAU/BR (Resolução CAU/BR nº 52/2013), em face das quais serão aplicadas as sanções previstas no art. 19 da Lei nº 12.378/2010.

§ 1°-A As infrações aos incisos do art. 18 da Lei nº 12.378/2010 serão enquadradas conjuntamente com as regras previstas no Código de Ética e Disciplina do CAU/BR, na forma do Capítulo III do Anexo desta Resolução.

Art. 2° A condução do processo ético-disciplinar obedecerá, dentre outros, aos princípios da legalidade, finalidade, motivação, razoabilidade, proporcionalidade, moralidade, ampla defesa, contraditório, segurança jurídica, interesse público, eficiência, impulso oficial, celeridade e boa-fé.

Art. 3° As disposições processuais não retroagirão e serão aplicadas imediatamente a todos os processos em curso, respeitados os atos processuais praticados e as situações jurídicas consolidadas.

Art. 4° Nos casos omissos, serão utilizadas subsidiariamente: as normas constitucionais aplicáveis; a Lei nº 12.378/2010; a Lei nº 9.784/1999 (processo administrativo federal); as demais normas do direito administrativo; e as normas das legislações civil e penal.

Art. 4º-A Considera-se praticada a infração no momento da conduta (ação ou omissão), ainda que outro seja o momento do resultado.

Art. 4º-B A omissão será disciplinarmente relevante quando o profissional devia e podia agir para evitar o resultado. O dever de agir incumbe a quem: (I) tenha por lei ou contrato obrigação de cuidado, proteção ou vigilância; (II) assumiu a responsabilidade de impedir o resultado; (III) com seu comportamento anterior, criou o risco da ocorrência de resultado.

════════════════════════════════════════════════════════════════
CAPÍTULO II — DOS ÓRGÃOS ÉTICO-DISCIPLINARES
════════════════════════════════════════════════════════════════

Art. 5° Compete às Comissões de Ética e Disciplina dos CAU/UF (CED/UF):
I - o juízo de admissibilidade das denúncias ético-disciplinares;
II - o juízo de admissibilidade, nos procedimentos de ofício, dos fatos levados ao conhecimento dos CAU/UF;
III - a instauração, a instrução e o julgamento dos processos ético-disciplinares.

§ 1° As CED/UF poderão atuar como instância conciliadora, preliminarmente ou no curso da instrução.
§ 1°-A As CED/CAU-UF poderão firmar Termos de Ajustamento de Conduta (TAC), preliminarmente ou no curso da instrução de processos instaurados de ofício.
§ 2° Os CAU/UF deverão colocar à disposição das CED/UF agentes de apoio, inclusive técnico e jurídico.
§ 3° Inexistindo CED na estrutura organizacional do CAU/UF, a condução caberá à comissão competente em razão da matéria.
§ 4º Nos CAU/UF em que o número de conselheiros da CED/UF for igual ou superior à metade do número de conselheiros do Plenário, a competência para julgar será do próprio Plenário do CAU/UF, cabendo à CED/UF as competências para admissão, instauração, instrução e aprovação de relatório e voto fundamentado com sugestão de julgamento.

Art. 6° Compete aos Plenários dos CAU/UF o julgamento dos recursos interpostos contra as decisões da CED-CAU/UF de inadmissão de denúncias e de julgamento dos processos ético-disciplinares.

Art. 7° Compete à Comissão de Ética e Disciplina do CAU/BR (CED-CAU/BR):
I - a análise de admissibilidade e a apreciação dos recursos interpostos contra as decisões dos Plenários dos CAU/UF em matéria ético-disciplinar;
II - o julgamento dos processos ético-disciplinares instaurados originariamente no CAU/BR.

Art. 8° Ao Plenário do CAU/BR compete o julgamento dos recursos em matéria ético-disciplinar apreciados pela CED-CAU/BR.

Art. 9° São impedidos de participar de processo ético-disciplinar, em qualquer fase, os membros da CED/UF, da CED-CAU/BR e dos Plenários que:
I - tenham interesse direto ou indireto na matéria;
II - tenham participado como perito, testemunha ou representante, ou se tais situações ocorram quanto ao cônjuge, companheiro ou parente até o terceiro grau;
III - estejam litigando judicial ou administrativamente com o interessado ou respectivo cônjuge ou companheiro.

Art. 10. São suspeitos de participar de processo ético-disciplinar os membros que tenham amizade íntima ou inimizade notória com alguma das partes ou com os respectivos cônjuges, companheiros, parentes e afins até o terceiro grau.

════════════════════════════════════════════════════════════════
CAPÍTULO III — DA INSTAURAÇÃO DO PROCESSO ÉTICO-DISCIPLINAR
════════════════════════════════════════════════════════════════

Art. 11. A denúncia deverá ser apresentada por escrito e conter:
I - a qualificação do denunciante;
II - a qualificação do denunciado;
III - a descrição dos fatos que constituam infração ético-disciplinar, com indicação de data, local e demais circunstâncias relevantes;
IV - as provas documentais disponíveis, se houver;
V - a indicação de outras provas a serem produzidas, se for o caso.

Art. 12. A denúncia poderá ser apresentada:
I - pessoalmente, na sede ou em qualquer unidade de atendimento do CAU/UF competente;
II - por via postal;
III - por meio eletrônico, pelo SICCAU ou outro meio disponibilizado pelo CAU/UF.

Art. 13. A denúncia anônima não será admitida, salvo se instruída com elementos de prova suficientes para a instauração do processo ético-disciplinar.

Art. 14. O processo ético-disciplinar poderá ser instaurado de ofício pela CED/UF quando tiver conhecimento de fatos que possam constituir infração ético-disciplinar.

Art. 15. A competência para apuração das infrações ético-disciplinares é do CAU/UF em cuja área de jurisdição foi praticada a infração.

Art. 16. Quando a infração for praticada em mais de uma área de jurisdição, a competência será do CAU/UF em cuja área foi praticada a maior parte dos atos constitutivos da infração, ou, em caso de dúvida, do CAU/UF que primeiro tomar conhecimento da infração.

Art. 17. Quando a infração for praticada por conselheiro do CAU/UF no exercício do mandato, a competência para apuração será do CAU/BR.

Art. 18. Recebida a denúncia, a unidade organizacional responsável pelo recebimento de denúncias do CAU/UF deverá:
I - verificar se a denúncia preenche os requisitos do art. 11;
II - registrar a denúncia no SICCAU;
III - encaminhar a denúncia à CED/UF.

§ 1° Caso a denúncia não preencha os requisitos do art. 11, a unidade organizacional responsável deverá notificar o denunciante para que, no prazo de 10 (dez) dias, proceda à correção ou complementação necessária, sob pena de arquivamento.
§ 2° Caso os fatos denunciados versem sobre condutas supostamente violadoras do exercício profissional, a unidade responsável pelas atividades de fiscalização adotará as medidas fiscalizatórias adequadas.
§ 3° A existência simultânea de condutas supostamente violadoras das disposições de natureza ética e legal não impede o imediato envio da denúncia para CED/UF.

Art. 19. Recebida a denúncia pela CED/UF, caberá ao coordenador designar, por ordem de distribuição, um relator dentre os membros da comissão para apresentar parecer de admissibilidade e presidir a instrução processual. A designação deverá ser feita até a reunião de comissão subsequente ao recebimento.

════════════════════════════════════════════════════════════════
CAPÍTULO III — DA ADMISSIBILIDADE
════════════════════════════════════════════════════════════════

Art. 20. Caberá ao relator apresentar, na reunião da CED/UF subsequente à distribuição, parecer com proposta de acatamento ou não acatamento da denúncia.

§ 1° São critérios de admissibilidade:
I - o atendimento aos requisitos da denúncia (art. 11);
II - a competência para apuração dos fatos (arts. 15 a 17);
III - a legitimidade da parte denunciante;
IV - a legitimidade da parte denunciada;
V - o enquadramento, em tese, da conduta denunciada como infração ético-disciplinar;
VI - a verificação da ocorrência da prescrição (art. 114).

§ 1º-A Possuem legitimidade para apresentar denúncia: aquele que de qualquer forma for prejudicado; aquele que for parte ou interessado em relação contratual; e qualquer cidadão ou entidade pública, nos casos que envolvam o interesse público.
§ 1º-B Possuem legitimidade para responder a processo ético-disciplinar os arquitetos e urbanistas com registro ativo, interrompido ou suspenso no CAU que praticarem infrações no exercício da atividade profissional.
§ 2° Caso a denúncia não preencha os requisitos do art. 11, o relator determinará a intimação do denunciante para correção no prazo de 10 (dez) dias, sob pena de arquivamento liminar.
§ 3° Caso os fatos versem sobre matéria conciliável, o relator poderá propor designação de audiência de conciliação.

Art. 21. O juízo de admissibilidade deverá ser realizado pela CED/UF imediatamente após a leitura do parecer.

§ 1° A decisão consistirá no acatamento da denúncia e consequente instauração do processo, ou no não acatamento e determinação do arquivamento liminar, permanecendo em sigilo o nome do denunciado até sua manifestação.
§ 2° Caso o relator proponha arquivamento e a CED/UF decida pela instauração, o coordenador designará novo relator para presidir a instrução.

Art. 22. Não acatada a denúncia, o denunciante deverá ser intimado da decisão e dos motivos.

§ 1° Da decisão de não acatamento caberá recurso ao Plenário do CAU/UF, no prazo de 10 (dez) dias.
§ 2° Caso a CED/UF não reconsidere sua decisão após análise prévia do relator, deverá encaminhar o recurso ao Plenário do CAU/UF.
§ 3° Da decisão de não acatamento pelo Plenário do CAU/UF caberá recurso ao Plenário do CAU/BR, no prazo de 10 (dez) dias.
§ 5° A determinação de acatamento em grau de recurso implicará a redistribuição da denúncia para novo relator perante a CED/UF, não podendo recair sobre o relator original do voto de não acatamento.

Art. 23. Acatada a denúncia, as partes deverão ser intimadas da instauração do processo.

§ 1° Na intimação do denunciado deverá constar:
I - indicação clara da forma de instauração e dos fatos imputados;
II - indicação dos dispositivos supostamente infringidos e das eventuais sanções aplicáveis;
III - prazo de 30 (trinta) dias para apresentação de defesa, com documentos e rol de testemunhas (máximo 5);
IV - indicação da possibilidade de pedido de sigilo do processo.

§ 2° São direitos das partes: ser tratado com respeito; ter vista dos autos e obter cópias; formular alegações e apresentar documentos; e fazer-se assistir por advogado.
§ 3° São deveres das partes: expor os fatos conforme a verdade; proceder com lealdade e boa-fé; não agir de modo temerário; prestar as informações solicitadas.

════════════════════════════════════════════════════════════════
CAPÍTULO IV — DA INSTRUÇÃO DO PROCESSO ÉTICO-DISCIPLINAR
════════════════════════════════════════════════════════════════

Art. 24. Compete ao relator, de ofício ou a requerimento das partes, conduzir as atividades de instrução destinadas à produção das provas necessárias ao esclarecimento dos fatos.

Parágrafo único. O prazo para conclusão da instrução é de 180 (cento e oitenta) dias contados do acatamento da denúncia, prorrogável por mais 60 (sessenta) dias mediante justificativa aprovada pela CED/UF.

ATENÇÃO AUDITORIAL: O descumprimento do prazo de 180+60 dias para instrução é indício de irregularidade processual.

Art. 25. São inadmissíveis no processo ético-disciplinar as provas obtidas por meios ilícitos.

Art. 26. Cabe ao denunciante produzir as provas dos fatos alegados e ao denunciado as provas de sua defesa. Somente podem ser recusadas, mediante decisão fundamentada, as provas ilícitas, impertinentes, desnecessárias ou protelatórias.

Art. 27. Quando necessária a apresentação de provas, devem ser expedidas notificações às partes ou terceiros, com prazo mínimo de 3 (três) dias úteis de antecedência.

Art. 28. A instrução do processo ético-disciplinar compreende:
I - análise das provas documentais apresentadas na denúncia e na defesa;
II - realização de diligências;
III - oitiva de testemunhas;
IV - realização de perícias;
V - outros atos necessários ao esclarecimento dos fatos.

Art. 29. A defesa do denunciado deverá ser apresentada no prazo de 30 (trinta) dias, contados da intimação da instauração do processo, podendo ser prorrogado por igual período mediante justificativa.

Art. 30. Apresentada a defesa, o relator poderá:
I - determinar a produção de provas complementares;
II - designar audiência para oitiva de testemunhas;
III - solicitar parecer técnico ou jurídico;
IV - propor à CED/UF a realização de audiência de conciliação.

Art. 31. As testemunhas serão intimadas com antecedência mínima de 5 (cinco) dias úteis e prestarão depoimento perante o relator, podendo as partes formular perguntas por intermédio do relator.

Art. 32. O relator poderá indeferir perguntas impertinentes, capciosas ou vexatórias, devendo registrar o indeferimento em ata.

Art. 33. Concluída a instrução, o relator deverá intimar as partes para apresentação de alegações finais no prazo de 10 (dez) dias.

Art. 34. Após o recebimento das alegações finais ou transcorrido o prazo sem manifestação, o relator elaborará relatório e voto fundamentado para apreciação pela CED/UF.

════════════════════════════════════════════════════════════════
CAPÍTULO V — DO JULGAMENTO PELO CAU/UF
════════════════════════════════════════════════════════════════

Art. 35. O julgamento do processo ético-disciplinar será realizado pela CED/UF mediante apreciação do relatório e voto fundamentado elaborado pelo relator.

Art. 36. O prazo para elaboração do relatório e voto fundamentado é de até 30 (trinta) dias após o recebimento das alegações finais, prorrogável por igual período mediante justificativa aprovada pela CED/UF.

Art. 37. O relatório e voto fundamentado deverá conter:
I - relatório dos fatos;
II - análise das provas produzidas;
III - enquadramento da conduta como infração ético-disciplinar, com indicação dos dispositivos violados;
IV - proposta de sanção, com fundamentação;
V - proposta de arquivamento, se for o caso, com fundamentação.

Art. 38. O julgamento pela CED/UF deverá ser realizado em sessão, com a presença de pelo menos a maioria dos membros da comissão.

Art. 39. A decisão da CED/UF consistirá:
I - na condenação do denunciado, com a fixação da sanção aplicável; ou
II - na absolvição do denunciado, com o arquivamento do processo.

Art. 40. Da decisão da CED/UF, as partes deverão ser intimadas no prazo de 5 (cinco) dias.

Art. 41. Da decisão da CED/UF caberá recurso ao Plenário do CAU/UF, no prazo de 10 (dez) dias.

Art. 42. O Plenário do CAU/UF deverá julgar o recurso no prazo de até 60 (sessenta) dias, contados do recebimento do relatório e voto fundamentado aprovado pela CED/UF.

Art. 43. Julgado o recurso pelo Plenário do CAU/UF, as partes deverão ser intimadas da decisão no prazo de 5 (cinco) dias.

Art. 44. Da decisão do Plenário do CAU/UF caberá recurso à CED-CAU/BR, no prazo de 10 (dez) dias.

════════════════════════════════════════════════════════════════
CAPÍTULO VI — DOS RECURSOS AO CAU/BR
════════════════════════════════════════════════════════════════

Art. 50. Da decisão do Plenário do CAU/UF caberá recurso voluntário ao Plenário do CAU/BR, no prazo de 10 (dez) dias, contados da intimação da decisão.

Parágrafo único. O recurso deverá ser interposto por escrito, com as razões do pedido de reforma da decisão recorrida.

Art. 51. São critérios de admissibilidade recursal:
I - a tempestividade;
II - a legitimidade, nos termos do art. 22, parágrafo único da Lei nº 12.378/2010.

Art. 56. Recebido o processo do CAU/UF, o presidente do CAU/BR o enviará ao coordenador da CED-CAU/BR, que designará, por ordem de distribuição, um relator para elaboração de relatório e voto fundamentado, a ser apresentado até a segunda reunião de comissão subsequente.

§ 5° Havendo justo motivo, o relator poderá solicitar prorrogação do prazo.
§ 6° A CED-CAU/BR deverá apreciar o recurso na mesma reunião de apresentação do relatório e voto fundamentado pelo relator, salvo na hipótese de haver pedido de vista.
§ 7° Sempre que o relator formar entendimento que possa agravar a situação do denunciado, este deverá ser intimado para, no prazo de 10 (dez) dias, apresentar alegações, que deverão ser obrigatoriamente analisadas, adiando-se os prazos pelo tempo necessário.

Art. 57. O julgamento do recurso pelo Plenário do CAU/BR deverá ser realizado em sessão pública, sendo relatado pelo conselheiro relator da CED-CAU/BR.

§ 1° Os nomes das partes não constarão do relatório disponibilizado previamente aos conselheiros nem serão declarados durante o relato.
§ 5° As partes e seus procuradores poderão acompanhar a sessão de julgamento, com direito a sustentação oral por até 10 (dez) minutos.
§ 9° O conselheiro federal que dolosamente ocultar impedimento responderá a processo ético-disciplinar, podendo resultar a perda do mandato.

Art. 60. O Plenário do CAU/BR deverá julgar o recurso no prazo de até 60 (sessenta) dias, contados da data do recebimento do relatório e voto fundamentado aprovado pela CED-CAU/BR.

Art. 61. Julgado o recurso, a unidade do CAU/BR certificará o trânsito em julgado e restituirá o processo para o CAU/UF de origem, que deverá: (I) intimar as partes da extinção do processo, no caso de não restar aplicada sanção; (II) encaminhar o processo à unidade responsável pelos atos de execução, no caso de restar aplicada sanção.

Parágrafo único. O trânsito em julgado da decisão do Plenário do CAU/BR ocorre na data de julgamento do recurso.

════════════════════════════════════════════════════════════════
CAPÍTULO VII — DAS SANÇÕES ÉTICO-DISCIPLINARES
════════════════════════════════════════════════════════════════

Art. 62. São sanções ético-disciplinares (art. 19 da Lei nº 12.378/2010):
I - advertência (reservada ou pública);
II - suspensão entre 30 (trinta) dias e 1 (um) ano do exercício da atividade em todo o território nacional;
III - cancelamento do registro;
IV - multa no valor entre 1 (uma) a 10 (dez) anuidades.

Art. 63. A advertência reservada consiste em repreensão cuja gravidade prescinde de torná-la de conhecimento público.

Art. 64. A advertência pública consiste em repreensão cuja gravidade torna necessário seu conhecimento público.

Art. 65. A suspensão consiste em interrupção compulsória, por tempo determinado, do registro profissional, impedindo o exercício da profissão em todo o território nacional.

Art. 66. O cancelamento do registro consiste na interrupção compulsória e permanente do registro profissional. O registro cancelado poderá ser restabelecido por procedimento de reabilitação profissional (art. 117).

Art. 67. A multa consiste em punição pecuniária, podendo ser aplicada cumulativamente com as demais sanções (art. 19, § 4° da Lei nº 12.378/2010 e desta Resolução).

Art. 68. A aplicação das sanções corresponde às atividades de fixação e cálculo das sanções adequadas às infrações constatadas. As sanções somente serão executadas após o trânsito em julgado da decisão.

Art. 69. Para cada regra do Código de Ética e Disciplina do CAU/BR violada, será determinado o grau da infração entre os patamares leve, médio ou grave, segundo os critérios definidos no Capítulo I do Anexo desta Resolução.

Art. 69-A. Para cada grau da infração determinado, será estabelecido o respectivo nível de gravidade, dentre os níveis admitidos no Capítulo I do Anexo.

§ 1º Os níveis de gravidade estabelecem as sanções aplicáveis nos patamares definidos no Capítulo II do Anexo.
§ 2º O estabelecimento do nível de gravidade deverá considerar os antecedentes do denunciado e sua conduta diante das circunstâncias do contexto de cometimento da infração.
§ 3º Caso a regra violada não admita o nível de gravidade estabelecido, deverá ser considerado o nível que, dentro dos limites, mais se aproxime daquele estabelecido.

Art. 69-B. Determinados os níveis de gravidade para cada regra violada, somente o nível de gravidade mais elevado deverá ser considerado, uma única vez, para fins de fixação da sanção.

§ 1º A sanção será fixada conforme sanção principal prevista para o nível de gravidade considerado, sendo facultativa a fixação cumulativa da sanção acessória de multa.
§ 2º A eventual aplicação cumulativa de multa deverá considerar os antecedentes do denunciado e sua conduta.

Art. 70. O cálculo das sanções fixadas deverá observar:
I - caso fixada a sanção de advertência: parte-se da modalidade reservada, efetuando-se os agravamentos para modalidade pública e as atenuações para modalidade reservada;
II - caso fixada a sanção de suspensão ou multa: (a) considerar o valor mínimo previsto; (b) agravar, no caso de existirem circunstâncias agravantes, segundo as frações ou limites estabelecidos nos Capítulos IV e VI do Anexo; (c) atenuar, no caso de existirem circunstâncias atenuantes, segundo as frações ou limites estabelecidos nos Capítulos V e VI do Anexo.

Art. 71. São circunstâncias agravantes:
I - reincidência na prática de infração ético-disciplinar;
II - cometimento da infração com abuso de poder ou violação de dever inerente ao cargo ou função;
III - cometimento da infração com o fim de obter proveito pessoal ou de terceiros;
IV - cometimento da infração com dolo;
V - cometimento da infração com dano a terceiros ou ao interesse público;
VI - cometimento da infração com fraude ou simulação;
VII - cometimento da infração com abuso de confiança;
VIII - cometimento da infração com premeditação;
IX - cometimento da infração com coautoria;
X - cometimento da infração com violação de norma técnica;
XI - cometimento da infração com dano ao meio ambiente;
XII - cometimento da infração com dano ao patrimônio histórico e cultural.

Art. 72. São circunstâncias atenuantes:
I - ausência de antecedentes disciplinares;
II - confissão espontânea da infração;
III - reparação do dano antes do julgamento;
IV - cometimento da infração por motivo de relevante valor moral ou social;
V - cometimento da infração sob coação resistível;
VI - cometimento da infração em estado de necessidade;
VII - cometimento da infração por erro de fato escusável.

════════════════════════════════════════════════════════════════
CAPÍTULO VIII — DA EXECUÇÃO DAS SANÇÕES
════════════════════════════════════════════════════════════════

Art. 77. Transitada em julgado a decisão que aplicar sanção ético-disciplinar, a unidade organizacional responsável pelos atos de execução do CAU/UF deverá:
I - registrar a sanção no SICCAU;
II - intimar o sancionado para cumprimento da sanção;
III - adotar as medidas necessárias ao cumprimento da sanção.

§ 1° O registro da sanção no SICCAU deverá ser realizado no prazo de 5 (cinco) dias após o trânsito em julgado.

════════════════════════════════════════════════════════════════
CAPÍTULO IX — DA CONCILIAÇÃO E DO TERMO DE AJUSTAMENTO DE CONDUTA
════════════════════════════════════════════════════════════════

Art. 91. A CED/UF poderá designar audiência de conciliação, preliminarmente ou no curso da instrução, para os casos que envolvam matéria conciliável.

Art. 91-A. A CED/UF poderá firmar Termo de Ajustamento de Conduta (TAC) com o denunciado, preliminarmente ou no curso da instrução de processos instaurados de ofício.

§ 1° O TAC deverá conter: (I) a identificação do profissional; (II) a descrição da conduta objeto do ajustamento; (III) as obrigações assumidas pelo profissional; (IV) o prazo para cumprimento; (V) as consequências do descumprimento.
§ 2° O TAC somente poderá ser celebrado nos casos em que a conduta seja passível de adequação.
§ 3° O cumprimento do TAC implica a extinção do processo ético-disciplinar.
§ 4° O descumprimento do TAC implica o prosseguimento do processo ético-disciplinar.
§ 6° Não será admitida a celebração de novo TAC com o mesmo profissional no período de 5 (cinco) anos que se seguirem à celebração de TAC anterior.

════════════════════════════════════════════════════════════════
CAPÍTULO XI — DA FORMA E DOS PRAZOS DOS ATOS PROCESSUAIS
════════════════════════════════════════════════════════════════

Art. 94. Os atos do processo não dependem de forma determinada senão quando a lei expressamente a exigir. Os atos devem ser produzidos por escrito, com data, local e assinatura do responsável. O processo deverá ter suas páginas numeradas sequencialmente e rubricadas. À frente dos autos que tramitam em sigilo deve constar expressamente essa condição.

Art. 95. Os atos do processo devem realizar-se preferencialmente em dias úteis, no horário normal de funcionamento do CAU/UF.

Art. 96. Inexistindo disposição específica, os atos do CAU/UF e das partes devem ser praticados no prazo de 5 (cinco) dias, salvo motivo de força maior. O prazo pode ser dilatado até o dobro, mediante comprovada justificação.

Art. 98. As partes serão intimadas para: (I) ter ciência de decisões; (II) ter ciência de ato praticado pela parte contrária que dê ensejo ao contraditório e à ampla defesa; (III) praticar atos processuais sempre que necessário. As intimações deverão conter: identificação do intimado; finalidade; prazo para prática de eventual ato processual; e informação da continuidade do processo independentemente do comparecimento.

Art. 98-A. Deverão ser intimados os representantes legais e os advogados das partes, quando devidamente constituídos.

Art. 99. A intimação poderá ser efetuada por via postal com aviso de recebimento, por telegrama, por ciência pessoal no processo, por ciência escrita em audiência, por intermédio de agente do CAU/UF investido de fé pública, por meio do SICCAU, por correio eletrônico, por aplicativos de mensagens ou de outro meio que assegure a certeza da ciência. Frustrados esses meios, a intimação deverá ser efetuada por edital divulgado por 15 (quinze) dias.

Art. 100. Os prazos processuais começam a correr a partir da data: (I) do recebimento da correspondência, no caso de intimação por via postal; (II) da ciência aposta no processo, no caso de ciência pessoal; (III) do encerramento da audiência, no caso de intimação em audiência; (IV) da confirmação por meio do SICCAU; (V) do correio eletrônico de resposta com confirmação expressa; (VI) do término do período de divulgação do edital.

§ 1º Os prazos expressos em dias contam-se de modo contínuo, excluindo-se o dia do começo e incluindo-se o dia do vencimento.
§ 2º Considera-se prorrogado o prazo até o primeiro dia útil seguinte, se o vencimento cair em dia em que não houver expediente no CAU/UF ou no CAU/BR.
§ 3º Os prazos expressos em meses e anos expiram no dia de igual número do de início, ou no imediato, se faltar exata correspondência.
§ 4º Presumem-se válidas as intimações dirigidas ao endereço constante dos autos, ainda que não recebidas pessoalmente pelo interessado.

Art. 101. O desatendimento da intimação não importa o reconhecimento da verdade dos fatos, nem a renúncia a direito pela parte intimada. No prosseguimento do processo, será garantido direito de ampla defesa à parte.

ATENÇÃO AUDITORIAL: A ausência de intimação formal para defesa (Art. 98 c/c Art. 23, §1°, III) ou o início de contagem de prazo sem comprovante de recebimento (Art. 100) são nulidades insanáveis que invalidam todos os atos subsequentes.

════════════════════════════════════════════════════════════════
CAPÍTULO XII — DA NULIDADE DOS ATOS PROCESSUAIS
════════════════════════════════════════════════════════════════

Art. 102. O ato processual será declarado nulo quando resultar prejuízo para as partes.

Art. 103. O ato processual não será declarado nulo se, realizado de outro modo, alcançar a mesma finalidade e sem prejuízo para as partes.

Art. 104. Nenhuma nulidade poderá ser arguida pela parte que lhe tenha dado causa ou para a qual tenha concorrido.

Art. 105. As nulidades deverão ser arguidas pelas partes em qualquer fase do processo, antes do trânsito em julgado da decisão. As nulidades sanáveis não arguidas em tempo oportuno considerar-se-ão sanadas.

Art. 106. As nulidades insanáveis, que causam patente prejuízo para as partes, deverão ser declaradas de ofício, em qualquer tempo e grau de jurisdição, independentemente de provocação das partes.

Art. 107. Declarada a nulidade de ato processual, reputam-se nulos todos os subsequentes que dele dependam.

Art. 108. Declarada a nulidade, deverão ser declarados os atos atingidos e ordenadas as providências necessárias para que sejam repetidos ou ratificados.

ATENÇÃO AUDITORIAL: A nulidade insanável (Art. 106) pode ser declarada de ofício em qualquer grau de jurisdição. Exemplos: ausência de defesa, cerceamento de prova, impedimento não declarado.

════════════════════════════════════════════════════════════════
CAPÍTULO XIII — DO IMPEDIMENTO E DA SUSPEIÇÃO (DETALHADO)
════════════════════════════════════════════════════════════════

Art. 109. É impedido de atuar em processo ético-disciplinar o conselheiro que:
I - tenha interesse direto ou indireto na matéria;
II - tenha participado como perito, testemunha ou representante, ou se tais situações ocorram quanto ao cônjuge, companheiro ou parente e afins até o terceiro grau;
III - esteja litigando judicial ou administrativamente com qualquer das partes;
IV - seja cônjuge, companheiro ou tenha parentesco com as partes até o terceiro grau;
V - haja apresentado a denúncia;
VI - no exercício de mandato federal, tenha atuado no processo perante o CAU/UF recorrido, pronunciando-se sobre a questão.

§ 1° O conselheiro deve declarar o impedimento na primeira oportunidade, indicando expressamente o motivo.
§ 2° A omissão do dever de declarar o impedimento constitui falta grave, para efeitos disciplinares.

Art. 110. É suspeito o conselheiro que tenha amizade ou inimizade notória com qualquer das partes ou com os respectivos cônjuges, companheiros, parentes e afins até o terceiro grau.

Art. 111. As partes poderão arguir impedimento ou suspeição de conselheiro. O conselheiro poderá reconhecer o impedimento ou suspeição, ou apresentar suas razões para julgamento da arguição. A rejeição da arguição poderá ser objeto de recurso, sem efeito suspensivo.

ATENÇÃO AUDITORIAL: A participação de conselheiro impedido (Art. 109) em qualquer fase do processo é causa de nulidade insanável (Art. 106). Verificar especialmente os incisos IV (parentesco) e V (quem apresentou a denúncia atuando também como julgador).

════════════════════════════════════════════════════════════════
CAPÍTULO XIV — DA DESISTÊNCIA E DA EXTINÇÃO DO PROCESSO
════════════════════════════════════════════════════════════════

Art. 112. O denunciante poderá, mediante manifestação escrita, desistir de prosseguir com o processo.

§ 2° A desistência do denunciante, não sendo o caso de questão conciliável, não prejudica o prosseguimento do processo ético-disciplinar, se o CAU/UF ou o CAU/BR considerar que o interesse público assim o exige.

Art. 113. A extinção do processo ético-disciplinar ocorrerá:
I - quando exaurida sua finalidade;
II - quando faltar qualquer dos requisitos para acatamento da denúncia;
III - quando for declarada a prescrição;
IV - quando o objeto da decisão se tornar impossível, inútil ou prejudicado por fato superveniente;
V - quando falecer o denunciado.

Art. 115. Todo processo ético-disciplinar paralisado há mais de 3 (três) anos pendente de despacho ou julgamento será declarado extinto e arquivado mediante requerimento da parte interessada ou de ofício.

Art. 116. A autoridade que retardar ou deixar de praticar ato de ofício que leve à extinção do processo responderá a processo administrativo pelo seu ato ou omissão. Se a autoridade for profissional registrado no CAU, estará sujeita a processo ético-disciplinar.

ATENÇÃO AUDITORIAL: O Art. 115 é crítico — processo parado há mais de 3 anos deve ser extinto de ofício. A omissão em fazê-lo (Art. 116) é ela própria uma infração disciplinar.

════════════════════════════════════════════════════════════════
CAPÍTULO XV — DA PRESCRIÇÃO
════════════════════════════════════════════════════════════════

Art. 114. Prescreve em 5 (cinco) anos a pretensão punitiva do CAU/UF ou do CAU/BR, contados da data em que a infração ético-disciplinar foi praticada.

§ 1° A prescrição é interrompida:
I - pela instauração do processo ético-disciplinar;
II - pela decisão de primeira instância;
III - pela decisão de segunda instância.
§ 2° Interrompida a prescrição, o prazo recomeça a correr por inteiro.
§ 3° A prescrição não corre durante o período em que o processo ético-disciplinar estiver suspenso por decisão judicial.

ATENÇÃO AUDITORIAL: A prescrição de 5 anos é contada da data da infração, não da denúncia. Processos instaurados após esse prazo sem causa interruptiva são nulos.

════════════════════════════════════════════════════════════════
ANEXO — CRITÉRIOS PARA APLICAÇÃO DE SANÇÕES (RESUMO)
════════════════════════════════════════════════════════════════

GRAU DA INFRAÇÃO | CRITÉRIOS | NÍVEIS DE GRAVIDADE ADMITIDOS
LEVE | Baixa reprovabilidade; danos materiais reversíveis em pouco tempo | 1 ou 2
MÉDIO | Conduta reprovável; danos morais ou materiais reversíveis com recursos consideráveis | 3 ou 4
GRAVE | Conduta muito reprovável; danos físicos ou materiais irreversíveis ou de alto custo | 5 ou 6

NÍVEL DE GRAVIDADE | SANÇÃO PRINCIPAL | SANÇÃO ACESSÓRIA (FACULTATIVA)
1 | Advertência reservada | —
2 | Advertência reservada ou pública | Multa 1 a 2 anuidades
3 | Advertência pública | Multa 2 a 3 anuidades
4 | Suspensão 30 a 180 dias | Multa 3 a 5 anuidades
5 | Suspensão 180 dias a 1 ano | Multa 5 a 8 anuidades
6 | Cancelamento do registro | Multa 8 a 10 anuidades

════════════════════════════════════════════════════════════════
METADADOS PARA SEED DA KNOWLEDGEBASE
════════════════════════════════════════════════════════════════
tipo: resolucao_disciplinar
titulo: Resolução CAU/BR nº 143/2017 — Processo Ético-Disciplinar (curada)
versao: 2022-09-23 (última alteração pela Resolução 224/2022)
vigente_desde: 2017-06-23
url_original: https://transparencia.caubr.gov.br/resolucao143/""",
    },
    {
        "titulo": "Regimento Interno CAU-PR — Deliberação 09/2026 (curado)",
        "tipo": "regimento",
        "conteudo": """REGIMENTO INTERNO DO CONSELHO DE ARQUITETURA E URBANISMO DO PARANÁ – CAU/PR
(Aprovado pela Deliberação Plenária nº 09/2026, de 13 de março de 2026)

NOTA DE CURADORIA: Este documento contém os artigos essenciais para auditoria de atos administrativos, financeiros e disciplinares do CAU-PR. Artigos de menor relevância auditorial (estrutura de comissões temporárias, câmaras temáticas, ritos eleitorais internos e organização de reuniões) foram omitidos para otimização de contexto.

════════════════════════════════════════════════════════════════
CAPÍTULO III — DO PLENÁRIO DO CAU/PR
════════════════════════════════════════════════════════════════

Art. 34. Compete ao Plenário do CAU/PR:
(...)
X - apreciar e deliberar sobre o Regimento Interno do CAU/PR e suas alterações;
XI - apreciar e deliberar sobre a aquisição, oneração ou alienação de bens imóveis;
XII - apreciar e deliberar sobre a prestação de contas anual do CAU/PR;
XIII - apreciar e deliberar sobre o relatório de gestão anual do CAU/PR;
XIV - apreciar e deliberar sobre o plano de ação e orçamento do CAU/PR e suas reformulações;
XV - apreciar e deliberar sobre a criação de cargos e funções, fixação de salários e gratificações;
XVI - apreciar e deliberar sobre a realização de concursos públicos e processos seletivos;
XVII - apreciar e deliberar sobre a contratação de auditoria independente;
XVIII - apreciar e deliberar sobre a celebração de convênios, acordos e contratos que envolvam repasse de recursos financeiros;
(...)
XXV - julgar, em grau de recurso, os processos ético-disciplinares e de fiscalização;
(...)
XLIII - apreciar e deliberar sobre atos administrativos de competência do presidente do CAU/PR;
XLIV - apreciar e deliberar sobre matérias aprovadas ad referendum pelo presidente, na reunião plenária subsequente à publicação dos atos;
(...)
LIII - apreciar e deliberar sobre a assinatura de convênios com entidades públicas;
LIV - apreciar e deliberar sobre a assinatura de parcerias em regime de mútua cooperação com organizações da sociedade civil (termos de colaboração, fomento e acordos de cooperação);
(...)
LXIV - apreciar e deliberar sobre julgamento, em primeira instância, de processos de infração ético-disciplinares;
LXV - apreciar e deliberar sobre julgamento, em segunda instância, de processos de fiscalização do exercício profissional;
LXVI - apreciar e deliberar sobre planos de cargos e salários, e suas alterações, bem como sobre remunerações e índices de atualização do CAU/PR.

Art. 35. O Plenário do CAU/PR manifesta-se sobre assuntos de sua competência mediante ato administrativo da espécie deliberação plenária, que será publicada no sítio eletrônico da autarquia.
Parágrafo único. Serão tomadas por maioria simples as manifestações do Plenário, ressalvados os seguintes casos:
I - Pela maioria absoluta de seus membros, nas matérias de que tratam os incisos XI (bens imóveis) e XXV (julgamento de recursos) do Art. 34;
II - Pela maioria de 3/5 (três quintos) de seus membros, nas matérias de que tratam os incisos XXXVI, XXXIX e XLI do Art. 34.

ATENÇÃO AUDITORIAL: O Art. 34 define o limite de alçada do Presidente. Atos financeiros de grande vulto (imóveis, convênios com repasse, criação de cargos, planos de salários) exigem aprovação prévia do Plenário. Atos "ad referendum" (Art. 34, XLIV) devem obrigatoriamente ser pautados na reunião plenária imediatamente subsequente.

════════════════════════════════════════════════════════════════
CAPÍTULO VIII — DO PRESIDENTE E DO VICE-PRESIDENTE
════════════════════════════════════════════════════════════════

Art. 214. Compete ao presidente do CAU/PR:
(...)
XXXI - resolver casos de urgência ad referendum do Plenário e do Conselho Diretor;
XXXII - assinar proposta da Presidência e deliberações plenárias e do Conselho Diretor;
(...)
XXXVI - propor ao Plenário a abertura de créditos e transferência de recursos orçamentários, ouvida a comissão que exerce as competências de planejamento e finanças;
(...)
XLIII - assinar convênios, termos de colaboração, termos de fomento, acordos de cooperação, memorandos de entendimento e contratos celebrados pelo CAU/PR;
(...)
LIII - designar, dentre empregados públicos efetivos do CAU/PR, ou não, pessoas para exercerem empregos de livre provimento e demissão, em funções de confiança ou cargos em comissão, relacionados à direção, chefia, assessoramento;
(...)
LVII - representar o CAU/PR, em juízo ou fora dele, diretamente ou por meio de mandatário com poderes específicos;
LVIII - determinar a cobrança administrativa ou judicial dos créditos devidos ao CAU/PR;
LIX - autorizar o pagamento das despesas orçamentárias ou emergenciais aprovadas pelo Plenário;
LX - movimentar contas bancárias, assinar cheques, ordens de pagamento bancário e emitir recibos, juntamente com o gerente geral, e, no impedimento deste, com o gerente que possua atribuições financeiras;
LXI - delegar, nos limites definidos em ato normativo do Plenário, ao gerente geral, e, no impedimento deste, ao gerente que possua atribuições financeiras ou administrativas, a movimentação de contas bancárias, as assinaturas de contratos, convênios, cheques, balanços e outros documentos correspondentes.

Art. 215. O presidente manifesta-se sobre assuntos de sua competência mediante atos administrativos das espécies despacho, instrução, circular, ato declaratório, portaria e proposta, a serem publicados no sítio eletrônico do CAU/PR.
§ 2º As portarias emitidas pela Presidência serão publicadas no sítio eletrônico do CAU/PR até o primeiro dia útil após as datas das suas assinaturas.

ATENÇÃO AUDITORIAL: O Art. 214, LIII permite a nomeação de não-concursados apenas para cargos em comissão de "direção, chefia e assessoramento" (regra constitucional). O Art. 214, LX exige assinatura conjunta (Presidente + Gerente Geral) para movimentação bancária. O Art. 215, §2º exige publicação de portarias no dia útil seguinte (transparência ativa).

════════════════════════════════════════════════════════════════
CAPÍTULO IX — DO CONSELHO DIRETOR
════════════════════════════════════════════════════════════════

Art. 218. Compete ao Conselho Diretor:
(...)
VI - apreciar e deliberar sobre a contratação de serviços e aquisição de bens, nos limites de sua alçada;
VII - apreciar e deliberar sobre a alienação de bens móveis inservíveis;
VIII - apreciar e deliberar sobre a concessão de diárias, passagens e jetons;
(...)
XVI - propor e deliberar sobre convênios, termos de colaboração, termos de fomento, acordos de cooperação e memorandos de entendimento.

ATENÇÃO AUDITORIAL: O Conselho Diretor atua como instância intermediária entre o Presidente e o Plenário para aprovação de despesas correntes, licitações e convênios.

════════════════════════════════════════════════════════════════
METADADOS PARA SEED DA KNOWLEDGEBASE
════════════════════════════════════════════════════════════════
tipo: regimento
titulo: Regimento Interno do CAU/PR (curado)
versao: 2026-03-13 (Deliberação 09/2026)
vigente_desde: 2026-03-13
url_original: https://www.caupr.gov.br/wp-content/uploads/2026/03/Deliberacao-Ad-Referendum-09.2026-v.02-Com-Regimento.pdf""",
    },
    {
        "titulo": "Lei Federal nº 9.784/1999 — Processo Administrativo (curada)",
        "tipo": "lei",
        "conteudo": """LEI Nº 9.784, DE 29 DE JANEIRO DE 1999
Regula o processo administrativo no âmbito da Administração Pública Federal.

NOTA DE CURADORIA: Esta lei aplica-se subsidiariamente ao CAU-PR (autarquia federal). Foram extraídos apenas os artigos essenciais para auditoria de atos administrativos, focando em princípios, impedimentos, prazos, motivação obrigatória e recursos.

════════════════════════════════════════════════════════════════
CAPÍTULO I — DAS DISPOSIÇÕES GERAIS
════════════════════════════════════════════════════════════════

Art. 2º A Administração Pública obedecerá, dentre outros, aos princípios da legalidade, finalidade, motivação, razoabilidade, proporcionalidade, moralidade, ampla defesa, contraditório, segurança jurídica, interesse público e eficiência.
Parágrafo único. Nos processos administrativos serão observados, entre outros, os critérios de:
I - atuação conforme a lei e o Direito;
II - atendimento a fins de interesse geral, vedada a renúncia total ou parcial de poderes ou competências, salvo autorização em lei;
III - objetividade no atendimento do interesse público, vedada a promoção pessoal de agentes ou autoridades;
IV - atuação segundo padrões éticos de probidade, decoro e boa-fé;
V - divulgação oficial dos atos administrativos, ressalvadas as hipóteses de sigilo previstas na Constituição;
VI - adequação entre meios e fins, vedada a imposição de obrigações, restrições e sanções em medida superior àquelas estritamente necessárias ao atendimento do interesse público;
VII - indicação dos pressupostos de fato e de direito que determinarem a decisão;
VIII – observância das formalidades essenciais à garantia dos direitos dos administrados;
X - garantia dos direitos à comunicação, à apresentação de alegações finais, à produção de provas e à interposição de recursos, nos processos de que possam resultar sanções e nas situações de litígio;
XIII - interpretação da norma administrativa da forma que melhor garanta o atendimento do fim público a que se dirige, vedada aplicação retroativa de nova interpretação.

════════════════════════════════════════════════════════════════
CAPÍTULO VI — DOS IMPEDIMENTOS E DA SUSPEIÇÃO
════════════════════════════════════════════════════════════════

Art. 18. É impedido de atuar em processo administrativo o servidor ou autoridade que:
I - tenha interesse direto ou indireto na matéria;
II - tenha participado ou venha a participar como perito, testemunha ou representante, ou se tais situações ocorrem quanto ao cônjuge, companheiro ou parente e afins até o terceiro grau;
III - esteja litigando judicial ou administrativamente com o interessado ou respectivo cônjuge ou companheiro.

Art. 19. A autoridade ou servidor que incorrer em impedimento deve comunicar o fato à autoridade competente, abstendo-se de atuar.
Parágrafo único. A omissão do dever de comunicar o impedimento constitui falta grave, para efeitos disciplinares.

Art. 20. Pode ser argüida a suspeição de autoridade ou servidor que tenha amizade íntima ou inimizade notória com algum dos interessados ou com os respectivos cônjuges, companheiros, parentes e afins até o terceiro grau.

════════════════════════════════════════════════════════════════
CAPÍTULO VIII — DA FORMA, TEMPO E LUGAR DOS ATOS DO PROCESSO
════════════════════════════════════════════════════════════════

Art. 22. Os atos do processo administrativo não dependem de forma determinada senão quando a lei expressamente a exigir.
§ 1º Os atos do processo devem ser produzidos por escrito, em vernáculo, com a data e o local de sua realização e a assinatura da autoridade responsável.

Art. 24. Inexistindo disposição específica, os atos do órgão ou autoridade responsável pelo processo e dos administrados que nele intervenham devem ser praticados no prazo de cinco dias, salvo motivo de força maior.
Parágrafo único. O prazo previsto neste artigo pode ser dilatado até o dobro, mediante comprovada justificação.

════════════════════════════════════════════════════════════════
CAPÍTULO XII — DA MOTIVAÇÃO
════════════════════════════════════════════════════════════════

Art. 50. Os atos administrativos deverão ser motivados, com indicação dos fatos e dos fundamentos jurídicos, quando:
I - neguem, limitem ou afetem direitos ou interesses;
II - imponham ou agravem deveres, encargos ou sanções;
III - decidam processos administrativos de concurso ou seleção pública;
IV - dispensem ou declarem a inexigibilidade de processo licitatório;
V - decidam recursos administrativos;
VI - decorram de reexame de ofício;
VII - deixem de aplicar jurisprudência firmada sobre a questão ou discrepem de pareceres, laudos, propostas e relatórios oficiais;
VIII - importem anulação, revogação, suspensão ou convalidação de ato administrativo.
§ 1º A motivação deve ser explícita, clara e congruente, podendo consistir em declaração de concordância com fundamentos de anteriores pareceres, informações, decisões ou propostas, que, neste caso, serão parte integrante do ato.

════════════════════════════════════════════════════════════════
CAPÍTULO XIV — DA ANULAÇÃO, REVOGAÇÃO E CONVALIDAÇÃO
════════════════════════════════════════════════════════════════

Art. 53. A Administração deve anular seus próprios atos, quando eivados de vício de legalidade, e pode revogá-los por motivo de conveniência ou oportunidade, respeitados os direitos adquiridos.

Art. 54. O direito da Administração de anular os atos administrativos de que decorram efeitos favoráveis para os destinatários decai em cinco anos, contados da data em que foram praticados, salvo comprovada má-fé.

════════════════════════════════════════════════════════════════
CAPÍTULO XV — DO RECURSO ADMINISTRATIVO E DA REVISÃO
════════════════════════════════════════════════════════════════

Art. 56. Das decisões administrativas cabe recurso, em face de razões de legalidade e de mérito.
§ 1º O recurso será dirigido à autoridade que proferiu a decisão, a qual, se não a reconsiderar no prazo de cinco dias, o encaminhará à autoridade superior.

Art. 59. Salvo disposição legal específica, é de dez dias o prazo para interposição de recurso administrativo, contado a partir da ciência ou divulgação oficial da decisão recorrida.
§ 1º Quando a lei não fixar prazo diferente, o recurso administrativo deverá ser decidido no prazo máximo de trinta dias, a partir do recebimento dos autos pelo órgão competente.
§ 2º O prazo mencionado no parágrafo anterior poderá ser prorrogado por igual período, ante justificativa explícita.

Art. 61. Salvo disposição legal em contrário, o recurso não tem efeito suspensivo.
Parágrafo único. Havendo justo receio de prejuízo de difícil ou incerta reparação decorrente da execução, a autoridade recorrida ou a imediatamente superior poderá, de ofício ou a pedido, dar efeito suspensivo ao recurso.

Art. 64. O órgão competente para decidir o recurso poderá confirmar, modificar, anular ou revogar, total ou parcialmente, a decisão recorrida, se a matéria for de sua competência.
Parágrafo único. Se da aplicação do disposto neste artigo puder decorrer gravame à situação do recorrente, este deverá ser cientificado para que formule suas alegações antes da decisão.

Art. 65. Os processos administrativos de que resultem sanções poderão ser revistos, a qualquer tempo, a pedido ou de ofício, quando surgirem fatos novos ou circunstâncias relevantes suscetíveis de justificar a inadequação da sanção aplicada.
Parágrafo único. Da revisão do processo não poderá resultar agravamento da sanção.

════════════════════════════════════════════════════════════════
CAPÍTULO XVI — DOS PRAZOS
════════════════════════════════════════════════════════════════

Art. 66. Os prazos começam a correr a partir da data da cientificação oficial, excluindo-se da contagem o dia do começo e incluindo-se o do vencimento.
§ 1º Considera-se prorrogado o prazo até o primeiro dia útil seguinte se o vencimento cair em dia em que não houver expediente ou este for encerrado antes da hora normal.
§ 2º Os prazos expressos em dias contam-se de modo contínuo.

ATENÇÃO AUDITORIAL: A Lei 9.784 é a "lei mãe" do processo administrativo. O Art. 50 (motivação obrigatória) é o mais violado em atos arbitrários. O Art. 18 (impedimento) é a base para auditar conflito de interesses em comissões. O Art. 54 estabelece a decadência de 5 anos para anular atos favoráveis.

════════════════════════════════════════════════════════════════
METADADOS PARA SEED DA KNOWLEDGEBASE
════════════════════════════════════════════════════════════════
tipo: lei_federal
titulo: Lei Federal nº 9.784/1999 — Processo Administrativo (curada)
versao: 1999-01-29
vigente_desde: 1999-01-30
url_original: https://www.planalto.gov.br/ccivil_03/leis/l9784.htm""",
    },

]

# ─── Títulos antigos que foram SUBSTITUÍDOS pelos novos documentos curados ────
# Esses registros serão DELETADOS do banco se existirem, para evitar duplicidade.
TITULOS_OBSOLETOS = [
    "Resolução CAU/BR nº 51/2013 — Áreas de Atuação Privativas dos Arquitetos e Urbanistas",
    "Resolução CAU/BR nº 91/2014 — RRT (Registro de Responsabilidade Técnica)",
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

        # ── 1. Remover documentos obsoletos ──────────────────────────────────
        removidos = 0
        for titulo_obs in TITULOS_OBSOLETOS:
            existing = await db.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.tenant_id == tenant.id,
                    KnowledgeBase.titulo == titulo_obs,
                )
            )
            row = existing.scalar_one_or_none()
            if row:
                if dry_run:
                    print(f"[DRY] Removeria obsoleto: {titulo_obs[:80]}...")
                else:
                    await db.delete(row)
                    print(f"[DEL] Removido obsoleto: {titulo_obs[:80]}...")
                removidos += 1
            else:
                print(f"[OK] Obsoleto já ausente: {titulo_obs[:80]}...")

        # ── 2. Upsert dos documentos atuais ──────────────────────────────────
        inseridos = 0
        atualizados = 0
        for lei in LEIS:
            existing = await db.execute(
                select(KnowledgeBase).where(
                    KnowledgeBase.tenant_id == tenant.id,
                    KnowledgeBase.titulo == lei["titulo"],
                )
            )
            row = existing.scalar_one_or_none()
            if row:
                if row.conteudo != lei["conteudo"]:
                    if dry_run:
                        print(f"[DRY] Atualizaria: {lei['titulo'][:80]}...")
                    else:
                        row.tipo = lei["tipo"]
                        row.conteudo = lei["conteudo"]
                        print(f"[UPD] Atualizado: {lei['titulo'][:80]}...")
                    atualizados += 1
                else:
                    print(f"[OK] Sem mudança: {lei['titulo'][:80]}...")
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
            print(f"[INS] Inserido: {lei['titulo'][:80]}...")
            inseridos += 1

        if not dry_run:
            await db.commit()

        print()
        print(f"Resultado: {inseridos} inseridos, {atualizados} atualizados, {removidos} obsoletos removidos.")
        if dry_run:
            print("(dry-run — execute sem --dry-run para efetivar)")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed/upsert leis na KnowledgeBase do Dig Dig")
    parser.add_argument("--tenant", default="caupr", help="Slug do tenant (padrão: caupr)")
    parser.add_argument("--dry-run", action="store_true", help="Apenas simula, não persiste")
    args = parser.parse_args()
    asyncio.run(seed_leis(args.tenant, args.dry_run))


if __name__ == "__main__":
    main()
