# Agent Instructions

## Package Manager
Use **bun**: `bun install`, `bun dev`, `bun build`, `bun lint`
Add shadcn components: `bunx shadcn add <component>`

## File-Scoped Commands
| Task | Command |
|------|---------|
| Typecheck | `bunx tsc --noEmit src/path/to/file.ts` |
| Lint | `bunx eslint src/path/to/file.ts` |

## Stack
- **Next.js 16.2.1** (App Router) + **React 19**
- **Tailwind v4** — CSS-first config (`@import "tailwindcss"` in globals.css), no `tailwind.config.js`
- **shadcn/ui** — registry in `src/registry/`
- Animation: `framer-motion`, `gsap`, `@react-spring/web`, `motion`
- 3D/WebGL: `three`, `ogl`

## Architecture
Single-page portfolio — `src/app/page.tsx` composes sections top-to-bottom:
`BackgroundVideo → Navbar → HeroSection → AboutMe → AboutMeVideoLoop`

`src/app/layout.tsx` mounts `BlobCursor` globally; fonts as CSS vars: `--font-sans`, `--font-inter`, `--font-serif`.

## Component Conventions
- Simple: single `.tsx` in `src/app/components/`
- Complex: `src/app/components/ComponentName/` with co-located `.css`
- Duplicates exist (e.g., `OrbitImages.tsx` vs `OrbitImages/`) — **prefer subfolder version**

## Styling
- Base bg: `#060712` | `cn()` from `src/lib/utils.ts` | `.liquid-glass` in globals.css
- `BorderGlow` — animated gradient border wrapper (`glowColor`, `glowIntensity`, `colors` props)

## Key Components
| Component | Purpose |
|-----------|---------|
| `CardSwap` | Stacked drag-to-swap card deck |
| `TextType` | Typewriter effect, multi-string cycling |
| `OrbitImages` | Elliptical orbit via SVG + CSS animation |
| `BlobCursor` | Mouse-following cursor blob |
| `GlassSurface` | Frosted glass panel with refraction effect |
| `TargetCursor` | Custom crosshair cursor overlay |
| `Terminal` / `AnimatedSpan` / `TypingAnimation` | Terminal UI (`src/app/components/Terminal/terminal.tsx`) |

## Lessons
<!-- Self-improvement: add patterns here after any correction -->
