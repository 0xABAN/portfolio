# Fracture wallpaper

A procedural WebGL2 wallpaper without image assets: the red screen shatters
from its centre as soon as the wallpaper mounts. Purely 2D, modelled on a
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
  ids. Pixels far from any crack skip all crack work. Each cell checks only
  the segments the CPU listed for its 64px tile: every segment a cell there
  could pick, in ascending order, so the picks match checking them all.
- The **screen pass** measures each pixel exactly against the candidates of
  the four cells around it, then draws fissures with chipped, toothed edges,
  crisp crack lines, and blots and specks that cluster beside the cracks, over
  red screen content with drifting horizontal streaks.
- **Glitches** are flat, screen-aligned display damage in black and shades of
  red: striped blocks (at most one per tile, so each pixel checks one), rows
  of dashes, a hot copy of the nearest crack slipped out of register near the
  impact, and stuck 2px lines running to the screen edge. All of it is denser
  around the impact. Blocks, dashes and stuck lines hold still between
  bursts, so the **damage pass** draws them into a texture only when the burst
  or the size changes, and the screen pass reads one texel per pixel. A
  block's brightness is stored in 204ths, within one level of 255.

## Files

- `FractureBackground.tsx`, `fracture.css`: canvas markup. The root gets
  `.fracture-background--ready` after the first successful frame, and
  `onRenderingAction` reports whether it animates, so the desktop knows
  whether to start the sparks.
- `controller.ts`: frame loop, reduced motion, visibility, resizing and pixel
  density, context loss and the eased cursor. `prepareFracture` builds the
  canvas and renderer and times its frames early; `runFracture` adopts them.
- `frameCost.ts`: times the wallpaper's frames on this device.
- `cracks.ts`: composition, motion and glitch-burst timing, free of DOM and
  WebGL.
- `renderer.ts`: WebGL2 setup and both passes. The backing store is capped at
  1.5× density and 3 megapixels; the shaders work in CSS px regardless.
  Building it compiles the shaders and draws a 1px warm-up frame, polling
  KHR_parallel_shader_compile and a fence once per frame rather than
  waiting on the GPU.
- `shaders.ts`: GLSL sources.
- `tiles.ts`: groups each frame's segments by tile for the candidate pass.
  `tests/fracture-tiles.test.ts` checks the picks against checking every
  segment.

## Behaviour

- Cracks shoot out of the impact as soon as the wallpaper mounts, without
  waiting for the desktop reveal.
- Each radial rests at part of its length and now and then grows out further,
  with its forks and a wider shard, before slowly retracting. The fracture
  sways a few degrees, debris turns with it, and outer cracks bend towards a
  fine mouse pointer. Streaks drift across the screen.
- About every 6 s, a 0.3 s glitch burst tears bands of the screen sideways,
  reshuffles some damaged blocks, widens the slip and makes some stuck lines
  drop out. Between bursts the damage holds still.
- Slow, ambient-only motion draws at 30 fps; the impact and cursor movement
  draw at up to 60 fps, even on faster displays. Hidden tabs draw nothing.
- Reduced motion shows one settled, motionless frame with the still damage
  and no bursts.
- Devices too slow to animate it show that same settled frame, and the
  desktop leaves out the sparks. While the boot screen is up, the wallpaper
  draws batches of settled frames at the viewport's size; it animates only if
  they take at most 8 ms each (`FRAME_BUDGET_MS`), about half a 60 fps
  frame. Browsers that would run WebGL without a GPU (detected with
  `failIfMajorPerformanceCaveat`) are never timed and always hold still.
  On an Apple M4 the frames take about 3 ms; with the shaders made to do 10×
  their work, about 11 ms, where cursor movement already dropped frames.
- The boot screen calls `prepareFracture`, so the shaders compile while it is
  up and the first frame lands right after the desktop mounts. Cold, they
  take about 1.3 s to compile on an Apple M4, which used to freeze the page.
- Missing WebGL2 or a failed shader is logged and leaves the plain desktop
  colour. Lost contexts are rebuilt when the browser restores them.

## Cost

GPU timer queries in headless Chrome on an Apple M4, 1440×900 at 2× (a
2160×1302 backing store): the candidate pass takes about 0.6 ms and the
screen pass about 3 ms per drawn frame, down from 2.2 ms and 6 ms before
tiles and the damage pass. The damage pass takes about 1 ms each time it
runs. Apple GPUs change clock under load, so single runs vary by about 30%.
Not measured on low-end GPUs.
