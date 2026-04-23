import logging
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin", tags=["honeypot"])

_FAKE_RESPONSE = {"detail": "Not Found"}


def _log_probe(request: Request, path: str) -> None:
    logger.warning(
        "honeypot_probe",
        extra={
            "path": path,
            "method": request.method,
            "ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", ""),
            "referer": request.headers.get("referer", ""),
        },
    )


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def honeypot(path: str, request: Request):
    _log_probe(request, f"/admin/{path}")
    return JSONResponse(status_code=404, content=_FAKE_RESPONSE)


@router.api_route("/", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def honeypot_root(request: Request):
    _log_probe(request, "/admin/")
    return JSONResponse(status_code=404, content=_FAKE_RESPONSE)
