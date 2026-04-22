# Estratégia de Testes

**Framework:** pytest (backend) + Vitest/Playwright (frontend)  
**Cobertura mínima alvo:** 80% backend, 70% frontend  
**CI:** GitHub Actions — testes obrigatórios antes de merge

---

## 1. Pirâmide de Testes

```
         ╔══════╗
         ║  E2E ║  5% — fluxos críticos do usuário
         ╚══╤═══╝
        ╔═══╧════╗
        ║ INTEG  ║  25% — API + banco + pipeline IA (mockado)
        ╚═══╤════╝
       ╔════╧═════╗
       ║  UNITÁRIO║  70% — funções, serviços, modelos
       ╚══════════╝
```

---

## 2. Testes Unitários (Backend)

### 2.1 Extração de Texto de PDF

```python
# tests/unit/test_pdf_extractor.py
import pytest
from pathlib import Path
from app.services.pdf_extractor import TextExtractor, ResultadoExtracao

FIXTURES_DIR = Path("tests/fixtures/pdfs")

class TestTextExtractor:
    
    def test_extrai_texto_pdf_nativo(self):
        pdf_bytes = (FIXTURES_DIR / "portaria_678_nativo.pdf").read_bytes()
        extrator = TextExtractor()
        resultado = extrator.extrair(pdf_bytes)
        
        assert resultado.metodo == "native"
        assert resultado.qualidade == "boa"
        assert "PORTARIA PRESIDENCIAL" in resultado.texto
        assert resultado.paginas >= 1
        assert resultado.tokens_estimados > 0
    
    def test_fallback_ocr_para_pdf_escaneado(self):
        pdf_bytes = (FIXTURES_DIR / "portaria_escaneada.pdf").read_bytes()
        extrator = TextExtractor()
        resultado = extrator.extrair(pdf_bytes)
        
        assert resultado.metodo == "ocr"
        assert resultado.texto != ""
    
    def test_normaliza_encoding_corrompido(self):
        extrator = TextExtractor()
        texto_corrompido = "Comissão Processante Ã§ Ã£o"
        normalizado = extrator._normalizar(texto_corrompido)
        
        assert "ç" in normalizado or "ã" in normalizado
    
    def test_pdf_protegido_retorna_falhou(self):
        pdf_bytes = (FIXTURES_DIR / "pdf_com_senha.pdf").read_bytes()
        extrator = TextExtractor()
        resultado = extrator.extrair(pdf_bytes)
        
        assert resultado.metodo == "falhou"
        assert resultado.qualidade == "ruim"
    
    def test_pdf_muito_grande_extrai_parcial(self):
        # PDF simulado > 10MB
        pdf_grande = b"%PDF" + b"x" * (11 * 1024 * 1024)
        extrator = TextExtractor()
        # Não deve lançar exceção, deve retornar parcial
        resultado = extrator.extrair(pdf_grande)
        assert resultado.qualidade in ["parcial", "ruim"]


### 2.2 Normalização de Nomes de Pessoas

```python
# tests/unit/test_grafo_pessoas.py
from app.services.grafo_pessoas import NormalizadorNomes

class TestNormalizadorNomes:
    
    def test_normaliza_nome_completo(self):
        n = NormalizadorNomes()
        assert n.normalizar("JOÃO DA SILVA SANTOS") == "João da Silva Santos"
    
    def test_detecta_variantes_do_mesmo_nome(self):
        n = NormalizadorNomes()
        assert n.sao_a_mesma_pessoa("João Silva", "João da Silva Santos") == True
        assert n.sao_a_mesma_pessoa("Maria Costa", "José Pereira") == False
    
    def test_ignora_titulos_e_cargos(self):
        n = NormalizadorNomes()
        # "Dr. João Silva" e "João Silva" são a mesma pessoa
        assert n.normalizar("Dr. João Silva") == "João Silva"
        assert n.normalizar("Arq. Maria Costa") == "Maria Costa"


### 2.3 Detecção de Padrões por Regras

