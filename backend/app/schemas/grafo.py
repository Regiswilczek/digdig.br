"""
schemas/grafo.py — Modelos Pydantic dos endpoints de grafo de relações.

Três tipos de nó:
  - NodePessoa (círculo): cor por ICP individual
  - NodeAto (quadrado): cor por nivel_alerta da análise
  - NodeTag (triângulo): cor pela gravidade predominante das atribuições

Três tipos de aresta:
  - EdgePessoaPessoa (co_aparicao): peso = atos em comum + tags compartilhadas
  - EdgePessoaAto (aparicao): tipo_aparicao + cargo
  - EdgeAtoTag (atribuicao_tag): gravidade + qual agente atribuiu
"""
from __future__ import annotations

import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel


# ── Cor categoria (escala única de alerta) ─────────────────────────────────
CorCategoria = Literal["cinza", "amarelo", "laranja", "vermelho"]
Gravidade = Literal["baixa", "media", "alta", "critica"]
NivelAlerta = Literal["verde", "amarelo", "laranja", "vermelho"]
TipoAparicao = Literal["nomeado", "exonerado", "assina", "membro_comissao", "processado", "mencionado"]
AgenteIA = Literal["piper", "bud", "new", "haiku", "sonnet"]


def gravidade_para_cor(g: str | None) -> CorCategoria:
    """Mapeia gravidade da atribuição para cor da paleta de alerta."""
    if g == "critica":
        return "vermelho"
    if g == "alta":
        return "laranja"
    if g == "media":
        return "amarelo"
    return "cinza"


def icp_para_cor(icp: float | None, suspeito: bool) -> CorCategoria:
    """Mapeia ICP individual + flag suspeito para cor."""
    if suspeito:
        return "vermelho"
    if icp is None:
        return "cinza"
    if icp >= 30:
        return "vermelho"
    if icp >= 15:
        return "laranja"
    if icp >= 5:
        return "amarelo"
    return "cinza"


# ── Nodes ──────────────────────────────────────────────────────────────────

class NodePessoa(BaseModel):
    id: uuid.UUID
    tipo: Literal["pessoa"] = "pessoa"
    nome: str
    cargo: str | None = None
    icp: float | None = None
    total_aparicoes: int = 0
    suspeito: bool = False
    primeiro_ato: date | None = None
    ultimo_ato: date | None = None
    cor_categoria: CorCategoria = "cinza"


class NodeAto(BaseModel):
    id: uuid.UUID
    tipo: Literal["ato"] = "ato"
    numero: str
    ato_tipo: str                       # portaria, ata_plenaria, deliberacao, etc.
    data_publicacao: date | None = None
    nivel_alerta: NivelAlerta | None = None
    pessoas_count: int = 0              # quantas pessoas aparecem nesse ato
    tags_count: int = 0                 # quantas tags ativas


class NodeTag(BaseModel):
    codigo: str                         # ex: "nepotismo" — PK lógica
    tipo: Literal["tag"] = "tag"
    nome: str                           # ex: "Nepotismo"
    categoria: str                      # cat1_dinheiro..cat9_institucional
    categoria_nome: str
    gravidade_predominante: Gravidade
    atos_count: int = 0
    cor_categoria: CorCategoria = "cinza"


# ── Edges ──────────────────────────────────────────────────────────────────

class EdgePessoaPessoa(BaseModel):
    source: uuid.UUID
    target: uuid.UUID
    kind: Literal["co_aparicao"] = "co_aparicao"
    peso: float
    atos_em_comum: int
    tags_compartilhadas: list[str] = []           # códigos de tag presentes nos atos comuns
    gravidade_max: Gravidade | None = None        # gravidade máxima entre tags_compartilhadas


class EdgePessoaAto(BaseModel):
    source: uuid.UUID                             # pessoa
    target: uuid.UUID                             # ato
    kind: Literal["aparicao"] = "aparicao"
    tipo_aparicao: str
    cargo: str | None = None


class EdgeAtoTag(BaseModel):
    source: uuid.UUID                             # ato
    target: str                                   # codigo da tag (não UUID)
    kind: Literal["atribuicao_tag"] = "atribuicao_tag"
    gravidade: Gravidade
    atribuido_por: str                            # piper | bud | new


# ── Response wrappers ──────────────────────────────────────────────────────

class GrafoResponse(BaseModel):
    nodes_pessoas: list[NodePessoa] = []
    nodes_atos: list[NodeAto] = []
    nodes_tags: list[NodeTag] = []
    edges_pessoa_pessoa: list[EdgePessoaPessoa] = []
    edges_pessoa_ato: list[EdgePessoaAto] = []
    edges_ato_tag: list[EdgeAtoTag] = []
    root_id: str | None = None                    # uuid de pessoa/ato OU codigo de tag


class TagResumo(BaseModel):
    codigo: str
    nome: str
    gravidade: Gravidade


class AtoComumItem(BaseModel):
    ato_id: uuid.UUID
    tipo: str
    numero: str
    data_publicacao: date | None = None
    ementa: str | None = None
    nivel_alerta: NivelAlerta | None = None
    tipo_aparicao_a: str
    cargo_a: str | None = None
    tipo_aparicao_b: str
    cargo_b: str | None = None
    tags: list[TagResumo] = []


class AtosComunsResponse(BaseModel):
    pessoa_a_id: uuid.UUID
    pessoa_b_id: uuid.UUID
    atos: list[AtoComumItem]
