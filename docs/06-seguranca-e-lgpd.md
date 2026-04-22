# Segurança e LGPD

---

## 1. Modelo de Segurança

### Princípios Base
- **Menor privilégio:** cada componente acessa apenas o que precisa
- **Defesa em profundidade:** múltiplas camadas de proteção
- **Zero trust:** validar sempre, não confiar em origem
- **Privacy by design:** dados de usuários mínimos e protegidos

---

## 2. Autenticação e Autorização

### 2.1 Autenticação (Supabase Auth)
- Login com email + senha (bcrypt, rounds=12)
- JWT com expiração de 1 hora, refresh token de 7 dias
- Verificação de email obrigatória para ativar conta
- Rate limit: máximo 5 tentativas de login em 5 minutos → bloqueio temporário de 15 minutos

```python
# Validação do JWT em cada request no FastAPI
from fastapi import Depends, HTTPException
from supabase import create_client

async def get_current_user(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        user = supabase.auth.get_user(token)
        if not user:
            raise HTTPException(status_code=401)
        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")
```

### 2.2 Autorização por Plano

```python
def verificar_acesso_orgao(user_id: str, tenant_slug: str, db: Session):
    user = db.query(User).get(user_id)
    plano = user.plano
    
    if plano.nome == "free":
        # Free só acessa o primeiro órgão disponível (read-only)
        primeiro_orgao = db.query(Tenant).filter_by(status="active").first()
        if tenant_slug != primeiro_orgao.slug:
            raise HTTPException(403, "Plano insuficiente")
    
    # Pro e Enterprise: acesso a todos os órgãos ativos
```

### 2.3 Roles
| Role | Quem tem | Permissões |
|------|----------|-----------|
| `anon` | Visitantes | Landing page, listagem pública de órgãos |
| `authenticated` | Usuários com conta | Dashboard conforme plano |
| `admin` | Equipe interna | Painel admin completo, disparar análises |

---

## 3. Segurança da API

### 3.1 Rate Limiting
Implementado com Redis:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/orgaos/{slug}/atos")
@limiter.limit("100/minute")
async def listar_atos(slug: str, ...):
    ...
```

Limites:
- Endpoints públicos: 30 req/minuto por IP
- Usuário autenticado Free: 60 req/hora
- Usuário Pro/Enterprise: 1000 req/hora
- Auth endpoints: 10 req/minuto (proteção a brute force)
- Admin endpoints: 20 req/minuto

### 3.2 Validação de Input
Toda entrada de dados é validada via Pydantic antes de tocar o banco:

```python
class FiltroAtos(BaseModel):
    tipo: Optional[Literal["portaria", "deliberacao", "portaria_normativa"]] = None
    nivel: Optional[Literal["vermelho", "laranja", "amarelo", "verde"]] = None
    de: Optional[date] = None
    ate: Optional[date] = None
    busca: Optional[str] = Field(None, max_length=200)
    page: int = Field(1, ge=1)
    limit: int = Field(50, ge=1, le=200)
```

### 3.3 Proteção contra SQL Injection
- ORM SQLAlchemy com queries parametrizadas — nunca string interpolation
- Full-text search usa `to_tsvector()` do PostgreSQL, não LIKE com input do usuário

```python
# ERRADO — jamais fazer isso
query = f"SELECT * FROM atos WHERE ementa LIKE '%{busca}%'"

# CORRETO — sempre assim
atos = db.query(Ato).filter(
    func.to_tsvector("portuguese", Ato.ementa).op("@@")(
        func.plainto_tsquery("portuguese", busca)
    )
)
```

### 3.4 Proteção contra XSS
- Frontend Next.js usa React que escapa HTML por padrão
- Conteúdo de PDFs exibido como texto puro, nunca `dangerouslySetInnerHTML`
- Relatórios HTML gerados pelo backend usam templates com escape automático (Jinja2)
- Content Security Policy configurada no Lovable:

```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline'; 
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.digdig.com.br https://*.supabase.co;
```

### 3.5 HTTPS Obrigatório
- Lovable (frontend): HTTPS com renovação automática de certificado
- Railway (backend): HTTPS com Let's Encrypt
- Supabase: HTTPS nativo
- Nenhuma comunicação em HTTP permitida em produção

### 3.6 CORS
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://digdig.com.br", "https://www.digdig.com.br"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)
```

