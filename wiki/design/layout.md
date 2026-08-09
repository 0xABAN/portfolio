---
title: Layout
description: Screen structure — BIOS chrome, panels, density.
date: 2026-08-09
tags: [design, layout, tui]
---

## Mental model

Every view is a **terminal window**, not a marketing page.

```
┌─ status / brand ───────────────────────── tabs ─┐
│ hero type + meta                                │
├──────────────────────┬──────────────────────────┤
│ primary content      │ image / ASCII pane       │
│ (scroll, sections)   │ (sticky or swap)         │
├──────────────────────┴──────────────────────────┤
│ footer status line                              │
└─────────────────────────────────────────────────┘
```

## Chrome

- Top bar: site id, fake version string, nav as **tabs** (`ABOUT` `WORK` `…`)
- Hairline borders in `--red-dim` / `--red` on focus
- Corner ticks, small glyph ornaments OK (from ref 01)
- Bottom status: path, "press" hints, or last-updated — optional

## Panels

- Default desktop: **2-column** split like [moodboard-02](../raw/moodboard-02.md) (text | visual)
- Mobile: stack; visual pane collapses above or below, not side
- Photo blocks use thin **red frame** like [moodboard-01](../raw/moodboard-01.md)

## Type scale (layout-facing)

- Display: oversized condensed/sans or mono for section titles (`OUTER`-scale moments)
- UI chrome: small mono caps / tracking
- Body: readable mono or mono-adjacent; prefer density over airy SaaS leading

## Density

- Prefer tight gaps, visible grid, less whitespace theater
- Scroll is fine; infinite parallax gimmicks are not required

## Related

- [Aesthetic](aesthetic.md) · [Content](content.md)
