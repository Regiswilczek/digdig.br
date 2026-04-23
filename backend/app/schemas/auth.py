import uuid
from pydantic import BaseModel


class TokenPayload(BaseModel):
    sub: str                    # Supabase user UUID
    email: str | None = None
    role: str = "authenticated"
    app_metadata: dict = {}


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    nome: str | None
    plano_nome: str
    plano_limite_chat: int | None
    ativo: bool

    model_config = {"from_attributes": True}


class WebhookPayload(BaseModel):
    type: str
    table: str
    record: dict
    old_record: dict | None = None