### 3.7 Secrets e Variáveis de Ambiente
Nunca em código — sempre em variáveis de ambiente:

```env
# Backend (Railway)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...       # service_role (nunca exposta ao frontend)
ANTHROPIC_API_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
REDIS_URL=redis://...
RESEND_API_KEY=...
SENTRY_DSN=...

# Frontend (Lovable) — apenas públicas
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...  # anon key (pública, sem permissões admin)
VITE_API_URL=...
VITE_STRIPE_PK=...
```

---

## 4. Segurança dos Dados

### 4.1 Row Level Security (RLS) — Supabase/PostgreSQL

```sql
-- Usuários só leem dados de órgãos aos quais têm acesso
CREATE POLICY "user_reads_own_tenants" ON atos
    FOR SELECT TO authenticated
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenant_acesso
            WHERE user_id = auth.uid()
        )
    );

-- Plano Free: acesso somente leitura ao primeiro órgão ativo
CREATE POLICY "free_readonly_first_tenant" ON atos
    FOR SELECT TO authenticated
    USING (
        -- lógica de plano implementada no backend, não no RLS diretamente
        -- RLS garante que backend com service_role é necessário para writes
        TRUE  -- select liberado, controle no backend
    );

-- Writes nunca passam pelo frontend — só via service_role do backend
```

### 4.2 PDFs no Supabase Storage

```
Buckets:
  pdfs-publicos/    → leitura pública (PDFs já públicos no site do órgão)
  relatorios/       → leitura autenticada por tenant
  relatorios-admin/ → acesso apenas admin
```

URLs assinadas com expiração para downloads:
```python
url = supabase.storage.from_("relatorios").create_signed_url(
    path=relatorio.arquivo_path,
    expires_in=3600  # 1 hora
)
```

### 4.3 Dados da Claude API
- Textos dos PDFs são enviados à Anthropic para análise
- Os PDFs são documentos públicos (site do órgão) — sem dados pessoais sensíveis
- Não enviamos dados de usuários da plataforma à API
- Anthropic's data retention policy: dados não usados para treino se `anthropic-beta: no-training`

```python
client.messages.create(
    ...,
    extra_headers={"anthropic-beta": "no-training"}  # opt-out de treino
)
```

---

## 5. LGPD — Lei Geral de Proteção de Dados

### 5.1 Dados Coletados dos Usuários

| Dado | Finalidade | Base Legal | Retenção |
|------|-----------|-----------|----------|
| Email | Autenticação, comunicação | Contrato | Enquanto conta ativa |
| Nome | Personalização | Legítimo interesse | Enquanto conta ativa |
| Dados de billing | Processamento pagamento | Contrato | 5 anos (fiscal) |
| IP de acesso | Segurança, rate limiting | Legítimo interesse | 90 dias |
| Logs de uso | Debug, melhoria do produto | Legítimo interesse | 30 dias |

**Dados que NÃO coletamos:** CPF, endereço físico, dados biométricos, raça, religião.

### 5.2 Dados Processados (Atos Públicos)

Os nomes de pessoas que aparecem nos atos administrativos (servidores, conselheiros) são **dados públicos** — publicados pelo próprio órgão em diário oficial ou site institucional. Seu processamento é amparado por:
- **Art. 7º, II, LGPD:** cumprimento de obrigação legal (transparência pública)
- **Art. 7º, III, LGPD:** exercício de políticas públicas
- **Art. 7º, IX, LGPD:** legítimo interesse (interesse público, jornalismo, controle social)

**Agentes públicos no exercício da função** não têm expectativa de privacidade sobre seus atos funcionais (STF RE 1.010.606 e jurisprudência consolidada).

### 5.3 Direitos dos Titulares (Usuários da Plataforma)

Implementados no painel de Configurações:
- **Acesso:** visualizar todos os dados armazenados
- **Correção:** editar nome e email
- **Exclusão:** deletar conta e todos os dados pessoais
- **Portabilidade:** exportar dados em JSON
- **Revogação:** cancelar assinatura e marketing

