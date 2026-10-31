import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertSameImage, chromium, desktopContext, stillDesktop } from './browser.mjs';

const [mode, url = 'http://localhost:3000', directory = '/tmp/portfolio-lossless'] = process.argv.slice(2);
assert.ok(['record', 'compare'].includes(mode), 'Use record or compare');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const reports = [];
await mkdir(directory, { recursive: true });

try {
  for (const [width, height] of [[1440, 900], [960, 600], [390, 844]]) {
    const context = await desktopContext(browser, { viewport: { width, height }, deviceScaleFactor: Number(process.env.DPR ?? 2) });
    await context.addInitScript(() => {
      window.reactCommits = 0;
      window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
        supportsFiber: true,
        renderers: new Map(),
        inject(renderer) { this.renderers.set(1, renderer); return 1; },
        onCommitFiberRoot() { window.reactCommits++; },
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
    await page.locator('.neko').waitFor({ state: 'attached' });
    const moveDesktop = await stillDesktop(page);
    await page.locator('.gh-app rect[data-date="2025-12-31"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.images].map(image => image.decode().catch(() => {}))));
    await page.waitForTimeout(250);

    async function capture(name) {
      const image = await page.screenshot({ animations: 'disabled', caret: 'hide' });
      const file = path.join(directory, `${width}-${name}.png`);
      if (mode === 'record') return writeFile(file, image);
      await writeFile(file.replace('.png', '-actual.png'), image);
      await assertSameImage(image, file, name);
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
      await page.evaluate(() => new Promise(requestAnimationFrame));
      await page.evaluate(() => { window.reactCommits = 0; });
      await measure('paint-drag', async () => {
        for (let i = 1; i <= 90; i++) {
          await page.mouse.move(bar.x + 45 + i / 3, bar.y + 10 + i / 9);
          await page.waitForTimeout(16);
        }
      });
      console.log('drag React commits (diagnostic):', await page.evaluate(() => window.reactCommits));
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
      await win('terminal').getByRole('button', { name: 'Minimize', exact: true }).dispatchEvent('click');
      await task('terminal').click();
      assert.equal(await page.locator('.term__input').inputValue(), 'preserve this draft');
      await page.locator('.term__input').fill('');

      await page.evaluate(() => {
        window.hitTestMutations = [];
        window.hitTestObserver = new MutationObserver(records => {
          window.hitTestMutations.push(...records.filter(record => /pointer-events/.test(record.oldValue ?? '')));
        });
        for (const el of document.querySelectorAll('.win')) {
          window.hitTestObserver.observe(el, { attributes: true, attributeFilter: ['style'], attributeOldValue: true });
        }
      });
      const bin = await page.locator('[data-recycle-bin]').boundingBox();
      const point = { x: bin.x + bin.width / 2, y: bin.y + bin.height / 2 };
      await page.evaluate(({ x, y }) => {
        const overlay = document.createElement('div');
        overlay.id = 'hit-test-overlay';
        overlay.style.cssText = `position:fixed;left:${x - 10}px;top:${y - 10}px;width:20px;height:20px;z-index:9999`;
        document.body.append(overlay);
      }, point);
      async function dropError() {
        await win('sysmsg-4').dispatchEvent('pointerdown');
        const header = await win('sysmsg-4').locator('.win-titlebar').boundingBox();
        await page.mouse.move(header.x + 45, header.y + 10);
        await page.mouse.down();
        await page.mouse.move(point.x, point.y, { steps: 3 });
        await page.mouse.up();
      }
      await dropError();
      assert.equal(await win('sysmsg-4').count(), 1, 'Overlay must block recycling');
      await page.locator('#hit-test-overlay').evaluate(el => el.remove());
      await dropError();
      assert.equal(await win('sysmsg-4').count(), 1, 'Dragging a window must not recycle it');
      assert.equal(await page.locator('[data-recycle-bin] img').getAttribute('src'), '/icons/recycle-bin-empty.png');
      assert.equal(await page.evaluate(() => {
        window.hitTestObserver.disconnect();
        return window.hitTestMutations.length;
      }), 0, 'Hit testing must not toggle window pointer-events');

      await page.locator('.win:not([data-minimized="true"]) .win-min[aria-label="Minimize"]')
        .evaluateAll(buttons => buttons.forEach(button => button.click()));
      const shortcut = page.locator('.desktop__icons [data-shell-item="silksong"]');
      await shortcut.dragTo(page.locator('[data-recycle-bin]'));
      await shortcut.waitFor({ state: 'detached' });
      assert.equal(await page.locator('[data-recycle-bin] img').getAttribute('src'), '/icons/recycle-bin-full.png');

      await moveDesktop();
      await page.waitForTimeout(3000);
      await measure('motion-idle', () => page.waitForTimeout(5000));
    }
    assert.deepEqual(errors, [], 'Browser errors');
    await context.close();
  }
  await writeFile(path.join(directory, `${mode}-metrics.json`), JSON.stringify(reports, null, 2));
  console.log(`${mode}: desktop visuals, geometry, dragging, crop, canvas and state checks passed`);
} finally {
  await browser.close();
}
