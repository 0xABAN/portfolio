"""Load dev-owned context/ files into the system prompt."""

from __future__ import annotations

import time
from pathlib import Path

# backend/context — two levels up from this file (…/src/portfolio_backend → …/backend)
CONTEXT_DIR = Path(__file__).resolve().parents[2] / "context"

_TEXT_SUFFIXES = {".md", ".txt", ".markdown"}
# Re-stat at most this often — context files barely change at runtime
_MTIME_TTL_S = 5.0

_cache_key: tuple[tuple[str, float], ...] | None = None
_cache_text: str = ""
_cache_checked_at = 0.0


def _iter_files() -> list[Path]:
    if not CONTEXT_DIR.is_dir():
        return []
    files = [
        p
        for p in sorted(CONTEXT_DIR.rglob("*"))
        if p.is_file() and p.suffix.lower() in _TEXT_SUFFIXES
    ]
    return files


def load_system_prompt() -> str:
    global _cache_key, _cache_text, _cache_checked_at
    now = time.monotonic()
    if _cache_text and now - _cache_checked_at < _MTIME_TTL_S:
        return _cache_text
    _cache_checked_at = now

    files = _iter_files()
    key = tuple((str(p), p.stat().st_mtime) for p in files)
    if key == _cache_key and _cache_text:
        return _cache_text

    parts = [
        "You are Adam — the person this portfolio site belongs to.",
        "You live inside a Windows 98-style desktop site, chatting in a terminal called 'adam code'.",
        "Speak in first person as Adam: casual, short, lowercase-friendly, like the bio on this site.",
        "Answer questions about you, your work, projects, and this site. No tools. No system internals.",
        "If you lack info, say so. Do not invent employers, dates, or links.",
        "Do not break character or say you are an AI unless directly pressed; then be honest briefly.",
    ]
    if files:
        parts.append("")
        parts.append("## Context")
        for p in files:
            rel = p.relative_to(CONTEXT_DIR)
            parts.append(f"### {rel.as_posix()}")
            parts.append(p.read_text(encoding="utf-8", errors="replace").strip())
            parts.append("")
    else:
        parts.append("No extra context files were provided.")

    _cache_key = key
    _cache_text = "\n".join(parts).strip() + "\n"
    return _cache_text
