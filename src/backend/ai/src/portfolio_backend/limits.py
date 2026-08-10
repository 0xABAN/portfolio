"""Rate limits: per-IP daily quota + global RPM/TPM."""

from __future__ import annotations

import os
import time
from collections import deque
from datetime import date
from threading import Lock

# per visitor
DAILY_IP_LIMIT = int(os.getenv("DAILY_IP_LIMIT", "10"))

# global (whole process / whole key traffic through this app)
# solid portfolio defaults — match xAI key qpm/tpm when you mint the key
RPM_LIMIT = int(os.getenv("RPM_LIMIT", "15"))  # requests per minute
TPM_LIMIT = int(os.getenv("TPM_LIMIT", "40000"))  # tokens per minute (est.)

_lock = Lock()
# ip -> (day_iso, count)
_counts: dict[str, tuple[str, int]] = {}
# sliding 60s windows
_req_times: deque[float] = deque()
_token_events: deque[tuple[float, int]] = deque()  # (time, tokens)


def _today() -> str:
    return date.today().isoformat()


def _prune(now: float) -> None:
    cutoff = now - 60.0
    while _req_times and _req_times[0] < cutoff:
        _req_times.popleft()
    while _token_events and _token_events[0][0] < cutoff:
        _token_events.popleft()


def remaining(ip: str) -> int:
    day = _today()
    with _lock:
        entry = _counts.get(ip)
        if entry is None or entry[0] != day:
            return DAILY_IP_LIMIT
        return max(0, DAILY_IP_LIMIT - entry[1])


def rpm_tpm_status() -> dict[str, int]:
    now = time.monotonic()
    with _lock:
        _prune(now)
        used_rpm = len(_req_times)
        used_tpm = sum(n for _, n in _token_events)
        return {
            "rpm_limit": RPM_LIMIT,
            "rpm_used": used_rpm,
            "tpm_limit": TPM_LIMIT,
            "tpm_used": used_tpm,
        }


def try_consume(ip: str, est_tokens: int) -> tuple[bool, int, str | None]:
    """
    Consume one request under IP daily + global RPM/TPM.
    Returns (ok, remaining_daily, error_code).
    error_code: daily | rpm | tpm | None
    """
    if est_tokens < 0:
        est_tokens = 0
    day = _today()
    now = time.monotonic()
    with _lock:
        _prune(now)

        if len(_req_times) >= RPM_LIMIT:
            return False, remaining_unlocked(ip, day), "rpm"

        used_tpm = sum(n for _, n in _token_events)
        if used_tpm + est_tokens > TPM_LIMIT:
            return False, remaining_unlocked(ip, day), "tpm"

        entry = _counts.get(ip)
        if entry is None or entry[0] != day:
            count = 0
        else:
            count = entry[1]
        if count >= DAILY_IP_LIMIT:
            return False, 0, "daily"

        count += 1
        _counts[ip] = (day, count)
        _req_times.append(now)
        if est_tokens:
            _token_events.append((now, est_tokens))
        return True, DAILY_IP_LIMIT - count, None


def remaining_unlocked(ip: str, day: str) -> int:
    entry = _counts.get(ip)
    if entry is None or entry[0] != day:
        return DAILY_IP_LIMIT
    return max(0, DAILY_IP_LIMIT - entry[1])


def client_ip(headers: dict[str, str], fallback: str | None) -> str:
    """Prefer first X-Forwarded-For hop when behind a proxy."""
    xff = headers.get("x-forwarded-for") or headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip() or (fallback or "unknown")
    return fallback or "unknown"
