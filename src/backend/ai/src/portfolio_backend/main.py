"""FastAPI entry: health + streaming chat."""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# load src/backend/ai/.env before reading os.environ in chat/limits
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, StreamingResponse
from pydantic import BaseModel, Field

from portfolio_backend.chat import (
    BROKE_MSG,
    MAX_OUTPUT_TOKENS,
    XAI_API_KEY,
    build_xai_messages,
    close_http,
    estimate_text_tokens,
    parse_messages,
    stream_grok,
)
from portfolio_backend.context_loader import load_system_prompt
from portfolio_backend.limits import client_ip, remaining, try_consume

ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN", "http://localhost:3000")

app = FastAPI(title="portfolio-backend", version="0.1.0")


@app.on_event("shutdown")
async def _shutdown() -> None:
    await close_http()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGIN.split(",") if o.strip()],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    messages: list[dict[str, Any]] = Field(..., min_length=1)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@app.post("/chat")
async def chat(request: Request, body: ChatRequest) -> Response:
    ip = client_ip(
        {k.lower(): v for k, v in request.headers.items()},
        request.client.host if request.client else None,
    )
    parsed = parse_messages(body.messages)

    if not XAI_API_KEY:
        raise HTTPException(status_code=503, detail="XAI_API_KEY not configured")

    system = load_system_prompt()
    xai_messages = build_xai_messages(system, parsed)
    # system once + already-validated turns (avoid double-walking full payload)
    est_tokens = (
        estimate_text_tokens(system)
        + sum(estimate_text_tokens(m["content"]) for m in parsed)
        + MAX_OUTPUT_TOKENS
    )

    ok, left, _reason = try_consume(ip, est_tokens)
    if not ok:
        return JSONResponse(
            status_code=429,
            content={"detail": BROKE_MSG, "remaining": left},
        )

    async def events() -> AsyncIterator[bytes]:
        try:
            async for token in stream_grok(xai_messages):
                yield _sse("token", {"content": token}).encode("utf-8")
            yield _sse("done", {"remaining": left}).encode("utf-8")
        except Exception as e:
            detail = getattr(e, "detail", None) or str(e)
            if not isinstance(detail, str):
                detail = str(detail)
            yield _sse("error", {"detail": detail}).encode("utf-8")

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "X-RateLimit-Remaining": str(left),
        },
    )


@app.get("/quota")
def quota(request: Request) -> dict[str, int]:
    ip = client_ip(
        {k.lower(): v for k, v in request.headers.items()},
        request.client.host if request.client else None,
    )
    return {"remaining": remaining(ip)}


def main() -> None:
    import uvicorn

    host = os.getenv("HOST", "127.0.0.1")
    try:
        port = int(os.getenv("PORT", "8000") or "8000")
    except ValueError:
        port = 8000
    uvicorn.run("portfolio_backend.main:app", host=host, port=port, reload=True)


if __name__ == "__main__":
    main()
