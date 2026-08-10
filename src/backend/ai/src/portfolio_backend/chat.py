"""Validate turns and stream Grok completions."""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from typing import Any

import httpx
from fastapi import HTTPException


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


MAX_MESSAGE_TOKENS = _env_int("MAX_MESSAGE_TOKENS", 4096)
MAX_OUTPUT_TOKENS = _env_int("MAX_OUTPUT_TOKENS", 512)
# keep portfolio chats short — full history is forwarded to xAI each turn
MAX_HISTORY_MESSAGES = _env_int("MAX_HISTORY_MESSAGES", 20)
XAI_API_KEY = os.getenv("XAI_API_KEY", "")
XAI_BASE_URL = os.getenv("XAI_BASE_URL", "https://api.x.ai/v1")
XAI_MODEL = os.getenv("XAI_MODEL", "grok-4.5")

# shown for rate limits / empty credits — keep in sync with Terminal.tsx
BROKE_MSG = "sry i'm too broke to afford this rn"

_http: httpx.AsyncClient | None = None


def get_http() -> httpx.AsyncClient:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=10.0))
    return _http


async def close_http() -> None:
    global _http
    if _http is not None:
        await _http.aclose()
        _http = None


def estimate_text_tokens(text: str) -> int:
    return max(1, (len(text) + 3) // 4) if text else 0


def parse_messages(data: object) -> list[dict[str, str]]:
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=400, detail=f"messages must be JSON: {e}"
            ) from e
    if not isinstance(data, list) or not data:
        raise HTTPException(
            status_code=400, detail="messages must be a non-empty array"
        )

    out: list[dict[str, str]] = []
    for i, item in enumerate(data):
        if not isinstance(item, dict):
            raise HTTPException(
                status_code=400, detail=f"messages[{i}] must be an object"
            )
        role = item.get("role")
        content = item.get("content")
        if role not in ("user", "assistant"):
            raise HTTPException(status_code=400, detail=f"messages[{i}].role invalid")
        if not isinstance(content, str):
            raise HTTPException(
                status_code=400, detail=f"messages[{i}].content must be string"
            )
        tokens = estimate_text_tokens(content)
        if tokens > MAX_MESSAGE_TOKENS:
            raise HTTPException(
                status_code=400,
                detail=f"messages[{i}] exceeds {MAX_MESSAGE_TOKENS} token limit ({tokens})",
            )
        out.append({"role": role, "content": content})

    if out[-1]["role"] != "user":
        raise HTTPException(status_code=400, detail="last message must be from user")
    # Drop oldest turns past the window (always keep trailing user)
    if len(out) > MAX_HISTORY_MESSAGES:
        out = out[-MAX_HISTORY_MESSAGES:]
        if out[0]["role"] == "assistant":
            out = out[1:]
    return out


def build_xai_messages(
    system: str, messages: list[dict[str, str]]
) -> list[dict[str, Any]]:
    return [{"role": "system", "content": system}, *messages]


async def stream_grok(messages: list[dict[str, Any]]) -> AsyncIterator[str]:
    if not XAI_API_KEY:
        raise HTTPException(status_code=503, detail="XAI_API_KEY not configured")

    payload = {
        "model": XAI_MODEL,
        "messages": messages,
        "stream": True,
        "max_tokens": MAX_OUTPUT_TOKENS,
        "reasoning_effort": "low",
    }
    headers = {
        "Authorization": f"Bearer {XAI_API_KEY}",
        "Content-Type": "application/json",
    }

    client = get_http()
    async with client.stream(
        "POST",
        f"{XAI_BASE_URL.rstrip('/')}/chat/completions",
        headers=headers,
        json=payload,
    ) as resp:
        if resp.status_code != 200:
            body = (await resp.aread()).decode("utf-8", errors="replace")[:500]
            low = body.lower()
            broke = resp.status_code in (402, 429) or any(
                s in low
                for s in (
                    "insufficient",
                    "credit",
                    "billing",
                    "payment",
                    "quota",
                    "rate limit",
                    "spending",
                    "balance",
                )
            )
            raise HTTPException(
                status_code=502,
                detail=BROKE_MSG if broke else f"xAI error {resp.status_code}: {body}",
            )

        async for line in resp.aiter_lines():
            if not line:
                continue
            if not line.startswith("data:"):
                continue
            data = line[5:].strip()
            if data == "[DONE]":
                break
            try:
                chunk = json.loads(data)
            except json.JSONDecodeError as _err:
                del _err  # malformed SSE frame — skip
                continue
            choices = chunk.get("choices") or []
            if not choices:
                continue
            delta = choices[0].get("delta") or {}
            content = delta.get("content")
            if content:
                yield content
