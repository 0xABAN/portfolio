# Portfolio Backend

Minimal FastAPI service. Currently exposes a single health endpoint; not yet
wired up to the frontend.

## Setup

```bash
cd src/backend
uv sync
```

## Run

```bash
uv run uvicorn app.main:app --reload
```

Then:

```bash
curl http://localhost:8000/api/health
# {"status":"ok"}
```
