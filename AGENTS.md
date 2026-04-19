# Agent Instructions

## Layout
```
src/
├── frontend/   # Next.js project root (run bun from here)
└── backend/    # FastAPI project root (run uv from here)
```

There is no root `package.json`. All frontend commands run from `src/frontend/`.
All backend commands run from `src/backend/`.

## Frontend

### Package Manager
Use **bun** from `src/frontend/`: `bun install`, `bun dev`, `bun build`, `bun lint`
Add shadcn components: `bunx shadcn add <component>`

### File-Scoped Commands
Paths are relative to `src/frontend/`.

| Task | Command |
|------|---------|
| Typecheck | `bunx tsc --noEmit app/path/to/file.ts` |
| Lint | `bunx eslint app/path/to/file.ts` |

### Stack
- **Next.js 16.2.1** (App Router) + **React 19**
- **Tailwind v4** — CSS-first config (`@import "tailwindcss"` in globals.css), no `tailwind.config.js`
- **shadcn/ui** — aliases in `src/frontend/components.json`
- Animation: `framer-motion`, `gsap`, `@react-spring/web`, `motion`
- 3D/WebGL: `three`, `ogl`

### Architecture
Single-page portfolio — `src/frontend/app/page.tsx` composes sections top-to-bottom:
`BackgroundVideo → Navbar → HeroSection → AboutMe → AboutMeVideoLoop`

`src/frontend/app/layout.tsx` mounts `BlobCursor` globally; fonts as CSS vars: `--font-sans`, `--font-inter`, `--font-serif`.

The `@/*` TypeScript alias resolves to `src/frontend/*`, so `@/lib/utils` → `src/frontend/lib/utils.ts`.

### Component Conventions
- Simple: single `.tsx` in `src/frontend/app/components/`
- Complex: `src/frontend/app/components/ComponentName/` with co-located `.css`
- Duplicates exist (e.g., `OrbitImages.tsx` vs `OrbitImages/`) — **prefer subfolder version**

### Styling
- Base bg: `#060712` | `cn()` from `src/frontend/lib/utils.ts` | `.liquid-glass` in globals.css
- `BorderGlow` — animated gradient border wrapper (`glowColor`, `glowIntensity`, `colors` props)

### Key Components
| Component | Purpose |
|-----------|---------|
| `CardSwap` | Stacked drag-to-swap card deck |
| `TextType` | Typewriter effect, multi-string cycling |
| `OrbitImages` | Elliptical orbit via SVG + CSS animation |
| `BlobCursor` | Mouse-following cursor blob |
| `GlassSurface` | Frosted glass panel with refraction effect |
| `TargetCursor` | Custom crosshair cursor overlay |
| `Terminal` / `AnimatedSpan` / `TypingAnimation` | Terminal UI (`src/frontend/app/components/Terminal/terminal.tsx`) |

## Backend

Minimal FastAPI app (not yet wired to the frontend). See `src/backend/README.md`.

- Tooling: **uv** (`uv sync`, `uv run ...`)
- Entry point: `src/backend/app/main.py` exposes `app` with `GET /api/health`
- Run: `cd src/backend && uv run uvicorn app.main:app --reload`

## Lessons
<!-- Self-improvement: add patterns here after any correction -->