```python
# tests/unit/test_regras.py
from app.services.regras import MotorRegras

class TestMotorRegras:
    
    def test_detecta_ad_referendum(self):
        motor = MotorRegras(tenant_id="cau-pr")
        ato = {"ementa": "Aprovação ad referendum do Plenário praticado pelo Presidente"}
        
        alertas = motor.analisar_rapido(ato)
        
        assert any("ad_referendum" in a["tipo"] for a in alertas)
        assert motor.nivel_alerta(alertas) in ["amarelo", "laranja"]
    
    def test_detecta_prorrogacao_multipla(self):
        motor = MotorRegras(tenant_id="cau-pr")
        ato = {"ementa": "Prorroga o prazo da Comissão Processante reconduzida"}
        
        alertas = motor.analisar_rapido(ato)
        assert any("prazo_excessivo" in a["tipo"] for a in alertas)
    
    def test_ato_conforme_retorna_verde(self):
        motor = MotorRegras(tenant_id="cau-pr")
        ato = {"ementa": "Designa gestor e fiscal do contrato 01/2026"}
        
        alertas = motor.analisar_rapido(ato)
        assert motor.nivel_alerta(alertas) == "verde"
    
    def test_palavras_chave_case_insensitive(self):
        motor = MotorRegras(tenant_id="cau-pr")
        ato_upper = {"ementa": "AD REFERENDUM DO PLENÁRIO"}
        ato_lower = {"ementa": "ad referendum do plenário"}
        
        alertas_upper = motor.analisar_rapido(ato_upper)
        alertas_lower = motor.analisar_rapido(ato_lower)
        
        assert len(alertas_upper) == len(alertas_lower)


### 2.4 Modelos e Schema Pydantic

```python
# tests/unit/test_schemas.py
import pytest
from pydantic import ValidationError
from app.schemas import FiltroAtos, CriarTenant

class TestSchemas:
    
    def test_filtro_atos_valido(self):
        filtro = FiltroAtos(tipo="portaria", nivel="vermelho", limit=50)
        assert filtro.tipo == "portaria"
    
    def test_filtro_rejeita_tipo_invalido(self):
        with pytest.raises(ValidationError):
            FiltroAtos(tipo="tipo_inexistente")
    
    def test_filtro_limit_maximo(self):
        with pytest.raises(ValidationError):
            FiltroAtos(limit=201)  # máximo é 200
    
    def test_busca_max_length(self):
        with pytest.raises(ValidationError):
            FiltroAtos(busca="x" * 201)  # máximo 200 chars
    
    def test_criar_tenant_slug_normalizado(self):
        tenant = CriarTenant(
            slug="CAU PR",  # deve normalizar para "cau-pr"
            nome="CAU/PR",
            nome_completo="Conselho de Arquitetura e Urbanismo do PR",
            estado="PR"
        )
        assert tenant.slug == "cau-pr"


---

## 3. Testes de Integração (Backend)

### 3.1 Setup

```python
# tests/conftest.py
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.main import app
from fastapi.testclient import TestClient

@pytest.fixture(scope="session")
def db_engine():
    engine = create_engine("postgresql://test:test@localhost:5433/auditapublico_test")
    Base.metadata.create_all(engine)
    yield engine
    Base.metadata.drop_all(engine)

@pytest.fixture
def db(db_engine):
    Session = sessionmaker(bind=db_engine)
    session = Session()
    yield session
    session.rollback()
    session.close()

@pytest.fixture
def client(db):
    with TestClient(app) as c:
        yield c

@pytest.fixture
def token_free(client, db):
    # Criar usuário free e retornar token
    return criar_usuario_e_token(client, plano="free")

@pytest.fixture
def token_pro(client, db):
    return criar_usuario_e_token(client, plano="pro")
```

### 3.2 API — Autenticação

