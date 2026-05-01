# Estratégia de Storage — Dig Dig (escala GOV-PR e além)

> Documento decisório. Avalia opções de storage pra suportar o crescimento
> do projeto (CAU/PR + GOV-PR + futuros órgãos), com ênfase em **custo
> operacional**, **integridade auditável** (perícia, prova de existência) e
> **soberania dos dados**.

---

## 1. Volume estimado

### Hoje (CAU/PR)
- ~3.400 PDFs, total ~5 GB no Supabase Storage
- ~1.700 análises (JSON, irrelevante pra storage)

### Projeção GOV-PR (só Convênios — categoria já mapeada)
- **89.000 convênios** entre 2007-2025
- PDFs médios 0.5-2 MB → estimativa **~90-180 GB** só pra convênios

### Projeção total GOV-PR (todas as fontes)
| Fonte | Estimativa de docs | Tamanho médio | Volume |
|---|---|---|---|
| Convênios (CAT 4) | ~89.000 | 1 MB | ~90 GB |
| Licitações + Contratos (CAT 5) | ~150.000 | 2 MB | ~300 GB |
| Despesas / pagamentos (CAT 4) | metadado, sem PDF | — | <1 GB |
| Diário Oficial Executivo (DIOE) | 5.431 edições × ~50 MB | 50 MB | ~270 GB |
| RREO/RGF + Contábil (CAT 7) | ~500 PDFs grandes | 5 MB | ~3 GB |
| Outros tipos (8/10/11/12) | ~10.000 | 1 MB | ~10 GB |
| **Total GOV-PR** | **~250.000 docs** | — | **~700 GB** |

### Multi-tenant (10 estados em 5 anos)
Linearizando: **5-10 TB** em 5 anos, sem deduplicação cross-órgão.

---

## 2. Opções avaliadas

### A. Supabase Storage (atual)
- **Custo:** $0,021/GB/mês = **$210/mês por TB** + bandwidth ($0,09/GB egress)
- **Pros:** já integrado, RLS, CDN, signed URLs
- **Contras:** preço sobe rápido (~$2.500/mês pra 10 TB), egress caro
- **Escalabilidade:** OK até ~5 TB; acima fica financeiramente inviável

### B. VPS local (Hostinger/dedicated)
- **Custo:** sem extra (já inclui ~200-400 GB no plano atual)
- **Pros:** $0 marginal, latência mínima pra serviços que rodam local
- **Contras:** capacidade dura — escalar exige migrar de plano (~$50-100/mês por TB)
- **Risco:** sem redundância automática; se a VPS morre, dados se vão
- **Escalabilidade:** ruim acima de 1 TB

### C. **Cloudflare R2** ⭐ recomendado
- **Custo:** **$0,015/GB/mês** + zero egress dentro Cloudflare
  - 1 TB: $15/mês
  - 10 TB: $150/mês
- **Pros:**
  - **Zero egress** (downloads grátis), o oposto do S3 (que cobra $0,09/GB pra sair)
  - S3-compatible API (boto3, s3cmd, MinIO client funcionam)
  - CDN integrado
  - Signed URLs nativos
- **Contras:** integração nova, TTL operacional (2-3 dias pra setup + migrar)
- **Escalabilidade:** ótima — Cloudflare comporta exabytes

### D. Wasabi / Backblaze B2
- Wasabi: $0,0059/GB/mês = **$6/mês por TB**
- Backblaze B2: $0,006/GB/mês + 3x download grátis
- **Pros:** mais baratos do mercado
- **Contras:** Wasabi cobra mínimo 90 dias de armazenamento mesmo se deletar antes; menos integrações; CDN separado
- **Caso de uso:** **archive frio** (PDFs já analisados, raramente acessados)

### E. AWS S3 (referência)
- **Custo:** $0,023/GB/mês + $0,09/GB egress = ~$23/mês + $90/TB transferido
- Inviável pra projeto público com download livre

### F. IPFS
- **Custo:** zero pra publicar; precisa **pinning service** (Pinata, Web3.Storage, Filebase)
  - Pinata: $20/mês até 1 TB
  - Web3.Storage: pago por GB/dia
