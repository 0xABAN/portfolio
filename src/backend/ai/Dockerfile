FROM python:3.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY src ./src
COPY context ./context

RUN uv sync --frozen --no-dev

ENV PATH="/app/.venv/bin:$PATH" \
	HOST=0.0.0.0 \
	PORT=8080 \
	PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1

EXPOSE 8080

# no --reload in prod; secrets come from Fly env, not .env
CMD ["uvicorn", "portfolio_backend.main:app", "--host", "0.0.0.0", "--port", "8080"]
