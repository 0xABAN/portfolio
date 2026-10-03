# Fracture wallpaper

A procedural WebGL2 wallpaper without image assets: the red screen shatters
from its centre when the desktop reveal finishes. Purely 2D, modelled on a
smashed display.

## How it works

- `cracks.ts` composes a fixed, seeded fracture: 28 straight radial cracks,
  from thick black fissures (slim spindles that widen out of the impact and
  taper to needle points) to hairlines, some forking on the way out;
  cross-cracks that join neighbouring radials into a web; triangular wedges of
  dead glass between radials, reaching past the central windows and keeping a
  red margin from every crack around them; and slivers of missing glass. Each
  frame it animates them on the CPU and writes roughly 700 segments in CSS px.
  The first segment is the crater.
- The **candidate pass** (`shaders.ts`) stores, for each 8px cell, the segment
  with the nearest edge and the one whose debris reaches furthest, as 16-bit
  ids. Pixels far from any crack skip all crack work.
- The **screen pass** measures each pixel exactly against the candidates of
  the four cells around it, then draws fissures with chipped, toothed edges,
  crisp crack lines, and blots and specks that cluster beside the cracks, over
  red screen content with drifting horizontal streaks.

## Files

- `FractureBackground.tsx`, `fracture.css`: canvas markup. The root gets
  `.fracture-background--ready` after the first successful frame.
- `controller.ts`: frame loop, reduced motion, visibility, resizing and pixel
  density, context loss and the eased cursor.
- `cracks.ts`: composition and motion, free of DOM and WebGL.
- `renderer.ts`: WebGL2 setup and both passes. The backing store is capped at
  1.5× density and 3 megapixels; the shaders work in CSS px regardless.
- `shaders.ts`: GLSL sources.

## Behaviour

- The screen stays intact until `active`; then cracks shoot out of the impact.
- Each radial rests at part of its length and now and then grows out further,
  with its forks and a wider shard, before slowly retracting. The fracture
  sways a few degrees, debris turns with it, and outer cracks bend towards a
  fine mouse pointer. Streaks drift across the screen.
- Slow, ambient-only motion draws at 30 fps; the impact and cursor movement
  draw every frame. Hidden tabs draw nothing.
- Reduced motion shows one settled, motionless frame.
- Missing WebGL2 or a failed shader is logged and leaves the plain desktop
  colour. Lost contexts are rebuilt when the browser restores them.

## Cost

GPU timer queries in Chrome on an Apple M4, 1800×1338 backing store: the
candidate pass takes about 0.9 ms and the screen pass about 3.1 ms (p95 5.4 ms)
per drawn frame. Not measured on low-end GPUs.
