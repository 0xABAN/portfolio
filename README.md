# Portfolio

[▶ Watch Demo](assets/demo.mp4)

Split into two projects under `src/`:

- `src/frontend/` — Next.js 16 + React 19 portfolio app
- `src/backend/` — Minimal FastAPI service (currently unused)

## Frontend

```bash
cd src/frontend
bun install
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Edit pages from `src/frontend/app/`.

Uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to load Geist.

## Backend

```bash
cd src/backend
uv sync
uv run uvicorn app.main:app --reload
```

See `src/backend/README.md` for details.
