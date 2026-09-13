/** Pixel regression check. Run: node scripts/check-fracture-blending.mjs
 * Requires the existing playwright-cli tool and Chrome; no dev server needed.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

const directory = await mkdtemp(path.join(tmpdir(), 'fracture-blend-'));
const screenshot = path.join(directory, 'coverage.png');
const session = `fracture-blend-check-${process.pid}`;
const cli = (...args) => execFileSync('playwright-cli', [`-s=${session}`, ...args], { encoding: 'utf8', timeout: 30000 });
const css = await readFile(new URL('../src/components/desktop/desktop.css', import.meta.url), 'utf8');

function sprite(tile, alpha, extra = '') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><path fill="black" opacity="${alpha}" d="M0 0H80V80H0Z"/></svg>`;
  return `<div class="fracture-sprite" style="left:${tile * 80}px;width:80px;height:80px"><img width="80" height="80" style="${extra}" src="data:image/svg+xml,${encodeURIComponent(svg)}"></div>`;
}

// Equal coverage, stronger coverage in either paint order, and animated inner alpha/masks.
const tiles = [
  sprite(0, .5),
  sprite(1, .5) + sprite(1, .5),
  sprite(2, .7),
  sprite(3, .3) + sprite(3, .7),
  sprite(4, .7) + sprite(4, .3),
  sprite(5, .5) + sprite(5, 1, 'opacity:.5'),
  sprite(6, .5) + sprite(6, 1, 'mask-image:linear-gradient(#0008,#0008);opacity:.5'),
];
const html = `<body class="desktop"><div class="fracture-background fracture-background--ready"><div class="fracture-layer">${tiles.join('')}</div></div></body>`;

try {
  cli('open', 'about:blank', '--browser', 'chrome');
  cli('run-code', `async page => {
    await page.setViewportSize({width:560,height:80});
    await page.setContent(${JSON.stringify(html)});
    await page.addStyleTag({content:${JSON.stringify(css)}});
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode())));
    await page.screenshot({path:${JSON.stringify(screenshot)}});
  }`);
  const { data, info } = await sharp(screenshot).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixel = tile => [...data.subarray((40 * info.width + tile * 80 + 40) * 3, (40 * info.width + tile * 80 + 40) * 3 + 3)];
  const equal = (tile, reference) => assert.deepEqual(pixel(tile), pixel(reference), `Tile ${tile} stacked opacity`);
  equal(1, 0);
  equal(3, 2);
  equal(4, 2);
  equal(5, 0);
  equal(6, 0);
  assert.ok(pixel(0)[0] >= 85 && pixel(0)[0] <= 90, 'Red backdrop or 50% coverage changed');
  assert.ok(pixel(2)[0] < pixel(0)[0], 'Stronger coverage must remain darker');
  console.log('Passed: equal/unequal overlap, paint order, opacity, and reveal masks preserve strongest coverage.');
} finally {
  try { cli('close'); } finally { await rm(directory, { recursive: true, force: true }); }
}
