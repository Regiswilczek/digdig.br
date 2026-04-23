from pydantic import BaseModel


class Pagination(BaseModel):
    page: int = 1
    per_page: int = 20
    total: int = 0


class ErrorResponse(BaseModel):
    detail: str