```python
# tests/integration/test_auth.py
class TestAuth:
    
    def test_signup_cria_usuario(self, client):
        resp = client.post("/auth/signup", json={
            "email": "teste@exemplo.com",
            "nome": "Usuário Teste",
            "senha": "senha_segura_123"
        })
        assert resp.status_code == 201
        assert resp.json()["email"] == "teste@exemplo.com"
    
    def test_login_retorna_token(self, client):
        resp = client.post("/auth/login", json={
            "email": "teste@exemplo.com",
            "senha": "senha_segura_123"
        })
        assert resp.status_code == 200
        assert "access_token" in resp.json()
    
    def test_login_senha_errada_retorna_401(self, client):
        resp = client.post("/auth/login", json={
            "email": "teste@exemplo.com",
            "senha": "senha_errada"
        })
        assert resp.status_code == 401
    
    def test_rota_protegida_sem_token_retorna_401(self, client):
        resp = client.get("/orgaos/cau-pr/atos")
        assert resp.status_code == 401


### 3.3 API — Acesso por Plano

```python
# tests/integration/test_planos.py
class TestAcessoPorPlano:
    
    def test_free_acessa_primeiro_orgao(self, client, token_free, db):
        resp = client.get("/orgaos/cau-pr/atos",
                         headers={"Authorization": f"Bearer {token_free}"})
        assert resp.status_code == 200
    
    def test_free_nao_acessa_orgao_premium(self, client, token_free, db):
        # Criar segundo órgão
        criar_tenant(db, slug="camara-curitiba", status="active")
        
        resp = client.get("/orgaos/camara-curitiba/atos",
                         headers={"Authorization": f"Bearer {token_free}"})
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "PLANO_INSUFICIENTE"
    
    def test_pro_acessa_todos_orgaos(self, client, token_pro, db):
        criar_tenant(db, slug="camara-curitiba", status="active")
        
        resp = client.get("/orgaos/camara-curitiba/atos",
                         headers={"Authorization": f"Bearer {token_pro}"})
        assert resp.status_code == 200


### 3.4 API — Filtros e Paginação

```python
# tests/integration/test_atos.py
class TestListarAtos:
    
    def test_filtra_por_nivel(self, client, token_pro, db):
        criar_atos_de_teste(db, tenant_id="cau-pr", niveis=["vermelho", "verde", "amarelo"])
        
        resp = client.get("/orgaos/cau-pr/atos?nivel=vermelho",
                         headers={"Authorization": f"Bearer {token_pro}"})
        
        data = resp.json()["data"]
        assert all(a["nivel_alerta"] == "vermelho" for a in data)
    
    def test_paginacao_funciona(self, client, token_pro, db):
        criar_atos_de_teste(db, tenant_id="cau-pr", quantidade=60)
        
        resp_p1 = client.get("/orgaos/cau-pr/atos?page=1&limit=50", ...)
        resp_p2 = client.get("/orgaos/cau-pr/atos?page=2&limit=50", ...)
        
        assert len(resp_p1.json()["data"]) == 50
        assert len(resp_p2.json()["data"]) == 10
    
    def test_busca_fulltext(self, client, token_pro, db):
        criar_ato(db, ementa="Prorroga comissão processante muito específica")
        
        resp = client.get("/orgaos/cau-pr/atos?busca=processante",
                         headers={"Authorization": f"Bearer {token_pro}"})
        
        assert any("processante" in a["ementa"].lower() for a in resp.json()["data"])
    
    def test_busca_sql_injection_seguro(self, client, token_pro):
        # Tentar SQL injection no campo de busca
        resp = client.get("/orgaos/cau-pr/atos?busca='; DROP TABLE atos; --",
                         headers={"Authorization": f"Bearer {token_pro}"})
        # Deve retornar 200 com resultados vazios, não explodir
        assert resp.status_code == 200


### 3.5 Pipeline IA (com API mockada)

```python
# tests/integration/test_pipeline_ia.py
from unittest.mock import patch, MagicMock

