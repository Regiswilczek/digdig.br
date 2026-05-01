import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/whitepaper-11-cem-mil-documentos")({
  head: () => ({
    meta: [
      { title: "Cem Mil Documentos e Uma Pergunta — Dig Dig" },
      {
        name: "description",
        content:
          "White Paper Nº 11: o sprint que era pra fechar abriu o próximo. CAU/PR entregue como MVP, 99 mil documentos do governo do Paraná no primeiro dia, OCR de atas escaneadas pré-2018, e a pergunta que tira meu sono.",
      },
      { property: "og:title", content: "Cem Mil Documentos e Uma Pergunta — Dig Dig" },
      {
        property: "og:description",
        content:
          "Começamos com 500 portarias. Hoje são quase 100 mil documentos. O CAU/PR foi entregue como MVP, o GOV/PR rodou no primeiro dia e trouxe convênios, licitações, viagens, remuneração — e nem é o começo. Sprint entregue. Pergunta aberta.",
      },
      { property: "og:type", content: "article" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@600;700&display=swap",
      },
    ],
  }),
  component: Whitepaper11Page,
});

const STYLES = `
  .wp11 { --text:#111111; --muted:#666666; --subtle:#999999; --border:#e5e5e5; --bg:#ffffff; --bg-code:#f5f5f5; --bg-warn:#fffbf0; --border-warn:#f0d060; --max-w:680px;
    font-family:'Inter',system-ui,-apple-system,sans-serif; background:var(--bg); color:var(--text); line-height:1.75; padding:0 24px; font-size:17px; min-height:100vh;
  }
  .wp11 *, .wp11 *::before, .wp11 *::after { box-sizing:border-box; }
  .wp11 .site-header { max-width:var(--max-w); margin:0 auto; padding:40px 0 48px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid var(--border); }
  .wp11 .wordmark { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1rem; letter-spacing:-0.02em; color:var(--text); text-decoration:none; }
  .wp11 .label { font-size:0.75rem; color:var(--subtle); letter-spacing:0.08em; text-transform:uppercase; }
  .wp11 article { max-width:var(--max-w); margin:0 auto; padding:56px 0 80px; }
  .wp11 .post-header { margin-bottom:48px; }
  .wp11 .post-label { display:inline-block; font-size:0.72rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--subtle); margin-bottom:20px; }
  .wp11 h1 { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:2.1rem; line-height:1.2; letter-spacing:-0.03em; margin-bottom:20px; }
  .wp11 .byline { font-size:0.88rem; color:var(--muted); }
  .wp11 .byline strong { font-weight:600; color:var(--text); }
  .wp11 hr { border:none; border-top:1px solid var(--border); margin:44px 0; }
  .wp11 h2 { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:1.35rem; letter-spacing:-0.02em; margin:44px 0 16px; }
  .wp11 h3 { font-family:'Inter Tight',sans-serif; font-weight:600; font-size:1.05rem; letter-spacing:-0.01em; margin:28px 0 10px; }
  .wp11 p { margin-bottom:1.1em; }
  .wp11 ul, .wp11 ol { margin:0 0 1.1em 1.5em; }
  .wp11 li { margin-bottom:0.4em; }
  .wp11 strong { font-weight:600; }
  .wp11 code { font-family:'SF Mono','Fira Code',monospace; font-size:0.82em; background:var(--bg-code); padding:1px 5px; border-radius:3px; }
  .wp11 .callout { background:var(--bg-warn); border-left:3px solid var(--border-warn); padding:16px 20px; margin:24px 0; font-size:0.93rem; line-height:1.6; }
  .wp11 .callout.info { background:#f5f9ff; border-left-color:#3366cc; }
  .wp11 .callout.success { background:#f0faf4; border-left-color:#2d7d46; }
  .wp11 .callout a { color:inherit; }
  .wp11 .stat-row { display:flex; gap:32px; margin:28px 0; flex-wrap:wrap; }
  .wp11 .stat { display:flex; flex-direction:column; }
  .wp11 .stat .num { font-family:'Inter Tight',sans-serif; font-weight:700; font-size:2rem; letter-spacing:-0.03em; }
  .wp11 .stat .desc { font-size:0.78rem; color:var(--muted); letter-spacing:0.02em; }
  .wp11 .breakdown-table { width:100%; border-collapse:collapse; margin:18px 0; font-size:0.92rem; }
  .wp11 .breakdown-table th, .wp11 .breakdown-table td { padding:8px 10px; border-bottom:1px solid var(--border); text-align:left; }
  .wp11 .breakdown-table th { font-family:'Inter Tight',sans-serif; font-weight:600; font-size:0.78rem; letter-spacing:0.04em; text-transform:uppercase; color:var(--muted); }
  .wp11 .breakdown-table td.num { font-family:'SF Mono','Fira Code',monospace; text-align:right; tabular-nums:true; }
  .wp11 .prev-paper { display:inline-flex; align-items:center; gap:8px; font-size:0.82rem; color:var(--muted); text-decoration:none; margin-bottom:40px; }
  .wp11 .prev-paper:hover { color:var(--text); }
  .wp11 .nota-metodologica { background:#f9f9f9; border:1px solid var(--border); border-radius:6px; padding:20px 24px; margin-bottom:40px; font-size:0.88rem; }
  .wp11 .nota-metodologica h4 { font-family:'Inter Tight',sans-serif; font-size:0.85rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
  .wp11 .signature { margin-top:48px; padding-top:32px; border-top:1px solid var(--border); }
  .wp11 .signature .name { font-family:'Inter Tight',sans-serif; font-weight:600; font-size:1rem; letter-spacing:-0.01em; }
  .wp11 .signature .role { font-size:0.83rem; color:var(--muted); margin-top:4px; }
  .wp11 .post-footer { margin-top:56px; padding-top:28px; border-top:1px solid var(--border); font-size:0.83rem; color:var(--subtle); font-style:italic; }
  .wp11 .site-footer { max-width:var(--max-w); margin:0 auto; padding:32px 0 56px; border-top:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; font-size:0.78rem; color:var(--subtle); }
  @media(max-width:600px){
    .wp11 h1{font-size:1.75rem;}
    .wp11 .site-footer{flex-direction:column;gap:8px;}
    .wp11 .stat-row{gap:20px;}
  }
`;

