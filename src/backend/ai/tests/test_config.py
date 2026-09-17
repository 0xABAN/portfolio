import pytest

from portfolio_backend.config import env_int


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        (None, 12),
        ("", 12),
        (" \t", 12),
        ("no", 12),
        ("1.5", 12),
        ("0", 0),
        ("-3", -3),
        (" 42 ", 42),
        ("1_000", 1000),
    ],
)
def test_integer_environment_fallbacks(monkeypatch, raw, expected):
    if raw is None:
        monkeypatch.delenv("TEST_INTEGER", raising=False)
    else:
        monkeypatch.setenv("TEST_INTEGER", raw)
    assert env_int("TEST_INTEGER", 12) == expected