class TestPipelineHaiku:
    
    @patch("app.services.ai_pipeline.anthropic.Anthropic")
    def test_haiku_classifica_ato_vermelho(self, mock_anthropic, db):
        # Mock da resposta da API
        mock_response = MagicMock()
        mock_response.content[0].text = json.dumps({
            "nivel_alerta": "vermelho",
            "score_risco": 90,
            "irregularidades": [{"tipo": "perseguicao_politica", "gravidade": "critica"}],
            "pessoas_extraidas": [{"nome": "João Silva", "tipo_aparicao": "processado"}],
            "requer_aprofundamento": True
        })
        mock_response.usage.input_tokens = 500
        mock_response.usage.output_tokens = 200
        mock_anthropic.return_value.messages.create.return_value = mock_response
        
        ato = criar_ato_de_teste(db, ementa="Prorroga comissão processante contra opositor")
        
        from app.services.ai_pipeline import analisar_lote_haiku
        analisar_lote_haiku([ato.id], "cau-pr")
        
        analise = Analise.get_by_ato(ato.id)
        assert analise.nivel_alerta == "vermelho"
        assert analise.analisado_por_haiku == True
    
    @patch("app.services.ai_pipeline.anthropic.Anthropic")
    def test_sonnet_so_processa_criticos(self, mock_anthropic, db):
        # Criar atos com diferentes níveis
        ato_vermelho = criar_ato_com_analise(db, nivel="vermelho")
        ato_verde = criar_ato_com_analise(db, nivel="verde")
        
        from app.workers.tasks_analise import processar_criticos_sonnet
        processar_criticos_sonnet("cau-pr", "rodada-uuid")
        
        # Sonnet deve ter sido chamado só para o vermelho
        calls = mock_anthropic.return_value.messages.create.call_args_list
        atos_processados = [c for c in calls]
        
        analise_verde = Analise.get_by_ato(ato_verde.id)
        assert analise_verde.analisado_por_sonnet == False


---

## 4. Testes E2E (Playwright)

```typescript
// tests/e2e/fluxo-completo.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Fluxo do usuário Pro", () => {
  test("Visualiza dashboard do CAU-PR e exporta ficha", async ({ page }) => {
    // Login
    await page.goto("/login");
    await page.fill('[data-testid="email"]', "usuario_pro@teste.com");
    await page.fill('[data-testid="senha"]', "senha_teste_123");
    await page.click('[data-testid="btn-login"]');

    // Dashboard
    await expect(page).toHaveURL("/app");
    await expect(page.locator('[data-testid="card-cau-pr"]')).toBeVisible();

    // Acessar CAU-PR
    await page.click('[data-testid="card-cau-pr"]');
    await expect(page).toHaveURL("/app/cau-pr");
    await expect(page.locator('[data-testid="kpi-vermelho"]')).toBeVisible();

    // Filtrar por nível vermelho
    await page.click('[data-testid="filtro-vermelho"]');
    const atos = page.locator('[data-testid="ato-card"]');
    await expect(atos.first()).toBeVisible();

    // Abrir detalhe e exportar ficha
    await atos.first().click();
    await page.click('[data-testid="btn-ficha-denuncia"]');
    await expect(page.locator('[data-testid="ficha-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="ficha-titulo"]')).not.toBeEmpty();
  });

  test("Usuário Free não acessa segundo órgão", async ({ page }) => {
    await fazerLogin(page, "usuario_free@teste.com", "senha");

    await page.goto("/app/camara-curitiba");

    await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
    await expect(page).not.toHaveURL("/app/camara-curitiba/atos");
  });
});

test.describe("Billing", () => {
  test("Upgrade de Free para Pro redireciona para Stripe", async ({ page }) => {
    await fazerLogin(page, "usuario_free@teste.com", "senha");

    await page.goto("/planos");
    await page.click('[data-testid="btn-assinar-pro"]');

    // Deve redirecionar para Stripe Checkout
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });
});
```

---

## 5. Testes de Segurança

