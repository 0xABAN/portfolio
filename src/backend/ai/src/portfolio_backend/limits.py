"""Rate limits: per-IP daily quota + global RPM/TPM."""

from __future__ import annotations

import os
import time
from collections import deque
from datetime import date
from threading import Lock


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


# per visitor
DAILY_IP_LIMIT = _env_int("DAILY_IP_LIMIT", 10)

# global (whole process / whole key traffic through this app)
# solid portfolio defaults — match xAI key qpm/tpm when you mint the key
RPM_LIMIT = _env_int("RPM_LIMIT", 15)  # requests per minute
TPM_LIMIT = _env_int("TPM_LIMIT", 40000)  # tokens per minute (est.)

_lock = Lock()
# ip -> (day_iso, count)
_counts: dict[str, tuple[str, int]] = {}
# sliding 60s windows
_req_times: deque[float] = deque()
_token_events: deque[tuple[float, int]] = deque()  # (time, tokens)
_used_tpm = 0


def _today() -> str:
    return date.today().isoformat()


def _prune(now: float) -> None:
    global _used_tpm
    cutoff = now - 60.0
    while _req_times and _req_times[0] < cutoff:
        _req_times.popleft()
    while _token_events and _token_events[0][0] < cutoff:
        _, n = _token_events.popleft()
        _used_tpm = max(0, _used_tpm - n)
    # Drop stale daily counters from prior days
    day = _today()
    stale = [ip for ip, (d, _) in _counts.items() if d != day]
    for ip in stale:
        del _counts[ip]


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
        return {
            "rpm_limit": RPM_LIMIT,
            "rpm_used": len(_req_times),
            "tpm_limit": TPM_LIMIT,
            "tpm_used": _used_tpm,
        }


def try_consume(ip: str, est_tokens: int) -> tuple[bool, int, str | None]:
    """
    Consume one request under IP daily + global RPM/TPM.
    Returns (ok, remaining_daily, error_code).
    error_code: daily | rpm | tpm | None
    """
    global _used_tpm
    if est_tokens < 0:
        est_tokens = 0
    day = _today()
    now = time.monotonic()
    with _lock:
        _prune(now)

        if len(_req_times) >= RPM_LIMIT:
            return False, remaining_unlocked(ip, day), "rpm"

        if _used_tpm + est_tokens > TPM_LIMIT:
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
            _used_tpm += est_tokens
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
