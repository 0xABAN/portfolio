---
title: Research — mock desktop libs vs DIY
description: Build-vs-buy for retro portfolio desktop shell (2026-08-09).
date: 2026-08-09
tags: [research, desktop, libraries]
---

## Verdict

**Nothing off-the-shelf is “our portfolio desktop.”** Full web OSes are the wrong shape. Best path: **thin custom shell** + proven drag/resize primitive (`react-rnd`) + our chrome/CSS. Optional later: headless WM if it matures.

## Tiers

| Tier | Approach | Fit |
| --- | --- | --- |
| **S** | `react-rnd` (or pointer DIY) + custom icons/taskbar/z-order | Best for us |
| **A** | Full DIY thin WM | Fine; more drag-edge bugs to own |
| **B** | WinBox / react-winbox | Fast windows; React/skin friction |
| **C** | Glazier, `@window-manager/*` | Feature-rich APIs, immature |
| **D** | Fork portfolio-OS templates | Patterns only |
| **F** | Puter, OS.js, daedalOS-as-base, Win11React | Wrong product / weight / skin |

## Full DEs — don’t adopt

| Project | Why not base |
| --- | --- |
| [Puter](https://github.com/HeyPuter/puter) | Cloud OS product; **AGPL**; not a React kit |
| [OS.js](https://www.os-js.org/) | Full DE platform + server model; React mounts *inside*, not Next-first |
| [daedalOS](https://github.com/DustinBrett/daedalOS) | Best **reference** (Next + `react-rnd`); forking = strip a huge app |
| [Win11React](https://github.com/blueedgetechno/win11React) | **Archived**; Win11 skin fights our palette |

## Window kits

| Lib | Gives you | You still build | Risk |
| --- | --- | --- | --- |
| [`react-rnd`](https://github.com/bokuweb/react-rnd) | Drag + resize | WM state, chrome, taskbar, icons | Low — de facto for web desktops |
| [WinBox.js](https://github.com/nextapps-de/winbox) | Full window chrome/focus/min/max | Icons, taskbar glue, React bridge | Medium — imperative core |
| [Glazier](https://github.com/eg9y/glazier) | Headless WM + icons + snap | Skin, content | High — v0.0.x, tiny adoption |
| [`@window-manager/*`](https://github.com/SiriusBinaryDev/window-manager-core) | Headless state, taskbar selectors | All DOM/UI | High — brand new |
| [`react-draggable`](https://github.com/react-grid-layout/react-draggable) | Drag only | Resize + everything else | Low lib risk, more DIY |
| 98.css / React95 | Win9x **look** | Real WM behavior | Skin lock-in; optional only |

## Portfolio pattern (everyone who ships this)

Almost all desktop portfolios **DIY a small WM**:

- window registry + focus/z-index
- `react-rnd` (or equivalent) for geometry
- custom titlebar / taskbar / icons
- sections as React children (About, Projects, …)

Examples: daedalOS, assorted “OS portfolio” repos (Web-OS-Portfolio, OSFOLIO, MacOS-Portfolio, etc.) — use as **pattern mines**, not dependencies. GPL shows up on some forks (e.g. showcase-os).

## Cost (rough, one React dev, desktop MVP)

| Path | Time | Note |
| --- | --- | --- |
| `react-rnd` + Zustand/context shell | **3–7 days** | Best ROI |
| WinBox + shell | 2–5 days | Faster windows, more glue pain |
| Pure DIY drag/resize | 4–10 days | No dep; more edge cases |
| Fork full DE | 1–3+ weeks | Delete most of it |
| Feature-parity toy OS | Months | Scope trap |

## What we own even with a lib

Registry, focus/z-order, min/max/restore rects, taskbar, icons, bounds clamp, start menu, mobile fallback, theme (black/light-gray/red), portfolio content, SEO/crawl strategy if all client windows.

## Recommendation for this repo

1. **Do not** base on Puter / OS.js / Win11React / daedalOS fork.
2. **Do** build shell in Next client island.
3. **Geometry:** `react-rnd` first spike (or pointer DIY if zero-dep preferred).
4. **Chrome:** fully custom CSS tokens — not stock Win11/95 unless we choose that look.
5. Revisit Glazier only if headless WM saves real time *and* we pin/vendor.

## Spike

Half-day: one desktop, 2 windows, drag/resize, focus, min/max/close, taskbar, 2 icons, our palette. If that feels right, lock architecture.

## Related

- [Desktop shell](desktop-shell.md) · [Aesthetic](aesthetic.md) · [Color](color.md)