```python
# tests/security/test_tenant_isolation.py
class TestIsolamentoDeTenants:
    
    def test_usuario_nao_ve_dados_de_outro_tenant(self, client, db):
        # Usuário A tem acesso ao CAU-PR
        token_a = criar_usuario_com_acesso(db, tenant="cau-pr")
        # Usuário B tem acesso à Câmara
        token_b = criar_usuario_com_acesso(db, tenant="camara-curitiba")
        
        # Criar ato no CAU-PR
        ato = criar_ato(db, tenant_id="cau-pr")
        
        # Usuário B não deve conseguir ver o ato do CAU-PR
        resp = client.get(f"/orgaos/cau-pr/atos/{ato.id}",
                         headers={"Authorization": f"Bearer {token_b}"})
        assert resp.status_code in [403, 404]
    
    def test_sql_injection_em_busca(self, client, token_pro):
        payloads = [
            "'; DROP TABLE atos; --",
            "' OR '1'='1",
            "'; SELECT * FROM users; --",
            "<script>alert(1)</script>",
        ]
        for payload in payloads:
            resp = client.get(f"/orgaos/cau-pr/atos?busca={payload}",
                             headers={"Authorization": f"Bearer {token_pro}"})
            assert resp.status_code in [200, 422]  # nunca 500
    
    def test_acesso_admin_sem_role_negado(self, client, token_pro):
        resp = client.post("/admin/orgaos",
                          headers={"Authorization": f"Bearer {token_pro}"},
                          json={"slug": "novo-orgao"})
        assert resp.status_code == 403
    
    def test_rate_limit_auth_endpoint(self, client):
        for i in range(11):
            resp = client.post("/auth/login", json={
                "email": "ataque@brute.force",
                "senha": f"tentativa_{i}"
            })
        # Na 11ª tentativa deve retornar 429
        assert resp.status_code == 429
```

---

## 6. Testes de Performance

```python
# tests/performance/test_queries.py
import time

class TestPerformanceQueries:
    
    def test_listar_atos_com_filtros_abaixo_de_200ms(self, client, token_pro, db):
        # Popular banco com 5000 atos
        criar_atos_em_massa(db, quantidade=5000, tenant_id="cau-pr")
        
        inicio = time.time()
        resp = client.get("/orgaos/cau-pr/atos?nivel=vermelho&limit=50",
                         headers={"Authorization": f"Bearer {token_pro}"})
        duracao = time.time() - inicio
        
        assert resp.status_code == 200
        assert duracao < 0.2  # 200ms máximo
    
    def test_busca_fulltext_abaixo_de_500ms(self, client, token_pro, db):
        criar_atos_em_massa(db, quantidade=5000, tenant_id="cau-pr")
        
        inicio = time.time()
        resp = client.get("/orgaos/cau-pr/atos?busca=comissão processante",
                         headers={"Authorization": f"Bearer {token_pro}"})
        duracao = time.time() - inicio
        
        assert duracao < 0.5  # 500ms máximo
```

---

## 7. Fixtures de Teste

```
tests/
├── fixtures/
│   ├── pdfs/
│   │   ├── portaria_678_nativo.pdf      → PDF com texto nativo
│   │   ├── portaria_escaneada.pdf       → PDF escaneado (sem texto)
│   │   ├── pdf_com_senha.pdf            → PDF protegido
│   │   └── pdf_grande.pdf              → PDF > 10MB (gerado pelo fixture)
│   ├── jsons/
│   │   ├── portarias_amostra.json       → 10 portarias de teste
│   │   └── deliberacoes_amostra.json    → 10 deliberações de teste
│   └── respostas_ia/
│       ├── haiku_vermelho.json          → resposta mock Haiku — caso crítico
│       ├── haiku_verde.json             → resposta mock Haiku — caso conforme
│       └── sonnet_aprofundamento.json   → resposta mock Sonnet
```

---

## 8. CI/CD — GitHub Actions

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: auditapublico_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ["5433:5432"]
      redis:
        image: redis:7
        ports: ["6379:6379"]
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: "3.12" }
      - run: pip install -r backend/requirements-dev.txt
      - run: pytest backend/tests/ -v --cov=app --cov-report=xml --cov-fail-under=80
      - run: pip-audit  # checar vulnerabilidades
  
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20" }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test
      - run: cd frontend && npm run type-check
      - run: cd frontend && npm run lint
  
  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    steps:
      - uses: actions/checkout@v4
      - run: docker-compose -f docker-compose.test.yml up -d
      - run: cd frontend && npx playwright test
```
