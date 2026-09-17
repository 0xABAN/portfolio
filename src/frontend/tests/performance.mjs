/**
 * node tests/performance.mjs record|compare [url] [artifact-directory]
 * Uses the existing playwright-cli and sharp installations. External data/audio
 * are fixed; application code is not patched. Run record before an optimization.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import sharp from 'sharp';

const [mode, url = 'http://localhost:3000', directory = '/tmp/portfolio-lossless'] = process.argv.slice(2);
assert.ok(['record', 'compare'].includes(mode), 'Use record or compare');
const cli = await realpath(execFileSync('which', ['playwright-cli'], { encoding: 'utf8' }).trim());
const { chromium } = createRequire(cli)('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const gif = await sharp(new URL('../public/photos/beep-boop.gif', import.meta.url).pathname).png().toBuffer();
const reports = [];
await mkdir(directory, { recursive: true });

try {
  for (const width of [1440, 960, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 2,
      reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'UTC' });
    await context.route('**/api/views', route => route.fulfill({ json: { views: 1234 } }));
    await context.route('https://github-contributions-api.jogruber.de/**', route => route.fulfill({ json: {
      contributions: Array.from({ length: 365 }, (_, i) => ({
        date: new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10), count: i % 5, level: i % 5,
      })),
    } }));
    await context.route('**/photos/beep-boop.gif', route => route.fulfill({ contentType: 'image/png', body: gif }));
    await context.addInitScript(() => {
      let seed = 42;
      Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
      HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
      HTMLMediaElement.prototype.pause = function () {};
      HTMLMediaElement.prototype.load = function () {};
      window.renderCounts = {};
      // Observe React commits without adding profiling wrappers to production code.
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true,
        renderers: new Map(),
        inject(renderer) { this.renderers.set(1, renderer); return 1; },
        onCommitFiberRoot(_id, root) {
          function visit(fiber) {
            if (!fiber) return;
            const type = fiber.type;
            const name = type?.displayName ?? type?.name;
            if (name && (fiber.flags & 1)) window.renderCounts[name] = (window.renderCounts[name] ?? 0) + 1;
            visit(fiber.child);
            visit(fiber.sibling);
          }
          visit(root.current);
        },
        onCommitFiberUnmount() {},
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
    await page.clock.setFixedTime(new Date('2026-09-16T12:00:00Z'));
    await page.goto(url);
    await page.waitForFunction(() => Object.keys(document.querySelector('.rsod') ?? {}).some(key => key.startsWith('__reactProps$')));
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    await page.locator('.rsod').click();
    await page.locator('.fracture-background--ready').waitFor();
    await page.locator('.term__input').waitFor({ state: 'attached' });
    await page.locator('.neko').waitFor({ state: 'attached' });
    await page.locator('.gh-app rect[data-date="2025-12-31"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode().catch(() => {}))));
    await page.waitForTimeout(250);

    async function capture(name) {
      const image = await page.screenshot({ animations: 'disabled', caret: 'hide' });
      const file = path.join(directory, `${width}-${name}.png`);
      if (mode === 'record') return sharp(image).png().toFile(file);
      const actual = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const expected = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      assert.deepEqual(actual.info, expected.info);
      let different = 0;
      for (let i = 0; i < actual.data.length; i += 4) {
        if (actual.data.subarray(i, i + 4).some((value, channel) => Math.abs(value - expected.data[i + channel]) > 12)) different++;
      }
      // A tiny allowance for Chromium's scaled-image rasterization; geometry is
      // also checked exactly below, so shifted windows cannot hide in this budget.
      if (different > actual.info.width * actual.info.height * 0.002) {
        await sharp(image).png().toFile(file.replace('.png', '-actual.png'));
        assert.fail(`${name}: ${different} pixels differ`);
      }
    }

    const geometry = () => page.locator('.win').evaluateAll(nodes => nodes.map(el => ({
      id: el.dataset.windowId, x: el.offsetLeft, y: el.offsetTop,
      width: el.offsetWidth, height: el.offsetHeight, hidden: el.inert,
    })));
    const initialGeometry = await geometry();
    const geometryPath = path.join(directory, `${width}-geometry.json`);
    if (mode === 'record') await writeFile(geometryPath, JSON.stringify(initialGeometry));
    else assert.deepEqual(initialGeometry, JSON.parse(await readFile(geometryPath, 'utf8')));
    await capture('desktop');

    const cdp = await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
    async function measure(name, action) {
      const before = await metrics();
      await action();
      const after = await metrics();
      const wall = after.Timestamp - before.Timestamp;
      const result = { width, name, wallSeconds: wall,
        mainThreadMsPerSecond: (after.TaskDuration - before.TaskDuration) * 1000 / wall,
        scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
        layouts: after.LayoutCount - before.LayoutCount };
      reports.push(result);
      console.log(JSON.stringify(result));
    }

    if (width === 1440) {
      const win = id => page.locator(`[data-window-id="${id}"]`);
      const task = id => page.locator(`[data-task-id="${id}"]`);
      await task('me').click();
      const before = await geometry();
      const cropBefore = await win('alt').locator('img.win-fill-crop').evaluate(el => [el.style.left, el.style.top]);
      const canvasBefore = await page.locator('.paint__canvas').evaluate(el => el.toDataURL());
      const bar = await win('me').locator('.win-titlebar').boundingBox();
      await page.mouse.move(bar.x + 45, bar.y + 10);
      await page.mouse.down();
      await page.evaluate(() => { window.renderCounts = {}; });
      await measure('paint-drag', async () => {
        for (let i = 1; i <= 90; i++) {
          await page.mouse.move(bar.x + 45 + i / 3, bar.y + 10 + i / 9);
          await page.waitForTimeout(16);
        }
      });
      const renders = await page.evaluate(() => window.renderCounts);
      console.log('drag renders:', JSON.stringify(renders));
      await page.mouse.up();
      const after = await geometry();
      for (const id of ['me', 'alt']) {
        const a = before.find(w => w.id === id);
        const b = after.find(w => w.id === id);
        assert.equal(b.x - a.x, 30, `${id}: horizontal drag`);
        assert.equal(b.y - a.y, 10, `${id}: vertical drag`);
      }
      assert.deepEqual(await win('alt').locator('img.win-fill-crop').evaluate(el => [el.style.left, el.style.top]), cropBefore);
      assert.equal(await page.locator('.paint__canvas').evaluate(el => el.toDataURL()), canvasBefore);
      await capture('dragged');
      await win('me').getByRole('button', { name: 'Minimize', exact: true }).click();
      assert.equal(await win('alt').isVisible(), false);
      await task('me').click();
      assert.equal(await win('alt').isVisible(), true);
      await task('terminal').click();
      await page.locator('.term__input').fill('preserve this draft');
      // This window intentionally extends beyond the desktop's right edge.
      await win('terminal').getByRole('button', { name: 'Minimize', exact: true }).dispatchEvent('click');
      await task('terminal').click();
      assert.equal(await page.locator('.term__input').inputValue(), 'preserve this draft');
      await page.locator('.term__input').fill('');

      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForTimeout(3000);
      await measure('fracture-idle', () => page.waitForTimeout(5000));
    }
    assert.deepEqual(errors, [], 'Browser errors');
    await context.close();
  }
  await writeFile(path.join(directory, `${mode}-metrics.json`), JSON.stringify(reports, null, 2));
  console.log(`${mode}: desktop visuals, geometry, dragging, crop, canvas and state checks passed`);
} finally {
  await browser.close();
}
