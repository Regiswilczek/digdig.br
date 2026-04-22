# Scraper e Adição de Novas Instituições

---

## 1. Visão Geral do Scraper

O scraper é responsável por:
1. Baixar PDFs dos atos administrativos a partir dos links já coletados
2. Extrair texto dos PDFs (nativo ou OCR)
3. Normalizar e salvar no banco de dados
4. Opcionalmente: descobrir novos atos em sites de órgãos

---

## 2. Arquitetura do Scraper

```
ScraperOrchestrator
    ├── PDFDownloader      → baixa o arquivo PDF
    ├── TextExtractor      → extrai texto do PDF
    │   ├── NativeExtractor    (pdfplumber — para PDFs com texto)
    │   └── OCRExtractor       (Tesseract — fallback para escaneados)
    ├── TextNormalizer     → limpa e normaliza o texto extraído
    └── StorageService     → salva PDF no Supabase Storage + texto no banco
```

---

## 3. Código do Scraper

### 3.1 Downloader com Retry

```python
import httpx
import time
from tenacity import retry, stop_after_attempt, wait_exponential

class PDFDownloader:
    HEADERS = {
        "User-Agent": "AuditaPublico/1.0 (+https://auditapublico.com.br/bot)",
        "Accept": "application/pdf,*/*"
    }
    
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    def baixar(self, url: str) -> bytes:
        resp = httpx.get(url, headers=self.HEADERS, timeout=30, follow_redirects=True)
        resp.raise_for_status()
        
        content_type = resp.headers.get("content-type", "")
        if "pdf" not in content_type and len(resp.content) < 1000:
            raise ValueError(f"Resposta não é um PDF válido: {content_type}")
        
        return resp.content
    
    def baixar_com_rate_limit(self, url: str, dominio: str) -> bytes:
        self._respeitar_rate_limit(dominio)
        conteudo = self.baixar(url)
        self._registrar_request(dominio)
        return conteudo
    
    def _respeitar_rate_limit(self, dominio: str):
        ultimo = self._ultimo_request.get(dominio, 0)
        espera_necessaria = 1.5 - (time.time() - ultimo)
        if espera_necessaria > 0:
            time.sleep(espera_necessaria)
```

### 3.2 Extrator de Texto

```python
import pdfplumber
import io
from dataclasses import dataclass

@dataclass
class ResultadoExtracao:
    texto: str
    paginas: int
    metodo: str        # 'native' | 'ocr' | 'ementa_only'
    qualidade: str     # 'boa' | 'parcial' | 'ruim'
    tokens_estimados: int

class TextExtractor:
    
    def extrair(self, pdf_bytes: bytes) -> ResultadoExtracao:
        try:
            return self._extrair_nativo(pdf_bytes)
        except Exception:
            return self._extrair_ocr(pdf_bytes)
    
    def _extrair_nativo(self, pdf_bytes: bytes) -> ResultadoExtracao:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            paginas = len(pdf.pages)
            textos = []
            
            for page in pdf.pages:
                texto_pagina = page.extract_text(
                    x_tolerance=3,
                    y_tolerance=3,
                    layout=True
                )
                if texto_pagina:
                    textos.append(texto_pagina)
            
            texto_completo = "\n\n".join(textos)
            
            if len(texto_completo.strip()) < 50:
                raise ValueError("Texto insuficiente — possível PDF escaneado")
            
            return ResultadoExtracao(
                texto=self._normalizar(texto_completo),
                paginas=paginas,
                metodo="native",
                qualidade="boa" if len(texto_completo) > 200 else "parcial",
                tokens_estimados=int(len(texto_completo.split()) * 1.3)
            )
    
    def _extrair_ocr(self, pdf_bytes: bytes) -> ResultadoExtracao:
        # Fallback: converter PDF para imagem e usar Tesseract
        try:
            import pytesseract
            from pdf2image import convert_from_bytes
            
            imagens = convert_from_bytes(pdf_bytes, dpi=200)
            textos = []
            
            for img in imagens:
                texto = pytesseract.image_to_string(img, lang="por")
                textos.append(texto)
            
            texto_completo = "\n\n".join(textos)
            
            return ResultadoExtracao(
                texto=self._normalizar(texto_completo),
                paginas=len(imagens),
                metodo="ocr",
                qualidade="parcial",
                tokens_estimados=int(len(texto_completo.split()) * 1.3)
            )
        except Exception as e:
            return ResultadoExtracao(
                texto="",
                paginas=0,
                metodo="falhou",
                qualidade="ruim",
                tokens_estimados=0
            )
    
    def _normalizar(self, texto: str) -> str:
        import re
        # Remover caracteres de controle
        texto = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', texto)
        # Normalizar múltiplos espaços e quebras de linha
        texto = re.sub(r'\n{3,}', '\n\n', texto)
        texto = re.sub(r' {2,}', ' ', texto)
        # Corrigir encoding comum em PDFs brasileiros
        substituicoes = {
            'Ã£': 'ã', 'Ã§': 'ç', 'Ã©': 'é', 'Ã': 'Á',
            'â€™': "'", 'â€œ': '"', 'â€': '"'
        }
        for errado, correto in substituicoes.items():
            texto = texto.replace(errado, correto)
        return texto.strip()
```

