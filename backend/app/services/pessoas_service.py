import re
import uuid
from datetime import date
from typing import Optional
import unicodedata
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.models.pessoa import Pessoa, AparicaoPessoa


def normalizar_nome(nome: str) -> str:
    if not nome or not nome.strip():
        return ""
    # Remove accents
    nfkd = unicodedata.normalize("NFKD", nome)
    ascii_str = nfkd.encode("ASCII", "ignore").decode("ASCII")
    # Uppercase, remove punctuation except spaces
    upper = ascii_str.upper()
    clean = re.sub(r"[^A-Z\s]", "", upper)
    return re.sub(r"\s+", " ", clean).strip()


async def salvar_pessoas(
    db: AsyncSession,
    ato_id: uuid.UUID,
    tenant_id: uuid.UUID,
    pessoas_extraidas: list[dict],
    data_ato: Optional[date] = None,
) -> None:
    for pessoa_data in pessoas_extraidas:
        nome_raw = pessoa_data.get("nome", "").strip()
        if not nome_raw:
            continue

        nome_norm = normalizar_nome(nome_raw)
        if not nome_norm:
            continue

        cargo = pessoa_data.get("cargo", "")
        tipo_aparicao = pessoa_data.get("tipo_aparicao", "mencionado")

        # Upsert Pessoa
        result = await db.execute(
            select(Pessoa).where(
                Pessoa.tenant_id == tenant_id,
                Pessoa.nome_normalizado == nome_norm,
            )
        )
        pessoa = result.scalar_one_or_none()

        if not pessoa:
            pessoa = Pessoa(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                nome_normalizado=nome_norm,
                variantes_nome=[nome_raw],
                cargo_mais_recente=cargo or None,
                total_aparicoes=1,
                primeiro_ato_data=data_ato,
                ultimo_ato_data=data_ato,
            )
            db.add(pessoa)
            await db.flush()
        else:
            variantes = pessoa.variantes_nome or []
            new_values = {
                "total_aparicoes": Pessoa.total_aparicoes + 1,
                "cargo_mais_recente": cargo or pessoa.cargo_mais_recente,
                "ultimo_ato_data": data_ato,
            }
            if nome_raw not in variantes:
                variantes.append(nome_raw)
                new_values["variantes_nome"] = variantes
            if data_ato and (pessoa.primeiro_ato_data is None or data_ato < pessoa.primeiro_ato_data):
                new_values["primeiro_ato_data"] = data_ato
            await db.execute(
                update(Pessoa).where(Pessoa.id == pessoa.id).values(**new_values)
            )

        # aparicoes_pessoa.data_ato é NOT NULL — pula se o ato não tem data_publicacao
        if data_ato is None:
            continue

        # Check if AparicaoPessoa already exists for this ato
        ap_result = await db.execute(
            select(AparicaoPessoa).where(
                AparicaoPessoa.pessoa_id == pessoa.id,
                AparicaoPessoa.ato_id == ato_id,
            )
        )
        if ap_result.scalar_one_or_none():
            continue

        aparicao = AparicaoPessoa(
            id=uuid.uuid4(),
            pessoa_id=pessoa.id,
            ato_id=ato_id,
            tenant_id=tenant_id,
            tipo_aparicao=tipo_aparicao,
            cargo=cargo or None,
            data_ato=data_ato,
        )
        db.add(aparicao)
