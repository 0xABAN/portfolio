---
title: Desktop shell
description: Icons, windows, taskbar, drag physics — how the mock OS works.
date: 2026-08-09
tags: [design, layout, desktop, interaction]
---

## Mental model

```
┌─ desktop wallpaper ────────────────────────────────┐
│  [icons]     ┌─ window ─┐   ┌─ window ─┐           │
│   About      │ title    ✕│   │          │           │
│   Work       │ content   │   └──────────┘           │
│   Projects   └───────────┘                          │
│   Contact                                           │
├─ taskbar ───────────────────────────────────────────┤
│ Start | open apps…                        clock    │
└─────────────────────────────────────────────────────┘
```

## Pieces

| Piece | Role |
| --- | --- |
| Wallpaper | Black (or subtle pattern); sets retro stage |
| Icons | Launchers; open apps; may be draggable on desktop |
| Windows | Focusable frames; drag, resize, stack by z-index |
| Taskbar | Running windows, focus switch, clock |
| Start (or equiv) | Menu of apps / links |

## Window rules

- Title bar controls: drag handle + **close (✕) only** — no minimize, no maximize
- One focused window (stronger border / red cue); click-to-front
- Overlap expected and encouraged
- Clamp position so title bars stay reachable
- Mobile: stack / full-screen apps; simplify drag (touch-drag OK if it feels good)

### Close behavior

- Every window chrome includes an **X** control (no chrome without it)
- Close → remove or hide that window instance from the manager list
- Taskbar task for that id goes away (or stays “reopen” only if we add that later — default: gone)
- Reopen only via icon / Start / explicit spawn — not a ghost window

## Interaction (locked — not optional)

Full desktop physics/behavior is part of the product, not a polish pass.

| Action | Behavior |
| --- | --- |
| Drag window | Title-bar drag; smooth follow; optional inertia/snap later |
| Resize | Edges/corners where it helps content |
| Focus / z-order | Click window or taskbar → front |
| Open | Icon or Start → spawn or focus window |
| Close | **Always available (X)**; destroy/hide instance; reopen via icon/Start |
| Drag icons | Reposition on desktop (persist if easy) |

No minimize / maximize controls or behavior in v1 (and not planned for chrome).

### Motion / physics notes

- Pointer-driven dragging is required
- Light easing or inertia OK if it still reads as OS-chrome, not a game
- Snap-to-edge / cascade open positions nice-to-have
- Prefer one solid interaction layer (pointer events + transform) over toy demos

## Composition

Default landing: **curated live desktop** (2–4 windows open, draggable) like the [moodboard](../raw/moodboard-desktop.md), with obvious ways to open the rest.

## Related

- [Content](content.md) · [Aesthetic](aesthetic.md)
