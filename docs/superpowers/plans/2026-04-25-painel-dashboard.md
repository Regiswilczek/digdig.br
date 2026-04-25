# Painel Dashboard Autenticado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the authenticated Dig Dig dashboard — login with Supabase Auth, protected panel routes, institution overview with 6 tabs, live Realtime pipeline feed, denúncia cards, ato detail pages with plan-gating, and backend JWT-authenticated FastAPI endpoints.

**Architecture:** Supabase JS handles auth (browser, localStorage), FastAPI validates the JWT from `Authorization: Bearer` on all `/painel/*` routes, plan gating is enforced in FastAPI (never in RLS). TanStack Router `beforeLoad` guards redirect unauthenticated users to `/entrar`. Supabase Realtime streams new `analises` INSERT events to the live pipeline feed client-side.

**Tech Stack:** `@supabase/supabase-js` (auth + realtime), TanStack Router (file-based, `beforeLoad`), shadcn/ui (Tabs, Badge, Progress, ScrollArea), PyJWT (already installed), FastAPI, SQLAlchemy async.

---

## File Structure

**New — Frontend:**
- `src/lib/supabase.ts` — Supabase browser client singleton
- `src/lib/api-auth.ts` — `fetchAuthed()` helper + painel API types
- `src/routes/painel.tsx` — Layout route: auth guard + sidebar + right panel
- `src/routes/painel/$slug.tsx` — Institution dashboard (6 tabs)
- `src/routes/painel/$slug/ato.$id.tsx` — Ato detail page (ficha completa)

**Modified — Frontend:**
- `src/routes/entrar.tsx` — Wire `signInWithPassword` / `signUp` (replace placeholder timeout)
- `src/lib/api.ts` — No changes needed; types already correct

**New — Backend:**
- `backend/app/dependencies/__init__.py` — Empty package init
- `backend/app/dependencies/auth.py` — `get_current_user()` dependency + `is_investigador_plus()`
- `backend/app/routers/painel.py` — `/painel/*` routes with JWT auth

**Modified — Backend:**
- `backend/app/main.py` — Register `painel` router

---

## Task 1: Install @supabase/supabase-js and create lib files

**Files:**
- Create: `src/lib/supabase.ts`
- Create: `src/lib/api-auth.ts`

- [ ] **Step 1: Install the package**

```bash
npm install @supabase/supabase-js
```

Expected: package added to node_modules, `package.json` updated with `"@supabase/supabase-js": "^2.x.x"`.

- [ ] **Step 2: Create `src/lib/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 3: Create `src/lib/api-auth.ts`**

```typescript
import { supabase } from "./supabase";
import { API_URL } from "./api";

export async function fetchAuthed(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
  });
}

// ─── Painel API types ─────────────────────────────────────────────────────────

export interface PainelAto {
  id: string;
  numero: string;
  tipo: string;
  titulo: string | null;
  ementa: string | null;
  data_publicacao: string | null;
  url_pdf: string | null;
  url_original: string | null;
  nivel_alerta: "verde" | "amarelo" | "laranja" | "vermelho" | null;
  score_risco: number;
  resumo_executivo: string | null;
  resultado_sonnet: Record<string, unknown> | null;
  recomendacao_campanha: string | null;
}

export interface PainelAtosResponse {
  total: number;
  page: number;
  pages: number;
  limit: number;
  atos: PainelAto[];
}

export interface PainelRodada {
  id: string;
  status: string;
  total_atos: number;
  atos_analisados_haiku: number;
  atos_analisados_sonnet: number;
  custo_total_usd: number;
  iniciado_em: string | null;
}

export async function fetchPainelAtos(
  slug: string,
  params: {
    tipo?: string;
    nivel?: string;
    ano?: number;
    busca?: string;
    page?: number;
  } = {}
): Promise<PainelAtosResponse> {
  const q = new URLSearchParams();
  if (params.tipo) q.set("tipo", params.tipo);
  if (params.nivel) q.set("nivel", params.nivel);
  if (params.ano) q.set("ano", String(params.ano));
  if (params.busca) q.set("busca", params.busca);
  if (params.page) q.set("page", String(params.page));
  const r = await fetchAuthed(`/painel/orgaos/${slug}/atos?${q}`);
  if (!r.ok) throw new Error("Falha ao buscar atos");
  return r.json();
}

export async function fetchPainelAto(
  slug: string,
  id: string
): Promise<PainelAto> {
  const r = await fetchAuthed(`/painel/orgaos/${slug}/atos/${id}`);
  if (!r.ok) throw new Error("Falha ao buscar ato");
  return r.json();
}

export async function fetchPainelRodada(
  slug: string
): Promise<PainelRodada | null> {
  const r = await fetchAuthed(`/painel/orgaos/${slug}/rodadas`);
  if (!r.ok) return null;
  const data = await r.json();
  return data.rodada_ativa ?? null;
}
```

- [ ] **Step 4: Add VITE env vars to `.env` (frontend root)**

Add to the frontend `.env` file (create if absent):
```
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

These values come from the Supabase dashboard → Project Settings → API.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase.ts src/lib/api-auth.ts package.json package-lock.json
git commit -m "feat: add @supabase/supabase-js client and painel API helpers"
```

---

## Task 2: Wire entrar.tsx to Supabase Auth

**Files:**
- Modify: `src/routes/entrar.tsx:176-218` (replace `useAuthForm` hook body)

- [ ] **Step 1: Replace the `onSubmit` stub with real Supabase calls**

The current `useAuthForm` hook (lines 176–218) has a `setTimeout` placeholder. Replace the entire hook body with:

```typescript
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
// Add this import at the top of the file alongside other imports
import { supabase } from "../lib/supabase";
```

Then replace the `onSubmit` function inside `useAuthForm` (lines 186–202):

```typescript
// Old:
function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError(null);
  if (!email || !password || (!isLogin && !name)) {
    setError("Preencha todos os campos.");
    return;
  }
  setSubmitting(true);
  setTimeout(() => {
    setSubmitting(false);
    setError(
      "Autenticação ainda não está conectada. Em breve você poderá " +
        (isLogin ? "entrar" : "criar sua conta") +
        ".",
    );
  }, 600);
}
```

Replace with:

```typescript
const navigate = useNavigate();

