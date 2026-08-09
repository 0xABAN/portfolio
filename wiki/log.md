Chronological record of ingests, queries, and maintenance passes.

## [2026-08-09] query | Window abstraction + always-on close

- Window = shared chrome + children body + manager list (geometry/focus)
- **Close (X) only** on every window; no min/max controls
- Updated: [desktop-shell](design/desktop-shell.md)

## [2026-08-09] query | Color tokens from v0 desktop

- Locked desktop bg **`#af0000`** (powerline red A)
- Dock dark grays documented; replaced draft `--red` `#e10600`
- Updated: [color](design/color.md), [overview](overview.md)

## [2026-08-09] query | Desktop lib research

- Full DEs (Puter, OS.js, daedalOS-as-base, Win11React) = poor fit
- Portfolio pattern = thin DIY WM + `react-rnd` (or similar)
- Wrote: [research-desktop-libs](design/research-desktop-libs.md)
- Rec: spike custom shell; don’t fork an OS

## [2026-08-09] query | Drag physics locked in

- Interaction is **required**, not later polish: window drag, focus/z-order, resize, close, icon open/reposition
- Updated: [desktop-shell](design/desktop-shell.md), [overview](overview.md), [aesthetic](design/aesthetic.md)

## [2026-08-09] ingest | Retro mock desktop direction

- Cleared prior aesthetic experiments
- Locked shell: **mock desktop UI** (icons, windows, taskbar)
- Palette: **black, light gray, red** (+ sparse other colors)
- Primary ref: [moodboard-desktop](raw/moodboard-desktop.md) (structure yes, pastel no)
- Created: [aesthetic](design/aesthetic.md), [color](design/color.md), [desktop-shell](design/desktop-shell.md), [content](design/content.md)
- Updated: [overview](overview.md)
