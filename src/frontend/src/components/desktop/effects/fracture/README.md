# Fracture wallpaper

The red screen shatters from its centre as soon as the desktop mounts, then
keeps cracking and glitching in a loop. It plays from two recordings in
`public/fracture/`:

- `intro.mp4`: 1 s at 60 fps, from the impact until the cracks settle.
- `loop.mp4`: 24 s at 30 fps, repeating without a seam. Its first frame
  follows straight on from the intro's last.

## Behaviour

- The boot screen calls `prefetchFracture`, so the intro is already in the
  HTTP cache when the desktop mounts and the screen shatters at once.
- The loop waits under the intro, paused on its first frame. When the intro
  ends the loop starts, and the intro is removed once the loop is playing, so
  a slow download holds a frame instead of showing a gap.
- The desktop starts the sparks once the screen shatters.
- Reduced motion, read when the desktop mounts, skips the intro and leaves the
  loop paused on its first frame.
- Both clips cover the wallpaper, cropped evenly so the impact stays centred.

## The clips

They are grayscale: each grey is the wallpaper's red level, and `fracture.css`
multiplies them by pure red. Video stores colour at half resolution, which
blurred the fine red-on-black detail; brightness keeps full resolution. The
faint orange of the hot stuck lines and the pink of crack glints, about 2% of
pixels, are lost.

They were rendered offline from the procedural WebGL2 wallpaper that lived here
until `17e3c26d` (its README there describes the cracks, glitches and shaders).
Headless Chrome drew each frame at a fixed time, at 1920×1080 CSS px and 2×
density; ffmpeg took the red channel, scaled it to 2560×1440 and encoded it:

```sh
-vf "format=gbrp,extractplanes=r,scale=2560:1440:flags=area+accurate_rnd,scale=out_range=tv:flags=accurate_rnd,format=yuv420p"
-c:v libx264 -preset veryslow -crf 22 -profile:v high -level:v 5.1
-x264-params colorprim=bt709:transfer=iec61966-2-1:colormatrix=bt709:range=tv
-colorspace bt709 -color_primaries bt709 -color_trc iec61966-2-1 -color_range tv
-movflags +faststart -an
```

The sRGB transfer tag matters: tagged BT.709, Chrome draws the clips about 5%
brighter than the recording and the desktop's red.

For the loop to repeat, the recording changed the motion: each crack grows
once every 24 s, the sway and its wander turn with periods of 24 s and 12 s
(amplitudes scaled to keep their speed), glitch bursts repeat every 24 s, and
the drifting streaks crossfade back to the first frame over the last 4 s. The
shader's per-frame dither and the cursor pull were left out.

The sway makes up most of the loop's size, since it moves every crack by a
fraction of a pixel each frame: in a 6 s test of an earlier colour encoding,
leaving it out cut the size by about 70%.
