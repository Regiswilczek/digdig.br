"""
atlas_categoria_tipo_orgao — controla quais categorias do ATLAS aplicam-se
a quais tipos de órgão e se Piper roda por padrão.

Permite ampliar a taxonomia ATLAS com categorias específicas de outros tipos
de órgão (Executivo estadual, prefeitura, etc) sem expor categorias
inaplicáveis ao tenant atual no prompt do agente.

Também serve de heurística pra controlar custo: ao popular a fila do Piper
após ATLAS, podemos filtrar por `piper_default = TRUE` pra evitar gastar
tokens em docs sem valor investigativo (placa_certidao, comunicacao_institucional
rotineira, etc).
"""
from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class AtlasCategoriaTipoOrgao(Base):
    __tablename__ = "atlas_categoria_tipo_orgao"

    categoria: Mapped[str] = mapped_column(String(40), primary_key=True)
    tipo_orgao: Mapped[str] = mapped_column(String(100), primary_key=True)
    piper_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
