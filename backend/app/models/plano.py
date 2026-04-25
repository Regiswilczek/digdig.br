import uuid
from decimal import Decimal
from sqlalchemy import String, Numeric, Boolean, Text, Integer, text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.models.base import Base, TimestampMixin


class Plano(Base, TimestampMixin):
    __tablename__ = "planos"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4,
        server_default=text("gen_random_uuid()"),
    )
    nome: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    preco_mensal: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=Decimal("0")
    )
    mercadopago_price_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    limite_chat_mensal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_orgaos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    tem_exportacao: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    tem_api: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    max_assentos: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    limite_exportacoes_mensal: Mapped[int | None] = mapped_column(Integer, nullable=True)
    teto_tokens_brl: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    e_anual: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    preco_anual: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)

    users: Mapped[list["User"]] = relationship(back_populates="plano")
