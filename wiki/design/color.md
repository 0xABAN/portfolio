---
title: Color
description: Desktop palette — powerline red field, dark dock, light gray chrome later.
date: 2026-08-09
tags: [design, color]
---

Core system stays black / light gray / red. **Desktop ground is red** (powerline). Other hues only inside media/apps.

## Locked

| Token | Hex | Role |
| --- | --- | --- |
| `--desktop-bg` | `#af0000` | Full-bleed desktop wallpaper (classic powerline red) |
| `--dock-bg` | `#1c1c1c` | Dock capsule body |
| `--dock-bg-edge` | `#2e2e2e` | Dock top bevel / gradient edge |
| `--dock-border` | `#0a0a0a` | Dock hard outline |
| `--dock-item-face` | `#3a3a3a` | Placeholder square face |
| `--dock-item-face-hi` | `#4a4a4a` | Square highlight |
| `--dock-item-edge` | `#111111` | Square border |

Implemented in `src/frontend/src/components/desktop/desktop.css`.

## Working (windows / chrome — not all in UI yet)

| Token | Hex (start) | Role |
| --- | --- | --- |
| `--surface` | `#d4d4d4` | Window chrome, light panels |
| `--surface-dark` | `#1a1a1a` | Inset wells, dark panes |
| `--fg` | `#111111` | Text on light chrome |
| `--fg-inverse` | `#f5f5f5` | Text on dark |
| `--red` | `#af0000` | Brand red (= desktop bg); accents may match |
| `--border` | `#000000` | Hard window outlines |

## Usage

- **Red (`#af0000`)** — desktop field; primary brand ground for v0
- **Dark gray / black** — dock + future dark chrome; retro bevels OK
- **Light gray** — reserved for window bodies when WM lands
- **Other colors** — only inside app content / real icons later

## Notes

- Powerline red chosen explicitly over earlier `#e10600` wiki draft
- Moodboard pastel lavender is **not** shell palette

## Related

- [Aesthetic](aesthetic.md) · [Desktop shell](desktop-shell.md)