- **Pros:** descentralizado, hash determina conteúdo (CID), imutável
- **Contras:** garbage collection se não pinar; latência variável; complexidade
- **Caso de uso:** publicação de subset "imutável" de provas auditadas

### G. Filecoin / Arweave (preservação eterna)
- **Filecoin:** ~$0,0003/GB/mês mas com staking complexo
- **Arweave:** **pagamento único** (~$5/GB) pra preservação **permanente** garantida em blockchain
- **Caso de uso:** **âncora de provas** — só pra docs que viraram denúncia formal e queremos preservar pra sempre

### H. OpenTimestamps (carimbo de tempo blockchain) ⭐ recomendado
- **Custo:** **GRATUITO** — agrega hashes em Merkle trees publicadas no Bitcoin
- **Não armazena documento** — só prova que o hash existia em determinada data
- **Pros:**
  - Prova criptográfica de **integridade temporal** ("este PDF existia em 2026-04-30 e não foi alterado")
  - Compatível com qualquer storage backend
  - Verifiable offline
- **Contras:** não replace storage; complementa
- **Recomendação:** integrar pra **todos os PDFs** independentemente do storage escolhido

---

## 3. Arquitetura proposta (multi-tier)

```
                  ┌──────────────────────────────────────────┐
                  │  PostgreSQL (Supabase) — só metadados   │
                  │  + URL + hash SHA-256 + tx_opentimestamps│
                  └────────────────┬─────────────────────────┘
                                   │
            ┌──────────────────────┴────────────────────────┐
            │                                               │
            ▼                                               ▼
┌────────────────────────────┐                ┌────────────────────────┐
│  Cloudflare R2 (PDFs)      │                │  OpenTimestamps         │
│  — Storage primário        │                │  — Hash → BTC blockchain│
│  — $0,015/GB/mês           │                │  — Grátis, prova de     │
│  — Zero egress             │                │    integridade temporal │
│  — Signed URLs             │                └────────────────────────┘
└────────────────────────────┘                          │
            │                                            │
            │  (opcional, só pra denúncias formais)      │
            ▼                                            │
┌────────────────────────────┐                          │
│  Arweave / Filecoin        │◄─────────────────────────┘
│  — Preservação eterna      │
│  — Pago uma vez (~$5/GB)   │
└────────────────────────────┘
```

### Camadas

1. **PostgreSQL (Supabase atual)** — metadados, texto extraído, análises IA, hashes. **Não muda.**

2. **Cloudflare R2** — primário pra TODOS os PDFs. ~$15/mês por TB, zero egress. Signed URLs gerados sob demanda pelo backend FastAPI.

3. **OpenTimestamps** — pra cada PDF baixado, calcular SHA-256 e enviar pro OTS. Salvar `proof.ots` no R2 e `tx_opentimestamps` no Postgres. **Grátis.**

4. **Arweave (opcional, futuro)** — apenas docs que viraram **denúncia formal** ou que queremos preservar mesmo se R2 sair do ar. ~$5/GB.

### Fluxo de scraping com este modelo

```
1. Scraper baixa PDF do TCE-PR (httpx)
2. Calcula SHA-256
3. Sobe pro R2 com path = sha256.pdf
4. Extrai texto (pdfplumber)
5. INSERT atos + conteudo_ato com:
   - sha256
   - r2_path = "/r2/atos/{slug}/sha256.pdf"
   - texto_completo
6. Background task envia hash pro OTS
7. Quando OTS confirma (24-48h), salva proof.ots no R2
   e atualiza ato.opentimestamps_proof_path
```

---

## 4. Custo comparativo — projeção 5 anos / 10 TB

| Cenário | Setup | Operação ano 1 | Ano 5 (10 TB) |
|---|---|---|---|
| **Supabase Storage** (atual) | $0 | $90/mês = $1.080/ano | **$2.520/mês** = $30k/ano |
| **VPS local** | $0 | grátis até 1 TB; $50/mês ano 2 | precisa migrar plano várias vezes |
| **R2 + OTS** (recomendado) | 1 dia integração | $15-30/mês = $200/ano | **$150/mês** = $1.800/ano |
| **R2 + Wasabi archive** | 1 semana | $20/mês | **$80/mês** = $1.000/ano |

