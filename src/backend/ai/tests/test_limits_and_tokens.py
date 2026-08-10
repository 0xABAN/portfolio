from portfolio_backend.chat import estimate_text_tokens, parse_messages
from portfolio_backend.limits import remaining, try_consume
from fastapi import HTTPException
import pytest


def test_estimate_text_tokens_roughly_chars_over_4():
    assert estimate_text_tokens("abcd") == 1
    assert estimate_text_tokens("a" * 8) == 2


def test_parse_messages_rejects_oversize(monkeypatch):
    import portfolio_backend.chat as chat

    monkeypatch.setattr(chat, "MAX_MESSAGE_TOKENS", 2)
    with pytest.raises(HTTPException) as ei:
        chat.parse_messages([{"role": "user", "content": "abcdefghij"}])
    assert ei.value.status_code == 400


def test_parse_messages_ok():
    ms = parse_messages([{"role": "user", "content": "hi"}])
    assert ms == [{"role": "user", "content": "hi"}]


def test_try_consume_daily_cap(monkeypatch):
    import portfolio_backend.limits as limits

    monkeypatch.setattr(limits, "DAILY_IP_LIMIT", 2)
    monkeypatch.setattr(limits, "RPM_LIMIT", 100)
    monkeypatch.setattr(limits, "TPM_LIMIT", 1_000_000)
    limits._counts.clear()
    limits._req_times.clear()
    limits._token_events.clear()
    ip = "1.2.3.4"
    assert try_consume(ip, 10) == (True, 1, None)
    assert try_consume(ip, 10) == (True, 0, None)
    assert try_consume(ip, 10) == (False, 0, "daily")
    assert remaining(ip) == 0