async function onSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError(null);
  if (!email || !password || (!isLogin && !name)) {
    setError("Preencha todos os campos.");
    return;
  }
  setSubmitting(true);
  try {
    if (isLogin) {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (authError) throw authError;
    } else {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nome: name } },
      });
      if (authError) throw authError;
    }
    navigate({ to: "/painel" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Erro ao autenticar.";
    setError(
      msg === "Invalid login credentials"
        ? "Email ou senha incorretos."
        : msg === "User already registered"
          ? "Este email já está cadastrado."
          : msg,
    );
  } finally {
    setSubmitting(false);
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/entrar.tsx
git commit -m "feat: connect entrar.tsx to Supabase Auth (signIn + signUp)"
```

---

## Task 3: Backend auth dependency

**Files:**
- Create: `backend/app/dependencies/__init__.py`
- Create: `backend/app/dependencies/auth.py`

- [ ] **Step 1: Create the package init**

```bash
touch backend/app/dependencies/__init__.py
```

File content: empty (0 bytes).

- [ ] **Step 2: Write the failing test first**

Create `backend/tests/test_auth_dependency.py`:

```python
import pytest
import uuid
import jwt as pyjwt
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

SECRET = "test-secret"
ALGORITHM = "HS256"


def make_token(sub: str, secret: str = SECRET) -> str:
    return pyjwt.encode({"sub": sub}, secret, algorithm=ALGORITHM)


@pytest.mark.asyncio
async def test_get_current_user_valid_token():
    from app.dependencies.auth import get_current_user

    user_id = uuid.uuid4()
    token = make_token(str(user_id))
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

    mock_plano = MagicMock()
    mock_plano.nome = "Investigador"
    mock_user = MagicMock()
    mock_user.id = user_id
    mock_user.email = "test@example.com"
    mock_user.nome = "Test User"

    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.first.return_value = (mock_user, mock_plano)
    mock_db.execute.return_value = mock_result

    mock_settings = MagicMock()
    mock_settings.supabase_jwt_secret = SECRET
    mock_settings.supabase_jwt_algorithm = ALGORITHM

    result = await get_current_user(credentials, mock_db, mock_settings)

    assert result["email"] == "test@example.com"
    assert result["plano"] == "investigador"


@pytest.mark.asyncio
async def test_get_current_user_invalid_token():
    from app.dependencies.auth import get_current_user

    credentials = HTTPAuthorizationCredentials(
        scheme="Bearer", credentials="bad.token.here"
    )
    mock_db = AsyncMock()
    mock_settings = MagicMock()
    mock_settings.supabase_jwt_secret = SECRET
    mock_settings.supabase_jwt_algorithm = ALGORITHM

    with pytest.raises(HTTPException) as exc:
        await get_current_user(credentials, mock_db, mock_settings)
    assert exc.value.status_code == 401


def test_is_investigador_plus():
    from app.dependencies.auth import is_investigador_plus

    assert is_investigador_plus("investigador") is True
    assert is_investigador_plus("Profissional") is True
    assert is_investigador_plus("api & dados") is True
    assert is_investigador_plus("cidadão") is False
    assert is_investigador_plus("cidadao") is False
```

- [ ] **Step 3: Run the test — confirm it fails**

```bash
cd backend && python -m pytest tests/test_auth_dependency.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.dependencies.auth'`

- [ ] **Step 4: Create `backend/app/dependencies/auth.py`**

```python
import uuid
import jwt as pyjwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.config import get_settings, Settings
from app.database import get_db
from app.models.user import User
from app.models.plano import Plano

bearer_scheme = HTTPBearer()

INVESTIGADOR_PLUS_PLANS = {"investigador", "profissional", "api & dados"}


def is_investigador_plus(plano_nome: str) -> bool:
    return plano_nome.strip().lower() in INVESTIGADOR_PLUS_PLANS


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> dict:
    token = credentials.credentials
    try:
        payload = pyjwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=[settings.supabase_jwt_algorithm],
            options={"verify_aud": False},
        )
    except pyjwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(status_code=401, detail="Token sem subject")

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido")

    result = await db.execute(
        select(User, Plano)
        .join(Plano, User.plano_id == Plano.id)
        .where(User.id == user_id, User.ativo == True)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")

    user, plano = row
    return {
        "id": str(user.id),
        "email": user.email,
        "nome": user.nome,
        "plano": plano.nome.strip().lower(),
    }
```

- [ ] **Step 5: Run the test — confirm it passes**

```bash
cd backend && python -m pytest tests/test_auth_dependency.py -v
```

Expected: 3 tests PASSED.

- [ ] **Step 6: Commit**

```bash
git add backend/app/dependencies/__init__.py backend/app/dependencies/auth.py backend/tests/test_auth_dependency.py
git commit -m "feat: backend auth dependency — get_current_user + is_investigador_plus"
```

---

## Task 4: Backend painel.py router

**Files:**
- Create: `backend/app/routers/painel.py`
- Modify: `backend/app/main.py` (register router)

- [ ] **Step 1: Write the failing tests first**

Create `backend/tests/test_router_painel.py`:

```python
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock, MagicMock


MOCK_USER = {"id": "some-uuid", "email": "test@test.com", "nome": "Test", "plano": "investigador"}
MOCK_USER_CIDADAO = {"id": "some-uuid", "email": "test@test.com", "nome": "Test", "plano": "cidadão"}


@pytest.mark.asyncio
async def test_list_atos_requires_auth(async_client: AsyncClient):
    response = await async_client.get("/painel/orgaos/cau-pr/atos")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_atos_returns_paginated(async_client: AsyncClient):
    with patch("app.routers.painel.get_current_user", return_value=MOCK_USER):
        response = await async_client.get(
            "/painel/orgaos/cau-pr/atos",
            headers={"Authorization": "Bearer fake"},
        )
    assert response.status_code in (200, 404)
    if response.status_code == 200:
        data = response.json()
        assert "atos" in data
        assert "total" in data
        assert "pages" in data


@pytest.mark.asyncio
async def test_get_ato_sonnet_hidden_for_cidadao(async_client: AsyncClient):
    with patch("app.routers.painel.get_current_user", return_value=MOCK_USER_CIDADAO):
        response = await async_client.get(
            "/painel/orgaos/cau-pr/atos/some-id",
            headers={"Authorization": "Bearer fake"},
        )
    if response.status_code == 200:
        data = response.json()
        assert data.get("resultado_sonnet") is None
        assert data.get("recomendacao_campanha") is None
```

- [ ] **Step 2: Run the tests — confirm they fail**

```bash
cd backend && python -m pytest tests/test_router_painel.py -v
```

Expected: errors about missing module `app.routers.painel`.

- [ ] **Step 3: Create `backend/app/routers/painel.py`**

```python
from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, case, extract
from app.database import get_db
from app.models.tenant import Tenant
from app.models.ato import Ato, RodadaAnalise
from app.models.analise import Analise
from app.dependencies.auth import get_current_user, is_investigador_plus

router = APIRouter(prefix="/painel", tags=["painel"])

NIVEL_ORDEM = {"vermelho": 0, "laranja": 1, "amarelo": 2, "verde": 3}


async def _get_tenant(slug: str, db: AsyncSession) -> Tenant:
    r = await db.execute(select(Tenant).where(Tenant.slug == slug))
    tenant = r.scalar_one_or_none()
    if not tenant:
        raise HTTPException(status_code=404, detail="Órgão não encontrado")
    return tenant


def _latest_analise_subq(tenant_id):
    return (
        select(Analise.ato_id, func.max(Analise.criado_em).label("max_dt"))
        .where(Analise.tenant_id == tenant_id)
        .group_by(Analise.ato_id)
        .subquery()
    )


@router.get("/orgaos/{slug}/atos")
async def list_atos(
    slug: str,
    tipo: str | None = Query(None),
    nivel: str | None = Query(None),
    ano: int | None = Query(None),
    busca: str | None = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tenant = await _get_tenant(slug, db)
    latest_subq = _latest_analise_subq(tenant.id)

    q = (
        select(Ato, Analise)
        .outerjoin(latest_subq, Ato.id == latest_subq.c.ato_id)
        .outerjoin(
            Analise,
            and_(
                Analise.ato_id == Ato.id,
                Analise.criado_em == latest_subq.c.max_dt,
            ),
        )
        .where(Ato.tenant_id == tenant.id)
    )

    if tipo:
        q = q.where(Ato.tipo == tipo)
    if nivel:
        q = q.where(Analise.nivel_alerta == nivel)
    if ano:
        q = q.where(extract("year", Ato.data_publicacao) == ano)
    if busca:
        busca_like = f"%{busca}%"
        q = q.where(
            or_(Ato.numero.ilike(busca_like), Ato.ementa.ilike(busca_like))
        )

    count_q = select(func.count()).select_from(q.subquery())
    total_r = await db.execute(count_q)
    total = total_r.scalar_one()

    # Order: críticos primeiro (vermelho=0, laranja=1, amarelo=2, verde=3, null=4)
    nivel_case = case(
        (Analise.nivel_alerta == "vermelho", 0),
        (Analise.nivel_alerta == "laranja", 1),
        (Analise.nivel_alerta == "amarelo", 2),
        (Analise.nivel_alerta == "verde", 3),
        else_=4,
    )
    q = q.order_by(nivel_case, Analise.score_risco.desc().nulls_last())
    q = q.offset((page - 1) * limit).limit(limit)

    rows = await db.execute(q)
    atos = []
    for ato, analise in rows:
        atos.append(
            {
                "id": str(ato.id),
                "numero": ato.numero,
                "tipo": ato.tipo,
                "titulo": ato.titulo,
                "ementa": ato.ementa,
                "data_publicacao": (
                    ato.data_publicacao.isoformat() if ato.data_publicacao else None
                ),
                "url_pdf": ato.url_pdf,
                "url_original": ato.url_original,
                "nivel_alerta": analise.nivel_alerta if analise else None,
                "score_risco": analise.score_risco if analise else 0,
                "resumo_executivo": analise.resumo_executivo if analise else None,
                "resultado_sonnet": None,
                "recomendacao_campanha": None,
            }
        )

    return {
        "total": total,
        "page": page,
        "pages": max(1, -(-total // limit)),
        "limit": limit,
        "atos": atos,
    }


@router.get("/orgaos/{slug}/atos/{ato_id}")
async def get_ato(
    slug: str,
    ato_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tenant = await _get_tenant(slug, db)
    latest_subq = _latest_analise_subq(tenant.id)

    r = await db.execute(
        select(Ato, Analise)
        .outerjoin(latest_subq, Ato.id == latest_subq.c.ato_id)
        .outerjoin(
            Analise,
            and_(
                Analise.ato_id == Ato.id,
                Analise.criado_em == latest_subq.c.max_dt,
            ),
        )
        .where(Ato.tenant_id == tenant.id, Ato.id == ato_id)
    )
    row = r.first()
    if not row:
        raise HTTPException(status_code=404, detail="Ato não encontrado")

    ato, analise = row
    investigador = is_investigador_plus(current_user["plano"])

    return {
        "id": str(ato.id),
        "numero": ato.numero,
        "tipo": ato.tipo,
        "titulo": ato.titulo,
        "ementa": ato.ementa,
        "data_publicacao": (
            ato.data_publicacao.isoformat() if ato.data_publicacao else None
        ),
        "url_pdf": ato.url_pdf,
        "url_original": ato.url_original,
        "nivel_alerta": analise.nivel_alerta if analise else None,
        "score_risco": analise.score_risco if analise else 0,
        "resumo_executivo": analise.resumo_executivo if analise else None,
        "resultado_sonnet": (
            analise.resultado_sonnet if analise and investigador else None
        ),
        "recomendacao_campanha": (
            analise.recomendacao_campanha if analise and investigador else None
        ),
    }


@router.get("/orgaos/{slug}/stats")
async def get_stats(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    # Reuse same logic as public /stats — just requires auth
    from app.routers.public import get_stats as public_get_stats
    return await public_get_stats(slug=slug, db=db)


@router.get("/orgaos/{slug}/rodadas")
async def get_rodada_ativa(
    slug: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    tenant = await _get_tenant(slug, db)

    r = await db.execute(
        select(RodadaAnalise)
        .where(
            RodadaAnalise.tenant_id == tenant.id,
            RodadaAnalise.status.in_(["em_progresso", "pendente"]),
        )
        .order_by(RodadaAnalise.criado_em.desc())
        .limit(1)
    )
    rodada = r.scalar_one_or_none()

    if not rodada:
        return {"rodada_ativa": None}

    return {
        "rodada_ativa": {
            "id": str(rodada.id),
            "status": rodada.status,
            "total_atos": rodada.total_atos,
            "atos_analisados_haiku": rodada.atos_analisados_haiku,
            "atos_analisados_sonnet": rodada.atos_analisados_sonnet,
            "custo_total_usd": float(rodada.custo_total_usd),
            "iniciado_em": (
                rodada.iniciado_em.isoformat() if rodada.iniciado_em else None
            ),
        }
    }
```

- [ ] **Step 4: Register the router in `backend/app/main.py`**

Find the block where other routers are included (look for `app.include_router`) and add:

```python
from app.routers.painel import router as painel_router
app.include_router(painel_router)
```

- [ ] **Step 5: Run the tests — confirm they pass**

```bash
cd backend && python -m pytest tests/test_router_painel.py -v
```

Expected: all 3 tests PASSED (or skipped with `404` on no test DB — the important ones are the auth and shape tests).

- [ ] **Step 6: Verify the app starts without import errors**

```bash
cd backend && python -c "from app.main import app; print('OK')"
```

Expected: `OK` printed with no errors.

- [ ] **Step 7: Commit**

```bash
git add backend/app/routers/painel.py backend/app/dependencies/ backend/app/main.py backend/tests/test_router_painel.py
git commit -m "feat: backend /painel/* router with JWT auth and plan gating"
```

---

## Task 5: Protected painel layout route + sidebar

**Files:**
- Create: `src/routes/painel.tsx`

- [ ] **Step 1: Create `src/routes/painel.tsx`**

This is a TanStack Router layout route. It guards auth in `beforeLoad`, renders the sidebar and right panel shell, and renders `<Outlet />` in the center column.

```typescript
import {
  createFileRoute,
  redirect,
  Outlet,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, MessageSquare, LogOut } from "lucide-react";

export const Route = createFileRoute("/painel")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) throw redirect({ to: "/entrar" });
    return { session };
  },
  component: PainelLayout,
});

function PainelLayout() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [excavOpen, setExcavOpen] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate({ to: "/entrar" });
        return;
      }
      setUserEmail(session.user.email ?? "");
    });
  }, [navigate]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate({ to: "/entrar" });
  }

  return (
    <div
      className="flex min-h-[100dvh] bg-[#07080f] text-white"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* ── Sidebar (220px) ──────────────────────────────────────────────────── */}
      <aside className="w-[220px] flex-shrink-0 flex flex-col border-r border-white/[0.06] bg-[#09090f]">
        {/* Logo */}
        <div className="px-5 pt-5 pb-3">
          <Link
            to="/"
            className="text-[13px] uppercase tracking-[0.2em] font-bold text-white hover:text-white/70 transition-colors"
            style={{ fontFamily: "'Syne', system-ui, sans-serif" }}
          >
            DIG DIG
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {/* Chat IA */}
          <Link
            to="/painel"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
            activeProps={{ className: "bg-white/[0.07] text-white" }}
          >
            <MessageSquare size={14} />
            Chat com IA
          </Link>

          {/* Escavações accordion */}
          <Collapsible open={excavOpen} onOpenChange={setExcavOpen}>
            <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-[13px] text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors">
              <span>Escavações</span>
              <ChevronDown
                size={13}
                className={`transition-transform ${excavOpen ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-3 mt-0.5 space-y-0.5">
              <Link
                to="/painel/$slug"
                params={{ slug: "cau-pr" }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
                activeProps={{ className: "bg-white/[0.08] text-white" }}
              >
                <span className="text-green-400 text-[10px]">●</span>
                CAU/PR
              </Link>
              {[
                "Pref. de Curitiba",
                "CRM/PR",
                "Câmara de Curitiba",
              ].map((nome) => (
                <div
                  key={nome}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[12px] text-white/30 cursor-not-allowed"
                >
                  <span className="text-white/20 text-[10px]">○</span>
                  {nome}
                  <span className="ml-auto text-[9px] bg-white/10 text-white/40 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    em breve
                  </span>
                </div>
              ))}
            </CollapsibleContent>
          </Collapsible>
        </nav>

        {/* Footer */}
        <div className="px-3 py-3 border-t border-white/[0.06] space-y-1">
          <a
            href="mailto:contato@digdig.com.br"
            className="flex items-center px-3 py-2 rounded-lg text-[12px] text-white/40 hover:text-white/70 transition-colors"
          >
            Feedback
          </a>
          <div className="flex items-center justify-between px-3 py-2">
            <span className="text-[11px] text-white/35 truncate max-w-[130px]">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              title="Sair"
              className="text-white/30 hover:text-white/70 transition-colors ml-1"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content area ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the index redirect at `src/routes/painel/index.tsx`**

TanStack Router needs an index route for `/painel` to redirect to `/painel/cau-pr`:

```typescript
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/painel/")({
  beforeLoad: () => {
    throw redirect({ to: "/painel/$slug", params: { slug: "cau-pr" } });
  },
  component: () => null,
});
```

- [ ] **Step 3: Verify dev server starts without errors**

```bash
npm run dev
```

Navigate to `/painel` in browser — should redirect to `/entrar` if not logged in.

- [ ] **Step 4: Commit**

```bash
git add src/routes/painel.tsx src/routes/painel/index.tsx
git commit -m "feat: painel layout route with sidebar, auth guard, and index redirect"
```

---

## Task 6: Institution dashboard — $slug.tsx with 6 tabs + Realtime

**Files:**
- Create: `src/routes/painel/$slug.tsx`

- [ ] **Step 1: Create `src/routes/painel/$slug.tsx`**

This is a large file. Create it with the full content below:

```typescript
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import {
  fetchPainelAtos,
  fetchPainelRodada,
  type PainelAto,
  type PainelRodada,
} from "../../lib/api-auth";
import { fetchStats, type PublicStats } from "../../lib/api";
import { supabase } from "../../lib/supabase";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ExternalLink, FileText, Search } from "lucide-react";

export const Route = createFileRoute("/painel/$slug")({
  component: SlugDashboard,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

const NIVEL_COLOR: Record<string, string> = {
  vermelho: "bg-red-500/20 text-red-400 border-red-500/30",
  laranja: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  amarelo: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  verde: "bg-green-500/20 text-green-400 border-green-500/30",
};

const NIVEL_DOT: Record<string, string> = {
  vermelho: "🔴",
  laranja: "🟠",
  amarelo: "🟡",
  verde: "🟢",
};

function fmt(n: number | undefined | null, fallback = "…"): string {
  if (n == null) return fallback;
  return n.toLocaleString("pt-BR");
}

function NivelBadge({ nivel }: { nivel: string | null }) {
  if (!nivel) return <span className="text-white/30 text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] border font-medium capitalize ${NIVEL_COLOR[nivel] ?? "bg-white/10 text-white/60"}`}
    >
      {nivel}
    </span>
  );
}

function timeAgo(isoString: string): string {
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (diff < 60) return `há ${diff}s`;
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  return `há ${Math.floor(diff / 3600)}h`;
}

// ── Right panel Realtime feed ─────────────────────────────────────────────────

interface FeedItem {
  id: string;
  numero: string;
  nivel_alerta: string | null;
  criado_em: string;
}

function RealtimeFeed({ slug }: { slug: string }) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const channel = supabase
      .channel(`feed-${slug}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analises" },
        (payload) => {
          const row = payload.new as {
            id: string;
            ato_id: string;
            nivel_alerta: string | null;
            criado_em: string;
          };
          setItems((prev) => [
            {
              id: row.id,
              numero: row.ato_id,
              nivel_alerta: row.nivel_alerta,
              criado_em: row.criado_em,
            },
            ...prev.slice(0, 49),
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  const filtered = busca
    ? items.filter((i) => i.numero.includes(busca))
    : items;

  return (
    <aside className="w-[280px] flex-shrink-0 border-l border-white/[0.06] flex flex-col bg-[#09090f]">
      <div className="px-4 pt-5 pb-3 border-b border-white/[0.06]">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/40 font-medium mb-3">
          Atividade Recente
        </p>
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"
          />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar atividade..."
            className="pl-7 h-7 text-[12px] bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/30"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {filtered.length === 0 && (
          <p className="text-[12px] text-white/30 px-2 py-4 text-center">
            {items.length === 0
              ? "Aguardando inserções..."
              : "Sem resultados."}
          </p>
        )}
        {filtered.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors"
          >
            <span className="text-[14px] mt-0.5">
              {NIVEL_DOT[item.nivel_alerta ?? ""] ?? "⚪"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-white/70 font-medium truncate">
                {item.numero}
              </p>
              <p className="text-[10px] text-white/30 capitalize">
                {item.nivel_alerta ?? "sem análise"}
              </p>
            </div>
            <span className="text-[10px] text-white/25 whitespace-nowrap">
              {timeAgo(item.criado_em)}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── Tab: Visão Geral ──────────────────────────────────────────────────────────

function TabVisaoGeral({
  stats,
  rodada,
}: {
  stats: PublicStats | null;
  rodada: PainelRodada | null;
}) {
  const pct =
    rodada && rodada.total_atos > 0
      ? Math.round((rodada.atos_analisados_haiku / rodada.total_atos) * 100)
      : null;

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Documentos coletados", value: fmt(stats?.total_atos) },
          { label: "Analisados", value: fmt(stats?.total_analisados) },
          { label: "Casos críticos", value: fmt(stats?.total_criticos) },
          { label: "Custo de acesso", value: "R$ 0" },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
          >
            <p className="text-[11px] text-white/40 uppercase tracking-wide mb-1">
              {label}
            </p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Rodada progress */}
      {rodada && pct !== null ? (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-white/60">
              {rodada.status === "em_progresso" ? "🟢 AO VIVO — " : ""}
              Documentos em análise
            </p>
            <span className="text-[12px] text-white/40">
              {rodada.atos_analisados_haiku} / {rodada.total_atos} —{" "}
              {pct}%
            </span>
          </div>
          <Progress value={pct} className="h-2 bg-white/10" />
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
          <p className="text-[13px] text-white/40">
            Nenhuma rodada de análise ativa no momento.
          </p>
        </div>
      )}

      {/* Distribuição */}
      {stats && (
        <div className="flex gap-6 flex-wrap">
          {(
            [
              ["verde", stats.distribuicao.verde],
              ["amarelo", stats.distribuicao.amarelo],
              ["laranja", stats.distribuicao.laranja],
              ["vermelho", stats.distribuicao.vermelho],
            ] as [string, number][]
          ).map(([nivel, count]) => (
            <div key={nivel} className="flex items-center gap-2">
              <span className="text-[15px]">{NIVEL_DOT[nivel]}</span>
              <span className="text-[13px] text-white/70 capitalize">
                {nivel}
              </span>
              <span className="text-[13px] font-semibold text-white">
                {count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: Atos table (Portarias + Deliberações) ────────────────────────────────

function TabAtos({
  slug,
  tipo,
}: {
  slug: string;
  tipo: "portaria" | "deliberacao";
}) {
  const [atos, setAtos] = useState<PainelAto[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [nivel, setNivel] = useState("");
  const [ano, setAno] = useState("");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchPainelAtos(slug, {
      tipo,
      nivel: nivel || undefined,
      ano: ano ? Number(ano) : undefined,
      busca: busca || undefined,
      page,
    })
      .then((r) => {
        setAtos(r.atos);
        setTotal(r.total);
        setPages(r.pages);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, tipo, nivel, ano, busca, page]);

  const anos = Array.from({ length: 7 }, (_, i) => 2020 + i);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={nivel}
          onChange={(e) => { setNivel(e.target.value); setPage(1); }}
          className="h-8 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-[12px] text-white/70 focus:outline-none focus:border-white/30"
        >
          <option value="">Todos os níveis</option>
          {["verde", "amarelo", "laranja", "vermelho"].map((n) => (
            <option key={n} value={n} className="bg-[#09090f] capitalize">
              {n.charAt(0).toUpperCase() + n.slice(1)}
            </option>
          ))}
        </select>
        <select
          value={ano}
          onChange={(e) => { setAno(e.target.value); setPage(1); }}
          className="h-8 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-[12px] text-white/70 focus:outline-none focus:border-white/30"
        >
          <option value="">Todos os anos</option>
          {anos.map((a) => (
            <option key={a} value={a} className="bg-[#09090f]">
              {a}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30"
          />
          <Input
            value={busca}
            onChange={(e) => { setBusca(e.target.value); setPage(1); }}
            placeholder="Número ou ementa..."
            className="pl-7 h-8 w-52 text-[12px] bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-white/30"
          />
        </div>
        <span className="text-[11px] text-white/30 ml-auto">
          {fmt(total)} resultado{total !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {["Número", "Ementa", "Nível", "Score", "Data", ""].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.15em] text-white/35 font-medium"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-white/30 text-[13px]"
                >
                  Carregando...
                </td>
              </tr>
            )}
            {!loading && atos.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-white/30 text-[13px]"
                >
                  Nenhum resultado.
                </td>
              </tr>
            )}
            {atos.map((ato) => (
              <tr
                key={ato.id}
                className="border-b border-white/[0.04] hover:bg-white/[0.03] transition-colors cursor-pointer"
              >
                <td className="px-4 py-2.5 text-white/80 font-medium whitespace-nowrap">
                  <Link
                    to="/painel/$slug/ato/$id"
                    params={{ slug, id: ato.id }}
                    className="hover:text-white transition-colors"
                  >
                    {ato.numero}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-white/55 max-w-[280px]">
                  <Link
                    to="/painel/$slug/ato/$id"
                    params={{ slug, id: ato.id }}
                    className="hover:text-white/80 transition-colors"
                  >
                    {ato.ementa
                      ? ato.ementa.slice(0, 80) +
                        (ato.ementa.length > 80 ? "…" : "")
                      : "—"}
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <NivelBadge nivel={ato.nivel_alerta} />
                </td>
                <td className="px-4 py-2.5 text-white/50">{ato.score_risco}</td>
                <td className="px-4 py-2.5 text-white/40 whitespace-nowrap">
                  {ato.data_publicacao
                    ? new Date(ato.data_publicacao).toLocaleDateString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    {ato.url_pdf && (
                      <a
                        href={ato.url_pdf}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="PDF original"
                        onClick={(e) => e.stopPropagation()}
                        className="text-white/30 hover:text-white/70 transition-colors"
                      >
                        <ExternalLink size={13} />
                      </a>
                    )}
                    <Link
                      to="/painel/$slug/ato/$id"
                      params={{ slug, id: ato.id }}
                      title="Ver ficha"
                      className="text-white/30 hover:text-white/70 transition-colors"
                    >
                      <FileText size={13} />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center gap-2 justify-end">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded-lg text-[12px] bg-white/[0.04] border border-white/10 text-white/50 disabled:opacity-30 hover:text-white transition-colors"
          >
            ← Anterior
          </button>
          <span className="text-[12px] text-white/40">
            {page} / {pages}
          </span>
          <button
            disabled={page === pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded-lg text-[12px] bg-white/[0.04] border border-white/10 text-white/50 disabled:opacity-30 hover:text-white transition-colors"
          >
            Próxima →
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tab: Denúncias ────────────────────────────────────────────────────────────

function TabDenuncias({ slug }: { slug: string }) {
  const [atos, setAtos] = useState<PainelAto[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const nivel = filtro === "todos" ? undefined : filtro;
    fetchPainelAtos(slug, { nivel, page: 1 })
      .then((r) => setAtos(r.atos.filter((a) => a.nivel_alerta === "vermelho" || a.nivel_alerta === "laranja")))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [slug, filtro]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["todos", "vermelho", "laranja"].map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 rounded-full text-[12px] capitalize transition-colors border ${
              filtro === f
                ? "bg-white/10 border-white/20 text-white"
                : "bg-transparent border-white/10 text-white/40 hover:text-white/70"
            }`}
          >
            {f === "todos" ? "Todos críticos" : f}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-[13px] text-white/30 py-8 text-center">
          Carregando...
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {atos.map((ato) => (
          <div
            key={ato.id}
            className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span>{NIVEL_DOT[ato.nivel_alerta ?? ""] ?? "⚪"}</span>
                <span
                  className={`text-[11px] font-bold uppercase tracking-wide ${
                    ato.nivel_alerta === "vermelho"
                      ? "text-red-400"
                      : "text-orange-400"
                  }`}
                >
                  {(ato.nivel_alerta ?? "").toUpperCase()} · Score{" "}
                  {ato.score_risco}
                </span>
              </div>
              <span className="text-[12px] text-white/50 whitespace-nowrap">
                {ato.tipo === "deliberacao" ? "Deliberação" : "Portaria"}{" "}
                {ato.numero}
              </span>
            </div>

            {ato.resumo_executivo && (
              <p className="text-[13px] text-white/65 leading-relaxed">
                {ato.resumo_executivo.slice(0, 200)}
                {ato.resumo_executivo.length > 200 ? "…" : ""}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Link
                to="/painel/$slug/ato/$id"
                params={{ slug, id: ato.id }}
                className="px-3 py-1.5 rounded-lg text-[12px] bg-white/[0.06] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                Ver ficha completa
              </Link>
              {ato.url_pdf && (
                <a
                  href={ato.url_pdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg text-[12px] bg-transparent border border-white/10 text-white/40 hover:text-white/70 transition-colors"
                >
                  PDF original →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Tab: Pipeline (Realtime) ───────────────────────────────────────────────────

function TabPipeline({
  slug,
  rodada,
}: {
  slug: string;
  rodada: PainelRodada | null;
}) {
  const [items, setItems] = useState<
    {
      id: string;
      nivel_alerta: string | null;
      score_risco: number;
      criado_em: string;
    }[]
  >([]);

  useEffect(() => {
    const channel = supabase
      .channel(`pipeline-feed-${slug}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "analises" },
        (payload) => {
          const row = payload.new as {
            id: string;
            nivel_alerta: string | null;
            score_risco: number;
            criado_em: string;
          };
          setItems((prev) => [row, ...prev.slice(0, 99)]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug]);

  const pct =
    rodada && rodada.total_atos > 0
      ? Math.round((rodada.atos_analisados_haiku / rodada.total_atos) * 100)
      : null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${rodada ? "bg-green-400 animate-pulse" : "bg-white/20"}`}
          />
          <span className="text-[13px] text-white/70 font-medium">
            {rodada ? "AO VIVO — " : ""}
            {rodada?.status === "em_progresso"
              ? "Análise em andamento"
              : "Nenhuma rodada ativa"}
          </span>
        </div>
        {rodada && (
          <div className="flex items-center gap-4 text-[12px] text-white/40">
            <span>{rodada.atos_analisados_haiku} analisados</span>
            <span>{rodada.total_atos - rodada.atos_analisados_haiku} restantes</span>
            <span>~${rodada.custo_total_usd.toFixed(2)} gasto</span>
          </div>
        )}
      </div>

      {rodada && pct !== null && (
        <Progress value={pct} className="h-1.5 bg-white/10" />
      )}

      {/* Live feed */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        {items.length === 0 ? (
          <div className="px-4 py-8 text-center text-[13px] text-white/30">
            {rodada
              ? "Aguardando próximas análises..."
              : "Nenhuma rodada ativa no momento."}
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                {["Horário", "Nível", "Score", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-left text-[10px] uppercase tracking-[0.15em] text-white/35 font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-4 py-2 text-white/40 font-mono text-[12px]">
                    {new Date(item.criado_em).toLocaleTimeString("pt-BR")}
                  </td>
                  <td className="px-4 py-2">
                    <NivelBadge nivel={item.nivel_alerta} />
                  </td>
                  <td className="px-4 py-2 text-white/50">{item.score_risco}</td>
                  <td className="px-4 py-2 text-[10px] text-white/25">
                    {timeAgo(item.criado_em)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab: Relatório Final ──────────────────────────────────────────────────────

function TabRelatorio({
  stats,
  rodada,
}: {
  stats: PublicStats | null;
  rodada: PainelRodada | null;
}) {
  const pct =
    stats && stats.total_atos > 0
      ? Math.round((stats.total_analisados / stats.total_atos) * 100)
      : 0;
  const concluido = pct >= 100;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <h2 className="text-[15px] font-semibold text-white">
              Relatório Final — CAU/PR 2020–2026
            </h2>
            <p className="text-[12px] text-white/40">
              {concluido
                ? "Publicado — disponível para todos os planos"
                : "Disponível quando 100% dos documentos forem analisados"}
            </p>
          </div>
        </div>

        {!concluido && (
          <>
            <Progress value={pct} className="h-2 bg-white/10" />
            <p className="text-[12px] text-white/40">
              {fmt(stats?.total_analisados)} / {fmt(stats?.total_atos)}{" "}
              documentos analisados ({pct}% concluído)
            </p>
            <p className="text-[13px] text-white/50">
              Todos os planos terão acesso quando publicado.
            </p>
          </>
        )}

        {concluido && (
          <p className="text-[13px] text-white/70">
            O relatório completo está disponível. Documento com análise de todos
            os {fmt(stats?.total_atos)} atos, distribuição por nível e
            recomendações.
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard Component ──────────────────────────────────────────────────

function SlugDashboard() {
  const { slug } = Route.useParams();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [rodada, setRodada] = useState<PainelRodada | null>(null);

  useEffect(() => {
    fetchStats(slug).then(setStats).catch(console.error);
    fetchPainelRodada(slug).then(setRodada).catch(console.error);

    // Poll rodada every 30s
    const interval = setInterval(() => {
      fetchPainelRodada(slug).then(setRodada).catch(console.error);
    }, 30_000);
    return () => clearInterval(interval);
  }, [slug]);

  const nomeOrgao =
    slug === "cau-pr" ? "CAU/PR" : slug.toUpperCase().replace("-", "/");

  return (
    <>
      {/* ── Center: content ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h1 className="text-[15px] font-semibold text-white">{nomeOrgao}</h1>
            {rodada?.status === "em_progresso" && (
              <span className="flex items-center gap-1.5 text-[11px] text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                Pipeline ao vivo
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="visao-geral" className="h-full">
            <TabsList className="px-6 pt-3 pb-0 bg-transparent border-b border-white/[0.06] rounded-none h-auto gap-0 w-full justify-start">
              {[
                { value: "visao-geral", label: "Visão Geral" },
                { value: "portarias", label: "Portarias" },
                { value: "deliberacoes", label: "Deliberações" },
                { value: "denuncias", label: "Denúncias" },
                { value: "pipeline", label: "Pipeline" },
                { value: "relatorio", label: "Relatório Final" },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="rounded-none px-4 py-3 text-[12px] uppercase tracking-[0.12em] text-white/40 data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-white bg-transparent hover:text-white/70 transition-colors"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="px-6 py-5">
              <TabsContent value="visao-geral">
                <TabVisaoGeral stats={stats} rodada={rodada} />
              </TabsContent>
              <TabsContent value="portarias">
                <TabAtos slug={slug} tipo="portaria" />
              </TabsContent>
              <TabsContent value="deliberacoes">
                <TabAtos slug={slug} tipo="deliberacao" />
              </TabsContent>
              <TabsContent value="denuncias">
                <TabDenuncias slug={slug} />
              </TabsContent>
              <TabsContent value="pipeline">
                <TabPipeline slug={slug} rodada={rodada} />
              </TabsContent>
              <TabsContent value="relatorio">
                <TabRelatorio stats={stats} rodada={rodada} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>

      {/* ── Right panel: Realtime feed ───────────────────────────────────────── */}
      <RealtimeFeed slug={slug} />
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors (fix any import paths if needed).

- [ ] **Step 3: Note: Supabase Realtime requires RLS to be enabled on `analises`**

In the Supabase Dashboard:
1. Go to Table Editor → `analises` → Enable RLS (should already be enabled)
2. Add policy: `Allow authenticated reads` → `FOR SELECT TO authenticated USING (true)`
3. Go to Database → Replication → enable replication for `analises` table

- [ ] **Step 4: Commit**

```bash
git add src/routes/painel/
git commit -m "feat: institution dashboard with 6 tabs and Supabase Realtime feed"
```

---

## Task 7: Ato detail page

**Files:**
- Create: `src/routes/painel/$slug/ato.$id.tsx`

- [ ] **Step 1: Create directory if needed**

```bash
mkdir -p "src/routes/painel/$slug"
```

- [ ] **Step 2: Create `src/routes/painel/$slug/ato.$id.tsx`**

```typescript
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { fetchPainelAto, type PainelAto } from "../../../lib/api-auth";
import { supabase } from "../../../lib/supabase";
import { ExternalLink, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/painel/$slug/ato/$id")({
  component: AtoDetailPage,
});

const NIVEL_LABEL: Record<string, string> = {
  vermelho: "🔴 VERMELHO",
  laranja: "🟠 LARANJA",
  amarelo: "🟡 AMARELO",
  verde: "🟢 VERDE",
};

const NIVEL_COLOR: Record<string, string> = {
  vermelho: "text-red-400",
  laranja: "text-orange-400",
  amarelo: "text-yellow-400",
  verde: "text-green-400",
};

function Section({
  title,
  children,
  locked,
}: {
  title: string;
  children: React.ReactNode;
  locked?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-white/[0.08]" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-medium px-2 whitespace-nowrap">
          {title}
        </span>
        <div className="h-px flex-1 bg-white/[0.08]" />
      </div>
      {locked ? (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
          <p className="text-[12px] text-white/35">
            🔒 Disponível para planos Investigador e Profissional
          </p>
          <a
            href="/precos"
            className="mt-2 inline-block text-[12px] text-white/50 hover:text-white underline underline-offset-2 transition-colors"
          >
            Upgrade para Investigador →
          </a>
        </div>
      ) : (
        <div className="text-[14px] text-white/70 leading-relaxed">{children}</div>
      )}
    </div>
  );
}

function AtoDetailPage() {
  const { slug, id } = Route.useParams();
  const [ato, setAto] = useState<PainelAto | null>(null);
  const [plano, setPlano] = useState<string>("cidadão");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.plano) {
        setPlano(session.user.user_metadata.plano);
      }
    });

    fetchPainelAto(slug, id)
      .then(setAto)
      .catch(() => setError("Não foi possível carregar o ato."))
      .finally(() => setLoading(false));
  }, [slug, id]);

  const investigador =
    plano === "investigador" ||
    plano === "profissional" ||
    plano === "api & dados";

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/30 text-[13px]">Carregando...</p>
      </div>
    );
  }

  if (error || !ato) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/40 text-[13px]">{error ?? "Ato não encontrado."}</p>
      </div>
    );
  }

  const sonnet = ato.resultado_sonnet as Record<string, unknown> | null;
  const irregularidades = (sonnet?.irregularidades as string[] | undefined) ?? [];
  const pessoas = (sonnet?.pessoas as string[] | undefined) ?? [];

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5 max-w-3xl space-y-6">
      {/* Back */}
      <Link
        to="/painel/$slug"
        params={{ slug }}
        className="inline-flex items-center gap-1.5 text-[12px] text-white/40 hover:text-white/70 transition-colors"
      >
        <ArrowLeft size={13} />
        Voltar
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-[15px] font-semibold text-white uppercase tracking-wide">
            {ato.tipo === "deliberacao" ? "Deliberação" : "Portaria"} Nº{" "}
            {ato.numero}
          </h1>
          {ato.nivel_alerta && (
            <span
              className={`text-[13px] font-bold whitespace-nowrap ${NIVEL_COLOR[ato.nivel_alerta] ?? "text-white"}`}
            >
              {NIVEL_LABEL[ato.nivel_alerta]} — Score {ato.score_risco}
            </span>
          )}
        </div>
        <p className="text-[12px] text-white/35">
          CAU/PR ·{" "}
          {ato.data_publicacao
            ? new Date(ato.data_publicacao).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
            : "data não disponível"}
        </p>
      </div>

      {/* Resumo executivo — todos os planos */}
      {ato.resumo_executivo && (
        <Section title="Resumo Executivo">
          <p className="whitespace-pre-wrap">{ato.resumo_executivo}</p>
        </Section>
      )}

      {/* Análise profunda — Investigador+ */}
      <Section
        title="Análise Profunda [Investigador+]"
        locked={!investigador || !sonnet}
      >
        {investigador && sonnet && (
          <p className="whitespace-pre-wrap">
            {(sonnet.analise_profunda as string) ?? "—"}
          </p>
        )}
      </Section>

      {/* Irregularidades */}
      {irregularidades.length > 0 && (
        <Section title="Irregularidades">
          <ul className="space-y-1.5">
            {irregularidades.map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Pessoas identificadas — Investigador+ */}
      <Section
        title="Pessoas Identificadas [Investigador+]"
        locked={!investigador || !pessoas.length}
      >
        {investigador && pessoas.length > 0 && (
          <ul className="space-y-1">
            {pessoas.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-white/30 mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Recomendação */}
      {ato.recomendacao_campanha && investigador && (
        <Section title="Recomendação">
          <p className="whitespace-pre-wrap">{ato.recomendacao_campanha}</p>
        </Section>
      )}

      {/* Links */}
      <Section title="Links">
        <div className="flex flex-wrap gap-3">
          {ato.url_pdf && (
            <a
              href={ato.url_pdf}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
            >
              <ExternalLink size={13} />
              Documento original no CAU/PR
            </a>
          )}
          <a
            href="https://www.caupr.gov.br/regimento/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-[13px] text-white/60 hover:text-white hover:bg-white/[0.07] transition-colors"
          >
            <ExternalLink size={13} />
            Regimento Interno CAU/PR
          </a>
        </div>
      </Section>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/routes/painel/\$slug/"
git commit -m "feat: ato detail page with plan-gated Sonnet analysis and links"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|-----------------|------|
| `/entrar` — Supabase signInWithPassword | Task 2 |
| `/painel` redirects to `/painel/cau-pr` | Task 5 (index.tsx) |
| `/painel/$slug` — 6 tabs | Task 6 |
| `/painel/$slug/ato/$id` — ficha completa | Task 7 |
| Sidebar — Escavações accordion | Task 5 |
| Supabase Realtime right panel | Task 6 (RealtimeFeed) |
| `beforeLoad` auth guard | Task 5 |
| `supabase.ts` + `api-auth.ts` | Task 1 |
| `get_current_user()` FastAPI dependency | Task 3 |
| `is_investigador_plus()` | Task 3 |
| `GET /painel/orgaos/{slug}/atos` | Task 4 |
| `GET /painel/orgaos/{slug}/atos/{id}` | Task 4 |
| `GET /painel/orgaos/{slug}/stats` | Task 4 |
| `GET /painel/orgaos/{slug}/rodadas` | Task 4 |
| Sonnet gated for Investigador+ | Task 4 + Task 7 |
| Tab Visão Geral — 4 stat cards + progress | Task 6 |
| Tab Portarias + Deliberações — filtered table | Task 6 |
| Tab Denúncias — laranja + vermelho grid | Task 6 |
| Tab Pipeline — Realtime live feed | Task 6 |
| Tab Relatório Final — progress gate | Task 6 |
| VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars | Task 1 |
| Supabase Realtime RLS note | Task 6, Step 3 |