### 3.3 Task Celery de Scraping

```python
from celery import shared_task
from app.models import Ato, ConteudoAto
from app.services.storage import salvar_pdf_storage

@shared_task(bind=True, max_retries=3)
def scrape_ato(self, ato_id: str):
    ato = Ato.get(ato_id)
    
    if not ato.url_pdf:
        # Sem PDF: usar apenas ementa
        ConteudoAto.criar(
            ato_id=ato_id,
            texto=f"{ato.titulo}\n\n{ato.ementa}",
            metodo="ementa_only",
            qualidade="ruim"
        )
        return
    
    try:
        downloader = PDFDownloader()
        pdf_bytes = downloader.baixar_com_rate_limit(ato.url_pdf, get_dominio(ato.url_pdf))
        
        # Salvar PDF no Storage
        pdf_path = salvar_pdf_storage(ato_id, pdf_bytes)
        
        # Extrair texto
        extrator = TextExtractor()
        resultado = extrator.extrair(pdf_bytes)
        
        # Salvar no banco
        ConteudoAto.criar(
            ato_id=ato_id,
            texto=resultado.texto,
            metodo=resultado.metodo,
            qualidade=resultado.qualidade,
            tokens_estimados=resultado.tokens_estimados
        )
        
        Ato.update(ato_id, 
                   pdf_baixado=True, 
                   pdf_path=pdf_path,
                   pdf_paginas=resultado.paginas,
                   processado=True)
        
    except Exception as exc:
        Ato.update(ato_id, erro_download=str(exc))
        raise self.retry(exc=exc, countdown=60)
```

---

## 4. Como Adicionar Nova Instituição

### Passo 1 — Pesquisar a estrutura do site

Verificar:
- URL da listagem de atos (ex: `camara.gov.br/resolucoes`)
- Tipo de paginação (WordPress, custom, numerada)
- Estrutura HTML dos links (seletor CSS)
- Formato das datas nos documentos
- Tipos de atos disponíveis

### Passo 2 — Configurar o scraper_config

```json
{
  "fontes": [
    {
      "tipo": "portarias",
      "url_base": "https://www.caupr.gov.br/portarias",
      "paginacao": "wordpress",
      "seletor_links": ".entry-content a[href$='.pdf']",
      "seletor_titulo": ".entry-title",
      "seletor_data": ".entry-date",
      "formato_data": "%d/%m/%Y",
      "paginas_max": 50
    },
    {
      "tipo": "deliberacoes",
      "url_base": "https://www.caupr.gov.br/?page_id=17916",
      "paginacao": "custom",
      "param_pagina": "paged",
      "seletor_links": "table tr td a",
      "paginas_max": 100
    }
  ],
  "rate_limit_segundos": 1.5,
  "timeout_segundos": 30,
  "max_paralelo": 5,
  "user_agent": "AuditaPublico/1.0"
}
```

### Tipos de paginação suportados

