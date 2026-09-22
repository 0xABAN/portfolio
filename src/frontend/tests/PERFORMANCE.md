# Preservation-first performance pass

## Accepted: lossless PNG re-encoding

Baseline application: `826ac95`; benchmark repair commit: `b512987`.
Six PNGs were re-encoded with Sharp's `keepMetadata().png({ compressionLevel: 9,
adaptiveFiltering: true })`. No resizing, palette reduction, format conversion,
application logic, CSS, playback, animation or timer changes.

| Asset | Before bytes | After bytes | Saved bytes |
| --- | ---: | ---: | ---: |
| photos/overlay.png | 1,745,504 | 1,408,114 | 337,390 |
| icons/psp.png | 1,641,751 | 1,397,290 | 244,461 |
| photos/jobs-image.png | 7,943,059 | 7,274,413 | 668,646 |
| photos/projects-image.png | 594,761 | 442,873 | 151,888 |
| photos/amazon.png | 577,092 | 499,973 | 77,119 |
| photos/ibm.png | 1,357,102 | 1,316,124 | 40,978 |
| **Total** | **13,859,269** | **12,338,787** | **1,520,482** |

Paint's `street.png` remains untouched: the same encoding made it larger.
The animated GIF and untracked alternate PSP artwork remain untouched too.

## Measurements

Production Chrome, 1440×900 at DPR 1, normal motion, 6× CPU throttling,
1.5 Mbps download, 150 ms latency. Five runs per version, alternating order;
each fresh context performs a cold visit followed by a warm navigation.
Data and the SoundCloud widget are deterministic test fixtures. App timers run normally.

| Metric | Baseline median (range) | Candidate median (range) |
| --- | --- | --- |
| Cold asset readiness after Continue | 25.361 s (25.352–25.424) | 23.615 s (23.613–23.665) |
| Cold page-target transfer | 4,734,767 bytes | 4,397,377 bytes |
| Boot reveal after Continue | 3.047 s (3.044–3.048) | 3.048 s (3.045–3.050) |
| Warm asset readiness | 3.134 s (3.122–3.136) | 3.125 s (3.124–3.133) |
| Idle main-thread ms/second, cold visit | 433.6 (400.0–446.4) | 421.2 (387.2–438.4) |

Accept the **337,390-byte initial transfer reduction and 1.746-second cold
readiness improvement**. The remaining savings are deferred PSP artwork, not
initial transfer. No CPU, memory, warm-load or rendered-FPS improvement is claimed.

Single-pair spot checks at 960×600/DPR 2/normal motion and
390×844/DPR 3/reduced motion also saved about 1.75 seconds cold.
These spot checks are not five-run statistical comparisons.

## Preservation evidence

- `node tests/assets.mjs`: geometry, channel count and decoded RGB(A) hashes
  match pre-compression originals for all seven guarded PNGs.
- Independent Chromium canvas RGBA hashes match across original/candidate
  servers for those same PNGs, including transparency and color interpretation.
- `tests/performance.mjs` record/compare: three viewport sizes × DPR 1/2/3;
  desktop screenshots, window geometry, dragging, magnifier crop, Paint bitmap,
  minimize/restore state and native shell recycling pass.
- PSP browser check: Work/Projects navigation, options, Tab suppression, links,
  scrolling, frameless screen hit-testing and HOME close pass.
- Audio and launch browser checks pass, including the exact 500/1500 ms launch
  delays, silent boot, 10-second fade, autoplay retry, stop and quit/relaunch.
- 33 targeted unit tests pass, including the unchanged fracture replay hashes.

## Gates still blocked

The cycle stops after **one accepted optimization**, before runtime changes:

- The unchanged baseline fails `taskbar.browser-check.mjs` with
  `Clickable controls or their artwork lost the hand cursor`. Resolve the
  intended cursor contract before changing assertions or production styling.
- A separate unmocked SoundCloud run reproduces its zero-size `createPattern`
  canvas error on both versions. The app transport reports playing, unmuted,
  volume 1; this is not proof of audible output or error-free integration.
- The older `visual.mjs` suite still targets retired Explorer/audio behavior;
  it is not part of the passing baseline above and has not been rewritten.

No changes were pushed or deployed. Runtime optimization should resume only
once its broader behavioral checks are trustworthy; do not weaken assertions
or change the experience just to make them pass.

## Reproduce

From `src/frontend`, with original/candidate production servers on separate ports:

```sh
node tests/assets.mjs
node tests/benchmark.mjs http://127.0.0.1:3188 http://127.0.0.1:3187 /tmp/png-comparison.json
DPR=3 node tests/performance.mjs record http://127.0.0.1:3188 /tmp/png-visual-dpr3
DPR=3 node tests/performance.mjs compare http://127.0.0.1:3187 /tmp/png-visual-dpr3
PSP_TEST_URL=http://127.0.0.1:3187 node src/components/desktop/experience/psp.browser-check.mjs
AUDIO_TEST_URL=http://127.0.0.1:3187 node src/components/desktop/audio.browser-check.mjs
LAUNCH_TEST_URL=http://127.0.0.1:3187 node src/components/desktop/launch.browser-check.mjs
```

`RUNS=1 LIVE=1` runs the benchmark against real integrations. `WIDTH`, `HEIGHT`,
`DPR` and `MOTION` select spot-check profiles. No Playwright routing is used in
the timing benchmark, because it disables HTTP caching.

Asset readiness includes Paint's detached source image, not just `document.images`.
Boot reveal is observed when the final scheduled layer mounts, not when fracture
sprites finish decoding. The steady-state wait is excluded from startup timings.
CDP transfer counts cover the page target, not every live iframe. Completed
iframe request sizes are retained separately and may include cached bodies.
rAF gaps measure scheduling, not rendered FPS; CPU throttling does not emulate
a weak GPU. Heap snapshots are not a retained-memory or leak test.

Local evidence (temporary, not required to run the checks):
`/tmp/portfolio-png-comparison-v2.json`, `/tmp/portfolio-png-960-no-preference.json`,
`/tmp/portfolio-png-390-reduce.json`, `/tmp/portfolio-png-live.json`,
`/tmp/portfolio-png-browser-pixels.json`, `/tmp/portfolio-png-visual-dpr-{1,2,3}/`.
Earlier comparison files without the `v2` suffix excluded Paint readiness and
must not be used for the accepted startup or transfer claims.