**Economia projetada (5 anos): R2 economiza ~$140k vs continuar no Supabase Storage.**

---

## 5. Sobre blockchain — quando vale a pena

### O que blockchain RESOLVE
- **Carimbo de tempo verificável**: "este documento existia em DD/MM/AAAA com este conteúdo exato"
- **Imutabilidade pública**: ninguém (incluindo nós) pode alterar o registro depois
- **Auditoria de terceiros**: jornalista/MP pode verificar a prova sem confiar em nossa palavra

### O que blockchain NÃO RESOLVE
- Storage real do PDF (a maioria das blockchains não armazena conteúdo, só hash)
- Latência (consulta blockchain é segundos a minutos)
- Custo (Ethereum/Bitcoin caros pra escrever; Polygon/Arweave variam)

### Recomendação
- **OpenTimestamps pra TODOS** os PDFs auditados — grátis, integra Bitcoin
- **Arweave seletivo** — só docs que entram em denúncia formal ou white paper público (~$5/GB pago uma vez, preservação permanente)
- **Polygon/Ethereum NÃO** — gas variável, não justifica vs OTS+Arweave

### Exemplo de prova OTS no painel
"Convênio nº 001/2014 firmado por SEPL × Paraná Projetos.
PDF original em https://r2.digdig.com.br/atos/cau-pr/abcd1234.pdf
Hash SHA-256: abcd1234... (verificável)
Prova OpenTimestamps: bitcoin.tx://0xfedc... (registrado em 2026-04-30 14:23 UTC)
Verificável em https://opentimestamps.org/info?hash=abcd1234"

---

## 6. Decisão recomendada

**Curto prazo (próximas 2 semanas):**
1. Continuar metadados-only no scraper (já implementado com `--metadata-only`)
2. Acumular ~250k registros de URL no Postgres (1-2 dias de scrape)
3. Avaliar volume real e decidir se vale R2 ou outro

**Médio prazo (1 mês):**
1. **Migrar pra Cloudflare R2** — abrir conta, setup boto3 no backend
2. Migrar PDFs do CAU/PR pro R2 (~5 GB)
3. Backfill de PDFs do GOV-PR a partir das URLs guardadas

**Longo prazo (3-6 meses):**
1. Integrar **OpenTimestamps** no fluxo de scrape
2. Avaliar Arweave pra docs que viraram denúncia pública
3. Setup CDN proxy via Cloudflare (front bater no R2)

---

## 7. Implementação técnica do R2

### Variáveis de ambiente novas
```bash
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=digdig-atos
R2_PUBLIC_URL=https://r2.digdig.com.br  # custom domain via Cloudflare
```

### Cliente Python (boto3 com endpoint R2)
```python
import boto3
s3 = boto3.client(
    "s3",
    endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
)
s3.upload_file("/tmp/conv.pdf", "digdig-atos", f"atos/{tenant_slug}/{sha256}.pdf")
url = f"{R2_PUBLIC_URL}/atos/{tenant_slug}/{sha256}.pdf"
```

### Migration nova
```sql
ALTER TABLE atos ADD COLUMN sha256 VARCHAR(64);
ALTER TABLE atos ADD COLUMN storage_path TEXT;
ALTER TABLE atos ADD COLUMN opentimestamps_proof_path TEXT;
ALTER TABLE atos ADD COLUMN opentimestamps_confirmed_at TIMESTAMPTZ;
CREATE INDEX idx_atos_sha256 ON atos(sha256);
```

### OpenTimestamps integration
```bash
pip install opentimestamps-client
ots stamp /tmp/conv.pdf  # gera /tmp/conv.pdf.ots
# Em 24-48h: ots upgrade /tmp/conv.pdf.ots
# Verificar: ots verify /tmp/conv.pdf.ots
```

---

## 8. Pendências de decisão

- [ ] Aprovação pra abrir conta Cloudflare e configurar R2 ($15/mês primeiros TB)
- [ ] Aprovação pra integrar OpenTimestamps (zero custo, ~2 horas dev)
- [ ] Definir TTL pra PDFs no R2 (manter eterno? rotacionar?)
- [ ] Decisão sobre Arweave seletivo (só após primeiro caso de denúncia formal)