| Tipo | Como funciona | Exemplo |
|------|--------------|---------|
| `wordpress` | `?paged=N` na URL | caupr.gov.br/portarias?paged=2 |
| `numerada` | `/page/N` na URL | site.gov.br/atos/page/2 |
| `custom` | parâmetro customizado | site.gov.br/atos?p=N |
| `infinita` | scroll ou botão "ver mais" | precisa de Playwright |
| `manual` | JSON de links fornecido manualmente | portarias_caupr.json |

### Passo 3 — Inserir o regimento

```python
# Via painel admin ou script
KnowledgeBase.criar(
    tenant_id=tenant.id,
    tipo="regimento",
    titulo="Regimento Interno — 6ª versão (DPOPR 0191-02/2025)",
    conteudo=texto_completo_do_regimento,  # extraído do PDF do regimento
    versao="6.0",
    vigente_desde=date(2025, 12, 12),
    url_original="https://www.caupr.gov.br/regimento/"
)
```

### Passo 4 — Definir regras específicas

```python
regras = [
    TenantRegra(
        tenant_id=tenant.id,
        categoria="legal",
        nome="Prazo comissão processante",
        descricao="Comissão processante não pode exceder 60 dias sem prorrogação formal",
        palavras_chave=["comissão processante", "comissao processante"],
        peso=3
    ),
    TenantRegra(
        tenant_id=tenant.id,
        categoria="moral",
        nome="Ad Referendum excessivo",
        descricao="Mais de 3 atos Ad Referendum consecutivos indicam concentração de poder",
        palavras_chave=["ad referendum", "praticado pelo presidente"],
        peso=2
    ),
]
db.bulk_save_objects(regras)
```

### Passo 5 — Disparar a análise inicial

```bash
# Via API admin
POST /admin/orgaos/nova-instituicao/rodadas
{
  "modo": "completo",
  "max_atos": null,
  "forcar_reanalise": false
}
```

### Passo 6 — Publicar

```python
# Mudar status para active após revisão dos resultados
Tenant.update(tenant_id, status="active")
```

---

## 5. Scraper de Descoberta (opcional — para manter atualizado)

Para pegar atos publicados após a análise inicial:

```python
@shared_task
def descobrir_novos_atos(tenant_id: str):
    tenant = Tenant.get(tenant_id)
    config = tenant.scraper_config
    
    for fonte in config["fontes"]:
        novos = scrape_pagina_listagem(fonte)
        
        for ato_meta in novos:
            # Verificar se já existe no banco
            existe = Ato.existe(tenant_id, ato_meta["numero"], ato_meta["tipo"])
            
            if not existe:
                novo_ato = Ato.criar(tenant_id=tenant_id, **ato_meta)
                # Enfileirar para download e análise
                scrape_ato.delay(novo_ato.id)
                analisar_ato_haiku.delay(novo_ato.id, tenant_id)
```

Agendamento sugerido: **uma vez por semana**, via Celery Beat.

---

## 6. Tratamento de Casos Especiais

### PDFs muito grandes (> 10MB)
```python
MAX_PDF_SIZE = 10 * 1024 * 1024  # 10MB

if len(pdf_bytes) > MAX_PDF_SIZE:
    # Extrair apenas as primeiras 5 páginas
    texto = extrair_primeiras_paginas(pdf_bytes, max_paginas=5)
    qualidade = "parcial"
```

### PDFs com senha
```python
try:
    with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
        texto = extrair_texto(pdf)
except pdfplumber.utils.exceptions.PdfiumError:
    # PDF com senha — registrar e pular
    Ato.update(ato_id, erro_download="PDF protegido por senha")
```

### Links quebrados (404)
```python
if resp.status_code == 404:
    Ato.update(ato_id, erro_download="PDF não encontrado (404)")
    return  # não retry
```

### Caracteres especiais e encoding
O normalizer já trata os casos mais comuns de encoding quebrado em PDFs brasileiros (Windows-1252 interpretado como UTF-8).

---

## 7. Monitoramento do Scraper

```python
# Métricas por rodada (salvas no banco)
{
  "total_atos": 1171,
  "baixados_com_sucesso": 1145,
  "erros_download": 18,
  "pdfs_escaneados_ocr": 8,
  "pdfs_sem_texto": 10,
  "bytes_baixados_total": 2_847_293_184,
  "tempo_total_minutos": 42,
  "taxa_sucesso": "97.7%"
}
```