```python
@router.delete("/configuracoes/minha-conta")
async def deletar_conta(user: User = Depends(get_current_user), db: Session = Depends()):
    # 1. Cancelar assinatura no Stripe
    cancelar_stripe(user.stripe_customer_id)
    # 2. Deletar dados pessoais (não os de análise — esses são dados públicos)
    db.query(User).filter_by(id=user.id).delete()
    # 3. Invalidar sessão no Supabase Auth
    supabase.auth.admin.delete_user(user.id)
    # 4. Anonimizar logs de uso
    anonimizar_logs(user.id)
```

### 5.4 Política de Privacidade
Deve conter (documento legal separado):
- Quem somos e como contatar (encarregado DPO)
- Quais dados coletamos e por quê
- Como protegemos os dados
- Quanto tempo guardamos
- Com quem compartilhamos (Supabase, Stripe, Resend, Anthropic, Sentry)
- Como exercer seus direitos

### 5.5 Cookies e Consentimento
- Cookie de sessão (necessário): sem consentimento
- Analytics (Google/Plausible): consentimento explícito via banner
- Marketing: opt-in explícito

---

## 6. Monitoramento e Resposta a Incidentes

### 6.1 O que Monitoramos
- Erros 4xx/5xx por endpoint (Sentry)
- Tentativas de login com falha (alertar se > 10/min por IP)
- Uso anormal de API (volume muito acima da média)
- Mudanças em usuários admin (log auditável)
- Custo da API Claude (alertar se > $20/rodada)

### 6.2 Plano de Resposta a Incidentes

| Incidente | Resposta | Prazo |
|-----------|----------|-------|
| Vazamento de dados de usuários | Notificar ANPD + usuários afetados | 72h |
| Acesso não autorizado | Revogar tokens, investigar, corrigir | Imediato |
| DDoS | Cloudflare + rate limiting + bloquear IPs | < 30 min |
| Chave de API comprometida | Revogar e substituir | Imediato |

### 6.3 Auditoria de Acesso Admin
Todas as ações admin são logadas:

```python
def log_admin_action(user_id: str, action: str, resource: str, details: dict):
    AdminLog.create(
        user_id=user_id,
        action=action,       # 'disparar_rodada', 'adicionar_orgao', etc.
        resource=resource,   # 'tenant:cau-pr', 'rodada:uuid', etc.
        details=details,
        ip=get_client_ip(),
        criado_em=datetime.now()
    )
```

---

## 7. Segurança do Scraper

Os PDFs baixados são documentos públicos, mas o scraper deve ser responsável:

```python
SCRAPER_HEADERS = {
    "User-Agent": "Dig Dig/1.0 (+https://digdig.com.br/bot)",
    "Accept": "application/pdf,text/html"
}

# Rate limiting respeitoso: 1-2 segundos entre requests ao mesmo domínio
# Retry com backoff exponencial
# Não fazer mais de 5 requests simultâneos ao mesmo domínio
# Respeitar robots.txt

import time
def baixar_com_respeito(url: str):
    time.sleep(1.5)  # mínimo entre requests
    return httpx.get(url, headers=SCRAPER_HEADERS, timeout=30)
```

---

## 8. Checklist de Segurança (pré-lançamento)

### Backend
- [ ] Todas as rotas protegidas validam JWT
- [ ] RLS ativo em todas as tabelas com tenant_id
- [ ] Nenhuma secret em código ou repositório
- [ ] CORS configurado apenas para domínio de produção
- [ ] Rate limiting ativo
- [ ] Validação Pydantic em todos os endpoints
- [ ] Logs de erros sem dados sensíveis (sem senhas, tokens)
- [ ] Dependências atualizadas (pip-audit sem vulnerabilidades)

### Frontend
- [ ] Nenhuma chave secreta no código cliente
- [ ] CSP configurada no Lovable
- [ ] Supabase anon key usada no cliente (sem service_role)
- [ ] Formulários com proteção CSRF
- [ ] Sanitização de conteúdo exibido (sem dangerouslySetInnerHTML com input de usuário)

### Infra
- [ ] Todas as comunicações em HTTPS
- [ ] Banco com backups automáticos diários (Supabase)
- [ ] Redis com senha
- [ ] Monitoramento de erros ativo (Sentry)
- [ ] Alertas de custo API configurados
