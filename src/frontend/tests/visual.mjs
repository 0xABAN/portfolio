/**
 * Run with the existing playwright-cli installation (no new dependency):
 * node tests/visual.mjs record|compare [url] [artifact-directory]
 *
 * Reduced-motion screenshots isolate layout/style changes. Network data, time,
 * audio and the GIF's first frame are fixed; production code is never patched.
 * Motion algorithms retain their separate unit tests.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import sharp from 'sharp';

const [mode, url = 'http://127.0.0.1:3187', directory = '/tmp/portfolio-simplify-visual'] = process.argv.slice(2);
assert.ok(mode === 'record' || mode === 'compare', 'Choose record or compare');
const cli = await realpath(execFileSync('which', ['playwright-cli'], { encoding: 'utf8' }).trim());
const { chromium } = createRequire(cli)('playwright');
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const gif = await sharp(await readFile(new URL('../public/photos/beep-boop.gif', import.meta.url))).png().toBuffer();
await mkdir(directory, { recursive: true });
let count = 0;

try {
  for (const [width, height] of [[1440, 900], [960, 600], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'UTC' });
    await context.route('**/api/views', route => route.fulfill({ json: { views: 1234 } }));
    let contributionsRequests = 0;
    let failContributions = false;
    await context.route('https://github-contributions-api.jogruber.de/**', route => {
      contributionsRequests++;
      return route.fulfill(failContributions ? { status: 503, json: { error: 'Unavailable' } } : { json: {
        contributions: Array.from({ length: 365 }, (_, i) => ({
          date: new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10), count: i % 5, level: i % 5,
        })),
      } });
    });
    await context.route('**/photos/beep-boop.gif', route => route.fulfill({ contentType: 'image/png', body: gif }));
    await context.addInitScript(() => {
      let seed = 42;
      Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
      const paused = new WeakMap();
      const elapsed = new WeakMap();
      Object.defineProperties(HTMLMediaElement.prototype, {
        paused: { get() { return paused.get(this) ?? true; } },
        readyState: { get() { return 2; } },
        currentTime: { get() { return elapsed.get(this) ?? 0; }, set(value) { elapsed.set(this, value); } },
      });
      HTMLMediaElement.prototype.play = function () {
        window.testAudio = this;
        window.audioPlayCalls = (window.audioPlayCalls ?? 0) + 1;
        paused.set(this, false);
        this.dispatchEvent(new Event('play'));
        return Promise.resolve();
      };
      HTMLMediaElement.prototype.pause = function () {
        paused.set(this, true);
        this.dispatchEvent(new Event('pause'));
      };
      HTMLMediaElement.prototype.load = function () { elapsed.set(this, 0); };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-16T12:00:00Z'));
    await page.goto(url);
    // SSR makes the button visible before React attaches its click handler.
    await page.waitForFunction(() => Object.keys(document.querySelector('.rsod') ?? {}).some(key => key.startsWith('__reactProps$')));
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });

    async function capture(name, target = page) {
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
      // Let decoded images reach the compositor before comparing scaled pixel art.
      await page.waitForTimeout(250);
      const file = path.join(directory, `${width}-${name}.png`);
      const image = await target.screenshot({ caret: 'hide', animations: 'disabled' });
      // Chromium may rasterize the same downscaled image differently after reuse.
      // Compare component layout and styling exactly alongside the pixel check.
      const styles = target === page ? null : await target.evaluate(root => {
        const properties = ['display', 'position', 'font', 'color', 'background', 'border',
          'padding', 'margin', 'gap', 'align-items', 'justify-content', 'flex', 'overflow',
          'box-shadow', 'outline', 'text-decoration', 'text-align', 'white-space',
          'object-fit', 'image-rendering', 'opacity', 'cursor', 'user-select'];
        return [root, ...root.querySelectorAll('*')].map(element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { tag: element.tagName, box: [rect.x, rect.y, rect.width, rect.height],
            style: Object.fromEntries(properties.map(property => [property, style.getPropertyValue(property)])) };
        });
      });
      if (mode === 'record') {
        await sharp(image).png().toFile(file);
        await writeFile(file + '.json', JSON.stringify(styles));
      } else {
        assert.deepEqual(styles, JSON.parse(await readFile(file + '.json', 'utf8')), `Component layout/styles: ${name}`);
        const actual = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const expected = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        assert.deepEqual(actual.info, expected.info, name);
        let different = 0;
        for (let i = 0; i < actual.data.length; i += 4) {
          if (actual.data.subarray(i, i + 4).some((value, channel) =>
            Math.abs(value - expected.data[i + channel]) > (name === 'desktop' ? 12 : 3))) different++;
        }
        // Measured noise in repeated baseline runs is confined to image rasterization.
        const allowance = actual.info.width * actual.info.height * 0.002;
        if (different > allowance) {
          await sharp(image).png().toFile(file.replace('.png', '-actual.png'));
          assert.fail(`Screenshot differs (${different} pixels): ${file}`);
        }
      }
      count++;
    }

    await capture('rsod');
    await page.locator('.rsod').click();
    await page.locator('.fracture-background--ready').waitFor();
    await page.getByRole('textbox', { name: 'Terminal input' }).waitFor({ state: 'attached' });
    await page.locator('.neko').waitFor({ state: 'attached' });
    // Framework initialization also consumes randomness; choose a track via the UI.
    const tab = page.locator('.task-btn--cd');
    await tab.hover();
    for (let i = 0; i < 10 && await tab.getAttribute('title') !== 'Toby Fox - Fallen Down'; i++) {
      await page.getByRole('button', { name: 'Next track', exact: true }).first().dispatchEvent('click');
    }
    assert.equal(await tab.getAttribute('title'), 'Toby Fox - Fallen Down');
    await page.mouse.move(0, 0);
    await page.locator('.cd-pop').waitFor({ state: 'hidden' });
    await capture('desktop');
    async function checkCalendar() {
      await page.locator('.gh-app rect[data-date="2025-12-31"]').waitFor();
      assert.ok(await page.locator('.react-activity-calendar__scroll-container').evaluate(
        el => Math.abs(el.scrollLeft + el.clientWidth - el.scrollWidth) <= 1,
      ), 'Calendar starts scrolled to the latest date');
    }
    await checkCalendar();
    assert.equal(contributionsRequests, 1, 'One request across Strict Mode remount');

    // Mobile windows overlap this icon; exercise its handler independently of stacking.
    await page.locator('.desk-icon[title="secrets"]').dispatchEvent('click');
    await page.locator('.explorer').waitFor();
    await capture('explorer', page.locator('.explorer'));
    await page.locator('.explorer__row').first().focus();
    await capture('explorer-focus', page.locator('.explorer'));
    await page.getByRole('button', { name: 'experience.exe', exact: true }).click();
    await page.locator('.exp').waitFor();
    await capture('experience', page.locator('.exp'));

    const music = page.getByRole('button', { name: 'Pause music', exact: true });
    await music.hover();
    await page.locator('.cd-pop').waitFor();
    await capture('cd', page.locator('.cd-pop'));
    await music.click();
    await page.getByRole('button', { name: 'Play music', exact: true }).waitFor();
    await capture('taskbar-paused', page.locator('.taskbar'));
    await page.getByRole('button', { name: 'Play music', exact: true }).click();
    await page.getByRole('button', { name: 'Pause music', exact: true }).waitFor();
    await page.evaluate(() => {
      window.testAudio.currentTime = 65;
      window.testAudio.dispatchEvent(new Event('timeupdate'));
    });
    assert.match(await tab.textContent(), /1:05$/);
    await page.evaluate(() => {
      window.testAudio.currentTime = 66;
      window.testAudio.dispatchEvent(new Event('durationchange'));
    });
    assert.match(await tab.textContent(), /1:06$/);
    const beforeEnded = await page.evaluate(() => window.audioPlayCalls);
    const previousTrack = await tab.getAttribute('title');
    await page.evaluate(() => window.testAudio.dispatchEvent(new Event('ended')));
    await page.waitForFunction(previous => document.querySelector('.task-btn--cd').title !== previous, previousTrack);
    assert.equal(await page.evaluate(() => window.audioPlayCalls), beforeEnded + 1, 'One ended handler after Strict Mode remount');
    assert.match(await tab.textContent(), /0:00$/);

    const portrait = page.locator('.win[aria-label="adam"]');
    await portrait.getByRole('button', { name: 'Minimize', exact: true }).dispatchEvent('click');
    await portrait.waitFor({ state: 'hidden' });
    await page.locator('.task-btn[title="adam"]').dispatchEvent('click');
    await portrait.waitFor({ state: 'visible' });
    if (width === 1440) {
      // The terminal intentionally takes keyboard focus after every pointer-up.
      await page.locator('.win[aria-label="Command Prompt"]').getByRole('button', { name: 'Minimize', exact: true }).dispatchEvent('click');
      const canvas = page.locator('.paint__canvas');
      await page.waitForFunction(() => {
        const canvas = document.querySelector('.paint__canvas');
        return canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3] === 255;
      });
      const original = await canvas.evaluate(el => el.toDataURL());
      const box = await canvas.boundingBox();
      await page.mouse.move(box.x + 20, box.y + 20);
      await page.mouse.down();
      await page.mouse.move(box.x + 50, box.y + 40, { steps: 5 });
      await page.mouse.up();
      const painted = await canvas.evaluate(el => el.toDataURL());
      assert.notEqual(painted, original, 'Pencil changes the bitmap');
      await page.setViewportSize({ width: width - 200, height });
      await page.waitForTimeout(100);
      assert.equal(await canvas.evaluate(el => el.toDataURL()), painted, 'Resize preserves drawing');
      await page.keyboard.press('Control+z');
      const undone = await canvas.evaluate(el => el.toDataURL());
      assert.ok(undone === original, 'Resize preserves undo');
      await page.setViewportSize({ width, height });
    }
    const githubWindow = page.locator('.win').filter({ has: page.locator('.gh-app') });
    async function remountCalendar() {
      await githubWindow.getByRole('button', { name: 'Minimize', exact: true }).dispatchEvent('click');
      await page.locator('.task-btn[title="github"]').dispatchEvent('click');
      await checkCalendar();
    }
    await remountCalendar();
    assert.equal(contributionsRequests, 1, 'Successful requests stay cached after restore');
    if (width === 1440) {
      failContributions = true;
      await page.route('**/photos/street.png', route => route.abort());
      await page.reload();
      await page.waitForFunction(() => Object.keys(document.querySelector('.rsod') ?? {}).some(key => key.startsWith('__reactProps$')));
      await page.locator('.rsod').click();
      await page.locator('.gh-app__err').waitFor();
      await page.waitForFunction(() => {
        const canvas = document.querySelector('.paint__canvas');
        return canvas?.getContext('2d').getImageData(0, 0, 1, 1).data.every(value => value === 255);
      });
      assert.ok(await page.locator('.paint__canvas').evaluate(canvas =>
        canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.every(value => value === 255),
      ), 'Failed Paint image initializes an opaque white bitmap');
      assert.equal(contributionsRequests, 2);
      failContributions = false;
      await remountCalendar();
      assert.equal(contributionsRequests, 3, 'Failed requests retry on remount');
    }
    assert.deepEqual(errors, [], 'Browser errors');
    await context.close();
  }
  console.log(`${mode}: ${count} screenshots; playback interactions and browser errors checked`);
} finally {
  await browser.close();
}
