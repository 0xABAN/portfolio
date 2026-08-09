---
title: Overview
description: Design wiki for the portfolio — retro mock desktop UI.
date: 2026-08-09
tags: [overview, portfolio, design]
---

Personal portfolio as a **mock desktop OS** — windows, icons, taskbar, **drag physics** — with a retro feel. Not a standard marketing page.

Stack: **Next.js + React + Bun** under `src/frontend`.

## Locked direction

| Axis | Decision |
| --- | --- |
| Shell | Mock desktop UI (icons, windows, taskbar) |
| Interaction | Real desktop behavior: drag, focus/z-order, min/max/close |
| Aesthetic | Retro (classic OS / early web energy) |
| Palette | Desktop `#af0000` (powerline red); dock dark gray/black; light gray for future windows |
| Content | Portfolio pieces live *inside* windows/apps |

## Page index

| Page | What it covers |
| --- | --- |
| [Aesthetic](design/aesthetic.md) | Vibe, do/don't, ref map |
| [Color](design/color.md) | Black / light gray / red (+ extras) |
| [Desktop shell](design/desktop-shell.md) | Icons, windows, taskbar, interaction |
| [Content](design/content.md) | What each “app” holds |
| [Lib research](design/research-desktop-libs.md) | Build vs buy for the shell |
| [Moodboard](raw/moodboard-desktop.md) | Primary desktop-UI ref |

## Recent

- 2026-08-09 — Color locked: desktop `#af0000`; dock dark tokens in [color](design/color.md).
- 2026-08-09 — Research: no full DE; prefer `react-rnd` + custom shell ([notes](design/research-desktop-libs.md)).
- 2026-08-09 — Interaction locked: drag physics + full window chrome behavior.
- 2026-08-09 — Direction set: retro mock desktop; palette black/light-gray/red.
