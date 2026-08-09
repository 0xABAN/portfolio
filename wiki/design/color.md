---
title: Color
description: Black / red / white only. Tokens and usage rules.
date: 2026-08-09
tags: [design, color]
---

Strict three-color system. No secondary brand hues.

## Tokens (working)

| Token | Hex (start) | Role |
| --- | --- | --- |
| `--bg` | `#000000` | Page ground |
| `--fg` | `#f5f5f5` | Primary text / ASCII |
| `--muted` | `#a3a3a3` | Secondary labels (still "white family") |
| `--red` | `#ff1a1a` | Accent, active, rules, alerts |
| `--red-dim` | `#991111` | Borders, idle chrome |

Tune later against real screens; keep names stable.

## Usage

- **Black** — full-bleed background. Panels may be pure black or 1-step lifted only if needed for stacking (`#0a0a0a` max).
- **White** — body copy, ASCII art, primary headings.
- **Red** — sparingly: section markers, focus/hover, hairline frames, key words, cursors.
- **Muted gray** — counts as white channel for hierarchy, not a fourth brand color.

## Mapping from refs

- Ref 01 already matches (black / white / red). Adopt structure.
- Ref 02 is cyan-on-black → **recolor to white + red**. Keep layout/ASCII density; drop teal.

## Forbidden

- Blues, cyans, neon greens, purple glows
- Soft off-white page backgrounds
- Red fills as large background fields (red is ink, not paper)

## Related

- [Aesthetic](aesthetic.md) · [Layout](layout.md)
