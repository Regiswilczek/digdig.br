from fastapi import APIRouter

router = APIRouter(tags=["health"])

VERSION = "0.1.0"


@router.get("/health")
async def health():
    return {"status": "ok", "version": VERSION}
