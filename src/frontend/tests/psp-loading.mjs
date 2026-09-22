/** node tests/psp-loading.mjs [url] — uses the installed playwright-cli, no new dependency. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { mockSoundCloud } from './soundcloud.mjs';

const cli = await realpath(execFileSync('which', ['playwright-cli'], { encoding: 'utf8' }).trim());
const { chromium } = createRequire(cli)('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const url = process.argv[2] ?? 'http://localhost:3000';
const artwork = '**/icons/psp.png?v=current';

try {
  for (const scenario of ['active', 'background', 'failed']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await context.addInitScript(mockSoundCloud);
    await context.addInitScript(() => {
      const fetch = window.fetch.bind(window);
      window.fetch = (input, init) => String(input) === '/api/views'
        ? Promise.resolve(Response.json({ count: 1 })) : fetch(input, init);
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let releaseArtwork;
    const gate = new Promise(resolve => { releaseArtwork = resolve; });
    await page.route(artwork, async route => {
      await gate;
      if (scenario === 'failed') await route.abort();
      else await route.continue();
    });

    await page.goto(url);
    await page.locator('.rsod').click();
    await page.locator('.neko').waitFor({ state: 'attached' });
    await page.locator('[data-app-id="explorer"]').dblclick();
    const explorer = page.locator('#desktop-window-explorer');
    await explorer.waitFor();
    const open = () => explorer.getByRole('option', { name: 'experience.exe', exact: true }).dblclick();
    const psp = page.locator('#desktop-window-experience');
    const screen = psp.locator('.psp__screen');
    const xmb = psp.locator('.psp-xmb');
    const art = psp.locator('.psp__art');
    const geometry = () => screen.evaluate(element => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    });

    // Screen assets must still request in parallel with the blocked console PNG.
    const backgroundRequested = page.waitForRequest(request => new URL(request.url()).pathname === '/photos/jobs-image.png');
    await open();
    await xmb.waitFor({ state: 'attached' });
    await backgroundRequested;
    assert.equal(await art.evaluate(image => image.complete), false);
    assert.equal(await screen.isVisible(), false, 'Screen appeared before console artwork loaded');
    assert.equal(await screen.evaluate(element => element.inert), true, 'Pending screen accepts input');
    assert.equal(await xmb.evaluate(element => element.contains(document.activeElement)), false);
    const before = await geometry();

    const terminal = page.locator('.term__input');
    if (scenario === 'background') {
      await page.locator('[data-task-id="terminal"]').click();
      await terminal.fill('keep this focus');
    }
    releaseArtwork();

    if (scenario === 'failed') {
      await page.waitForFunction(() => {
        const image = document.querySelector('.psp__art');
        return image.complete && image.naturalWidth === 0;
      });
      assert.equal(await screen.isVisible(), false, 'Failed artwork exposed a floating screen');
      assert.equal(await screen.evaluate(element => element.inert), true);
    } else {
      await screen.waitFor({ state: 'visible' });
      assert.equal(await art.evaluate(image => image.complete && image.naturalWidth > 0), true);
      assert.equal(await screen.evaluate(element => element.inert), false);
      assert.deepEqual(await geometry(), before, 'Readiness changed the screen layout');
      if (scenario === 'background') {
        assert.equal(await terminal.evaluate(element => document.activeElement === element), true, 'Artwork completion stole focus');
        await page.locator('[data-task-id="experience"]').click();
      }
      await page.waitForFunction(() => document.activeElement === document.querySelector('.psp-xmb'));
      await page.keyboard.press('ArrowRight');
      assert.equal(await xmb.getAttribute('data-category'), 'projects', 'Revealed/restored screen lost keyboard navigation');
    }

    await psp.getByRole('button', { name: 'Close Experience', exact: true }).click();
    await psp.waitFor({ state: 'detached' });
    await page.unroute(artwork);

    if (scenario === 'active') {
      // No routes remain: allow normal caching and retain a decoded image while
      // reopening, covering the case where a new load event is easy to miss.
      await page.evaluate(async () => {
        window.cachedConsole = new Image();
        window.cachedConsole.src = '/icons/psp.png?v=current';
        await window.cachedConsole.decode();
      });
      await page.locator('[data-task-id="explorer"]').click();
      await open();
      await screen.waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.activeElement === document.querySelector('.psp-xmb'));
      await page.keyboard.press('ArrowDown');
      assert.equal(await xmb.locator('.psp-xmb__item.is-selected strong').innerText(), 'ibm');
    }

    assert.deepEqual(errors, [], `${scenario}: browser errors`);
    await context.close();
    console.log(`PASS: ${scenario} artwork readiness${scenario === 'active' ? ' and predecoded reopen' : ''}`);
  }
} finally {
  await browser.close();
}