function Whitepaper11Page() {
  return (
    <div className="wp11">
      <style>{STYLES}</style>

      <header className="site-header">
        <Link to="/" className="wordmark">Dig Dig</Link>
        <span className="label">White Paper · Nº 11</span>
      </header>

      <article>
        <Link to="/whitepaper-10-antes-da-proxima-onda" className="prev-paper">
          ← White Paper Nº 10: Antes da Próxima Onda
        </Link>

        <div className="post-header">
          <span className="post-label">CAU/PR finalizado · GOV/PR · OCR Flash · 100 mil documentos</span>
          <h1>Cem Mil Documentos e Uma Pergunta</h1>
          <p className="byline">
            <strong>Regis Wilczek + Dig Dig Bud</strong>
            {" "}—{" "}Maio de 2026
          </p>
        </div>

        <div className="nota-metodologica">
          <h4>Contexto deste paper</h4>
          <p>O White Paper Nº 10 fechou com o pipeline de quatro agentes calibrado e a promessa de voltar a rodar em massa. Este paper documenta o que aconteceu logo depois: o sprint que era pra encerrar a auditoria do CAU/PR como MVP virou também o primeiro dia operacional do segundo órgão. Saímos de 4.689 documentos no banco para quase 100 mil. Algumas coisas que estavam previstas saíram, algumas que não estavam apareceram, e uma pergunta que vinha sendo adiada finalmente foi feita.</p>
        </div>

        <hr />

        <h2>1. De 500 portarias a 99.723 documentos</h2>

        <p>É inacreditável escrever isso. O Dig Dig começou em <strong>março de 2026</strong> com um corpus de 500 portarias do CAU/PR raspadas manualmente — eu testando se um modelo de linguagem conseguia ler texto administrativo e devolver algo que fizesse sentido. O repositório no GitHub foi criado em <strong>22 de abril</strong>, quando o protótipo virou algo que valia a pena versionar. Hoje, pouco mais de um mês depois, o banco tem <strong>99.723 documentos</strong> indexados, divididos entre dois órgãos. Não é um número que eu projetei. É um número que apareceu porque o sistema escala — e porque o governo do estado tem muito mais coisa do que eu imaginava.</p>

        <div className="stat-row">
          <div className="stat"><span className="num">99.723</span><span className="desc">documentos no banco</span></div>
          <div className="stat"><span className="num">2</span><span className="desc">órgãos ativos</span></div>
          <div className="stat"><span className="num">4</span><span className="desc">agentes operando</span></div>
          <div className="stat"><span className="num">274</span><span className="desc">sinalizados no CAU/PR</span></div>
        </div>

        <p>Quatro mil seiscentos e oitenta e nove são do CAU/PR — o conselho onde tudo começou, onde aprendi a olhar o que está abaixo da linha do plenário. Os outros 95.034 entraram em um único dia, e nem é o começo do que tem ali. O resto deste paper é sobre os dois lados dessa virada.</p>

        <hr />

        <h2>2. CAU/PR — auditoria entregue como MVP</h2>

        <p>Decisão tomada esta semana: o CAU/PR vai parar de ser um projeto em construção. A partir de agora, é uma auditoria fechada. Vamos rodar uma rodada final do Piper e do Bud apenas nos atos vermelhos — pra que cada um deles tenha tags atualizadas e a métrica CVSS-A completa, com o cruzamento histórico de pessoas que o Bud faz. Depois disso, o conselho fica pronto para ser ativado: aberto pra leitura, com indícios formatados, citações diretas, ficha pronta. E volta a receber documentos novos via scraper conforme o site oficial publicar.</p>

        <p>É um sucesso. O CAU/PR foi onde o pipeline aprendeu a andar — e foi onde a ideia provou que funciona. Quatro gestões consecutivas de controle do aparato disciplinar documentadas, processos sigilosos identificados, padrões de favorecimento mapeados pelas meta-tags. Tudo está no painel. As fichas existem. As citações estão lá.</p>

        <p>Já dou esse MVP como entregue. Daqui pra frente, o que vier no CAU/PR é manutenção — não construção.</p>

        <hr />

        <h2>3. As atas escaneadas pré-2018 — recuperadas via OCR especializado</h2>

        <p>Antes do MVP fechar, faltava resolver uma dívida técnica antiga: 39 atas plenárias do CAU/PR (de 2012 a 2015) estavam no banco com <code>qualidade=ruim</code>, ou seja, scaneadas, sem camada de texto, invisíveis pra qualquer análise. Eram exatamente as atas onde as decisões mais antigas estão registradas — onde começam os padrões que o Bud cruza com o presente.</p>

        <p>A primeira tentativa foi rodar Piper Vision — o mesmo agente que faz OCR e análise numa só chamada. Funcionou: smoke test em três atas, 100% sucesso, texto extraído. Mas o custo veio acima do esperado: <code>US$ 0,24 por ata</code>, com pico de <code>US$ 0,41</code> em PDFs de 30MB. Para as 36 restantes, daria perto de <strong>US$ 9</strong> só pra OCR.</p>

        <p>Repensei. O Piper Vision estava fazendo três coisas ao mesmo tempo com o modelo mais caro do pipeline: OCR, análise de risco, geração de tags. Para uma operação de recuperação retroativa, não precisava de tudo isso na mesma chamada. Precisava só do texto.</p>

        <p>Voltei pra família do ATLAS — o agente lite que já usamos pra classificação canônica. System prompt mínimo (<em>"você é um OCR. Transcreva literalmente. Não comente, não resuma"</em>), output só texto. Resultado: <strong>US$ 0,013 por ata</strong>. Aproximadamente <strong>18 vezes mais barato</strong> que o Piper Vision pra mesma tarefa essencial.</p>

        <div className="stat-row">
          <div className="stat"><span className="num">39</span><span className="desc">atas escaneadas pré-2018</span></div>
          <div className="stat"><span className="num">50</span><span className="desc">com texto OCR no banco hoje</span></div>
          <div className="stat"><span className="num">$0,21</span><span className="desc">custo total do OCR especializado</span></div>
          <div className="stat"><span className="num">7</span><span className="desc">novas vermelhas descobertas</span></div>
        </div>

        <p>Sete vermelhas que estavam invisíveis há treze anos voltaram a ser legíveis. Atas 4, 11, 15, 21 (de 2012-2013), e mais três do biênio 2014-2015. Cada uma com indícios que só apareceram porque o Bud agora consegue cruzar com o histórico de pessoas no corpus inteiro — algo que nem existia quando essas atas foram escritas.</p>

        <p>Lição arquitetural: separar OCR puro de análise. Piper Vision é potente pra atos novos onde queremos as duas coisas juntas. Para recuperação histórica em massa, OCR especializado vence em ordem de magnitude.</p>

        <hr />

        <h2>4. Migração do Piper — janela de 1 milhão de tokens</h2>

        <p>O Piper antigo era um modelo rápido. Bom pra triagem, ruim pra ata plenária. Atas longas estouravam contexto, voltavam truncadas. O Bud era chamado mesmo em atos onde a triagem era suficiente — aumentando custo e latência.</p>

        <p>O Piper agora é um modelo Pro de contexto longo. Janela de 1 milhão de tokens (até 2 milhões com extensão). Cabe o regimento inteiro do órgão, mais o ato completo, mais a base legal aplicável, em uma única passada. Atas plenárias de oitenta páginas não truncam mais. Multimodal nativo: o mesmo Piper que lê texto pode fazer OCR de PDFs digitalizados, sem chamada separada.</p>

        <p>Na prática isso muda o equilíbrio dos quatro agentes. ATLAS é o classificador massivo, baratíssimo, que organiza o corpus. Piper agora é o cérebro analítico de primeira linha — investigativo de verdade, não só triagem. Bud entra para os críticos, com cruzamento histórico. Zew sintetiza o corpus inteiro do órgão.</p>

        <hr />

        <h2>5. GOV/PR — primeiro dia, 95.034 documentos</h2>

        <p>O segundo órgão era o governo do estado do Paraná. A diferença de escala em relação ao CAU é absurda — um conselho profissional regional versus o aparato administrativo inteiro do executivo estadual. Eu sabia que ia ser maior. Não imaginei que seria tão maior.</p>

        <p>Em vinte e quatro horas, com scrapers desenhados pra cada subsistema do Portal de Transparência Estadual, o que entrou no banco:</p>

        <table className="breakdown-table">
          <thead><tr><th>Categoria</th><th style={{textAlign:"right"}}>Documentos</th></tr></thead>
          <tbody>
            <tr><td>Convênios estaduais</td><td className="num">27.832</td></tr>
            <tr><td>Licitações</td><td className="num">19.280</td></tr>
            <tr><td>Catálogo de itens</td><td className="num">18.463</td></tr>
            <tr><td>Fornecedores do Estado</td><td className="num">16.690</td></tr>
            <tr><td>Contratos públicos</td><td className="num">9.348</td></tr>
            <tr><td>Preços registrados</td><td className="num">2.228</td></tr>
            <tr><td>Viagens / diárias</td><td className="num">479</td></tr>
            <tr><td>Remuneração mensal de servidores</td><td className="num">168</td></tr>
            <tr><td>Remuneração financeira</td><td className="num">168</td></tr>
            <tr><td>Dispensas / inexigibilidade</td><td className="num">103</td></tr>
            <tr><td>Inventário PTE (sub-itens)</td><td className="num">101</td></tr>
            <tr><td>Dumps anuais (despesa, receita, licitação, contrato)</td><td className="num">86</td></tr>
            <tr><td><strong>Total</strong></td><td className="num"><strong>95.034</strong></td></tr>
          </tbody>
        </table>

        <p>Admito que deu muito mais trabalho do que eu imaginava. Cada subsistema do PTE tem sua própria estrutura de URL, seus próprios parâmetros AJAX, seu próprio formato de resposta. Foram horas mapeando endpoints com Playwright, decompondo formulários POST, descobrindo onde os dados <em>realmente</em> moram quando o portal oficial entrega só uma fração via interface visível. Foi um dia inteiro dedicado a isso. E os dados apareceram.</p>

        <p>Mas isso é o começo. Convênios, contratos, licitações — é a estrutura financeira. O que ainda não está no banco são os <strong>atos administrativos das secretarias</strong>: portarias do Governador, decretos, leis estaduais, atos de cada secretaria. Ali é onde acontecem os projetos e as ações. Ali é onde está o governo de verdade. As secretarias são a próxima fase.</p>

        <hr />

        <h2>6. Amostra do GOV/PR — preview dos primeiros resultados</h2>

        <p>Não rodamos o pipeline em massa no GOV/PR ainda. Isso fica pro próximo sprint, depois que o ATLAS terminar de classificar canonicamente os 95 mil documentos novos. O que fizemos foi uma amostra estratégica: <strong>10 convênios estaduais</strong> escolhidos manualmente, passados pelo Piper para validar que a calibragem funciona em terreno diferente do conselho profissional. Esses 10 são apenas uma amostra entre as muitas que estão por vir — preview de resultado, não cobertura.</p>

        <p>Distribuição da amostra: <strong>4 vermelhos</strong>, <strong>5 laranjas</strong>, <strong>1 amarelo</strong>. A calibragem segurou: convênios com indícios fortes apareceram no topo do ranking; um convênio de inovação científica com falhas formais menores caiu em amarelo, sem ser inflado. Os títulos, valores, datas e indícios abaixo são o que efetivamente está no banco agora — qualquer pessoa autorizada pode abrir cada um deles no painel pra conferir as citações.</p>

        <table className="breakdown-table">
          <thead><tr><th>Nível</th><th>Score</th><th>Convênio (resumo)</th></tr></thead>
          <tbody>
            <tr><td><strong style={{color:"#b91c1c"}}>vermelho</strong></td><td className="num">90</td><td>FUNDO DE EQUIPAMENTO AGROPECUÁRIO × MUNICÍPIO DE FORMOSA DO OESTE — repasse de R$ 1 milhão dentro do período eleitoral, indícios de uso político de recurso público (set/2024)</td></tr>
            <tr><td><strong style={{color:"#b91c1c"}}>vermelho</strong></td><td className="num">85</td><td>FUNDO ESTADUAL DE SAÚDE × ASSOCIAÇÃO DE REABILITAÇÃO — R$ 1,92 milhão para uma OSC sem evidência de chamamento público (set/2007)</td></tr>
            <tr><td><strong style={{color:"#b91c1c"}}>vermelho</strong></td><td className="num">85</td><td>FUNDO ESTADUAL DE SAÚDE × CONSÓRCIO INTERMUNICIPAL — transferência da gestão completa de dois hospitais públicos para um consórcio privado (dez/2007)</td></tr>
            <tr><td><strong style={{color:"#b91c1c"}}>vermelho</strong></td><td className="num">82</td><td>COMPANHIA DE SANEAMENTO DO PARANÁ × MUNICÍPIO DE UBIRATÃ — repasse de mais de R$ 1 milhão de uma companhia de saneamento para pavimentação (abr/2024)</td></tr>
            <tr><td><strong style={{color:"#ea580c"}}>laranja</strong></td><td className="num">75</td><td>ADMINISTRAÇÃO DOS PORTOS DE PARANAGUÁ × FUNDAÇÃO (UFPR via FUNPAR) — acordo de R$ 1,99 milhão com indícios formais de fragilidade (mar/2024)</td></tr>
            <tr><td><strong style={{color:"#ea580c"}}>laranja</strong></td><td className="num">75</td><td>SEAP × CORAL PARANÁ DE CURITIBA — Termo de Fomento sem chamamento público; dispensa indevida (Lei 13.019/2014 Art. 24 c/c Art. 30) (abr/2024)</td></tr>
            <tr><td><strong style={{color:"#ea580c"}}>laranja</strong></td><td className="num">75</td><td>FUNDO ESTADUAL DO ESPORTE × FEDERAÇÃO PARANAENSE DE FUTEBOL DE SALÃO — Termo de Fomento de R$ 375 mil com beneficiária pré-identificada (nov/2024)</td></tr>
            <tr><td><strong style={{color:"#ea580c"}}>laranja</strong></td><td className="num">72</td><td>DEFENSORIA PÚBLICA DO ESTADO × CONSELHO NACIONAL — repasse de R$ 50 mil anuais sem critério objetivo aparente (jul/2024)</td></tr>
            <tr><td><strong style={{color:"#ea580c"}}>laranja</strong></td><td className="num">70</td><td>INSTITUTO ÁGUA E TERRA × MUNICÍPIO DE PALMITAL — convênio firmado em período pós-eleitoral, indícios de uso político (nov/2024)</td></tr>
            <tr><td><strong style={{color:"#ca8a04"}}>amarelo</strong></td><td className="num">45</td><td>FUNDAÇÃO ARAUCÁRIA × UNIVERSIDADE ESTADUAL DO CENTRO-OESTE — projeto de inovação com falhas formais menores; dados de qualificação incompletos (dez/2024)</td></tr>
          </tbody>
        </table>

        <div className="callout info">
          <p style={{margin:0}}>Essa é literalmente a primeira amostra — 10 documentos sorteados, extraídos primeiro pelo Atlas e analisados depois pelo Piper. Provavelmente está dando alguns falsos positivos, e isso vai ser exaustivamente calibrado nas próximas rodadas. Mesmo assim, já aparecem alertas que indicam que, bem calibrado, vamos conseguir resultados consistentes.</p>
        </div>

        <p>Padrões que pulam aos olhos só nessas 10 amostras: convênios celebrados <em>em período eleitoral</em> ou <em>pós-eleitoral</em> com municípios pequenos, Termos de Fomento com OSCs sem chamamento público (mesmo padrão do CAU/PR mas em outro contexto regulatório — Lei 13.019/2014), companhias estatais de saneamento ou de portos transferindo recursos pra atividades fora do escopo. Tudo isso aparece estruturado, com citação direta do trecho, base legal apontada, e sugestão de questionamento já redigida. Pronto pra leitura crítica humana.</p>

        <p>Não é mágica — é a IA cruzando cada ato com a base legal específica do órgão. A decisão sobre o que fazer com cada um (denunciar, publicar, processar, ou simplesmente arquivar como ato passou pelo radar e foi sinalizado) continua sendo humana. O que precisa ser lido aparece organizado por gravidade.</p>

        <hr />

        <h2>7. Front polido — todos os atritos que não eram visíveis</h2>

        <p>Muita coisa que os usuários vão notar foi reescrita esta semana. Não eram features novas — eram atritos que o sistema acumulou enquanto o foco estava no pipeline. Resolver isso era mais responsabilidade que ambição.</p>

        <h3>Solicitar acesso reformado</h3>

        <p>O formulário de solicitação ganhou três perguntas obrigatórias: filiação a partido político (com campo do partido se sim), se a pessoa é agente público, e como nos encontrou. Mais um campo opcional de Instagram com mensagem de incentivo: "pedidos com Instagram tendem a ser aprovados mais rápido — usamos o perfil para verificar identidade". É honestidade técnica: eu abro o link, olho o perfil, decido. Não há verificação automatizada nem badge falso. Só revisão manual.</p>

        <p>O componente da pergunta sobre filiação é a UI que mais me deu satisfação esta semana: quando a pessoa marca "Sim", o botão se transforma em "Sim ✓" compacto e o input do partido aparece na mesma linha, sem expandir verticalmente. O formulário inteiro continua cabendo em uma tela.</p>

        <h3>reCAPTCHA v3 invisível</h3>

        <p>Anti-bot no formulário e no login. Score-based, sem checkbox interrompendo o usuário humano. Threshold em 0,5. Se Google está fora do ar, fail-open — ninguém legítimo é punido por outage de terceiros.</p>

        <h3>Página /por-que-fechado</h3>

        <p>Página minimalista nova explicando por que o Dig Dig é beta fechado: porque os dados expõem indícios em processos sigilosos e padrões de favorecimento, e o critério de quem lê é o que separa material de denúncia infundada. Linkada em pequeno na página de solicitação. Quatro parágrafos. Honesto sobre o que estamos fazendo.</p>

        <h3>Tom corrigido nas landing pages</h3>

        <p>O bloco principal de /soluções estava com o título "Não é uma busca. É uma análise." Soa bem. Mas vai contra o que o Dig Dig é. A IA não decide — ela escava, organiza, sinaliza. A decisão de denunciar, publicar, processar continua sendo humana. Reescrevi pra <em>"Lemos por você. A decisão é sua."</em>, e ajustei outros pontos onde o tom puxava pra "IA conclui" em vez de "humano decide com mais informação".</p>

        <p>Junto disso, removi 51 travessões longos das três landings (soluções, modelos, apoiar). Era ruído estilístico — soava texto gerado por LLM. Substituí cada um pela pontuação que cabia no contexto: dois pontos quando exemplificava, vírgula quando era apêndice, ponto quando era oração nova. Pequeno detalhe, faz diferença.</p>

        <h3>Spline brain na home</h3>

        <p>Adicionei a cena 3D do cérebro com partículas (a mesma que aparece no chat do painel) no canto direito da home, em modo teste. Acima dos cards que mostram o nível de atenção e o contador de documentos. Decoração? Sim. Mas comunica algo: o sistema é vivo, está pensando.</p>

        <h3>Página /modelos atualizada</h3>

        <p>O ATLAS apareceu como primeiro modelo da família — antes só tinham Piper, Bud e Zew. As especificações do Piper foram atualizadas pra refletir a migração: agora é Modelo Pro de contexto longo, janela de 1M tokens (até 2M), multimodal. Mantive o critério editorial de não nomear o motor por trás — quem lê precisa saber o que cada agente da Dig Dig faz, o tipo de tarefa em que se destaca, e o trade-off entre velocidade e profundidade. Não precisa saber qual provedor está rodando atrás.</p>

        <hr />

        <h2>8. Segurança — Snyk fechado</h2>

        <p>Recebi um relatório de vulnerabilidades do Snyk com 17 issues abertas — 1 crítica, 8 altas, 7 médias, 1 baixa. A crítica era HTTP Request Smuggling no <code>h11</code> 0.14 (CVE-2025-43859). As altas incluíam ReDoS no Starlette, XXE Injection no lxml, race condition no anyio.</p>

        <p>A maior parte já estava corrigida no container em produção via resolução transitiva — o Snyk olhava um snapshot antigo do <code>requirements.txt</code> no GitHub. Pinéi explicitamente as versões seguras (<code>h11&gt;=0.16.0</code>, <code>fastapi==0.115.6</code>, <code>sentry-sdk==2.18.0</code>, <code>lxml&gt;=6.0.0</code>) e subi o FastAPI/Starlette juntos pra fechar duas issues de Allocation Without Limits que ainda permaneciam.</p>

        <p>Detalhe que quase quebrou produção: FastAPI 0.115 mudou a regra e agora exige <code>python-multipart</code> instalado explicitamente quando há rotas com File ou Form. Antes vinha implícito. Sem ele, o startup do servidor falha com erro de runtime. Adicionei como dependência explícita. Container voltou a subir, healthcheck respondendo 200.</p>

        <p>Trinta e quatro commits subidos pro repositório. Snyk re-scaneia o repo e fecha as 17 issues automaticamente.</p>

        <hr />

        <h2>9. Para onde estou indo?</h2>

        <p>Aqui vou ser honesto. O foco era entregar o sprint. O sprint está mais que entregue. A partir de agora, o que vier é aprimoramento que vamos julgar necessário ou não. E nessa pausa, parte do meu dia tem sido pensar muito bem o que fazer com o Dig Dig.</p>

        <p>Em certos momentos só penso em postar no Reddit anônimo e ver no que dá. Sendo sincero, estou organizando para isso. Não como decisão tomada — como possibilidade real, dimensionada, com risco aceitável.</p>

        <p>O CAU/PR foi a prova de conceito. O GOV/PR é a expansão. Mas a pergunta que nenhum sprint responde é: <em>para onde isso está indo?</em> O Dig Dig vai virar um produto comercial? Um instrumento de jornalismo investigativo aberto? Uma ferramenta de uso público com financiamento por apoio? Um canal anônimo? Não decidi. Cada caminho exige uma postura diferente — e tenho percebido que a postura técnica que defini até aqui não compromete nenhum deles. Posso decidir depois, e o pipeline funciona em qualquer um.</p>

        <p>O que sei é o seguinte: cem mil documentos administrativos de dois órgãos públicos brasileiros estão no meu banco, classificados, com indícios estruturados, prontos pra serem lidos. Isso não estava aqui há uma semana. E o sistema escala — vinte e sete mil convênios entraram numa noite. Os próximos vinte e sete mil também vão entrar. As secretarias do governo são a próxima fronteira. Diários oficiais, decretos do Governador, leis estaduais consolidadas — tudo numa fila técnica que já existe.</p>

        <hr />

        <h2>10. Cem mil documentos. Mil mil pra ler.</h2>

        <p>Esse paper podia ter encerrado o sprint do CAU/PR. Acabou sendo ele e o anúncio de que o GOV/PR também já está dentro. Cansei de adiar a sensação de "missão cumprida". Ela aconteceu. E exatamente quando aconteceu, o trabalho ficou maior — porque o sistema mostrou que o que parecia ambição era só o começo.</p>

        <p>Vou dar sequência ao governo do estado. Vou rodar a auditoria final do CAU/PR. Vou continuar polindo o front conforme as pessoas usam e me dizem onde dói. E vou continuar pensando, sem pressa, pra onde isso tudo vai. Logo voltamos com mais.</p>

        <p>Obrigado se você está acompanhando. Os indícios estão prontos. A decisão é sua.</p>

        <div className="signature">
          <div className="name">Regis Wilczek</div>
          <div className="role">Fundador, Dig Dig — Curitiba, maio de 2026</div>
        </div>

        <p className="post-footer">
          White Paper Nº 11 do projeto Dig Dig. Série de registro técnico sobre auditoria pública automatizada com IA. Este documento foi produzido colaborativamente entre o fundador do Dig Dig e o Dig Dig Bud, com base nas decisões de produto, nas mudanças de arquitetura e nos números reais do banco no momento da escrita. As análises e classificações são instrumentos de investigação — não conclusões jurídicas. Nenhuma afirmação de crime ou responsabilidade individual é feita ou insinuada neste documento.
        </p>
      </article>

      <footer className="site-footer">
        <span>© 2026 Dig Dig</span>
        <Link to="/blog" style={{ color: "inherit", textDecoration: "none" }}>← Todos os White Papers</Link>
      </footer>
    </div>
  );
}
