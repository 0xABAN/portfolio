/** node tests/calendar.mjs [url] — native animation/DOM checks, no production hooks. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';

const cli = await realpath(execFileSync('which', ['playwright-cli'], { encoding: 'utf8' }).trim());
const { chromium } = createRequire(cli)('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.route('**/api/views', route => route.fulfill({ json: { views: 1 } }));
  await page.route('https://github-contributions-api.jogruber.de/**', route => route.fulfill({ json: {
    contributions: Array.from({ length: 365 }, (_, i) => ({
      date: new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10), count: i % 5, level: i % 5,
    })),
  } }));
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = () => Promise.resolve();
    window.cellQueries = 0;
    window.cellLayoutReads = 0;
    const query = Element.prototype.querySelectorAll;
    Element.prototype.querySelectorAll = function (selector) {
      if (this.matches('.gh-app') && selector.includes('rect[data-level]')) window.cellQueries++;
      return query.call(this, selector);
    };
    const bounds = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      if (this.matches('.gh-app rect')) window.cellLayoutReads++;
      return bounds.call(this);
    };
  });
  await page.goto(process.argv[2] ?? 'http://localhost:3000');
  await page.waitForFunction(() => Object.keys(document.querySelector('.rsod') ?? {}).some(key => key.startsWith('__reactProps$')));
  await page.locator('.rsod').click();
  await page.locator('.git-cell-pop').first().waitFor({ state: 'attached' });
  await page.evaluate(() => {
    Math.random = () => 0;
    window.cellQueries = 0;
    window.cellLayoutReads = 0;
  });
  // Repeatedly choose the first active cell, including before its 400ms pop ends.
  await page.waitForFunction(() => document.querySelector('.gh-app rect[data-level="1"]').classList.contains('git-cell-pop'));
  await page.evaluate(() => {
    window.popCell = document.querySelector('.gh-app rect[data-level="1"]');
    window.popAnimation = window.popCell.getAnimations()[0];
  });
  await page.waitForTimeout(1000);
  assert.deepEqual(await page.evaluate(() => ({ queries: window.cellQueries, reads: window.cellLayoutReads })),
    { queries: 0, reads: 0 }, 'Repeated pops must not rescan cells or force geometry reads');
  assert.equal(await page.evaluate(() => window.popCell.getAnimations()[0] === window.popAnimation), true,
    'An overlapping pop should restart the existing CSS animation');
  const frames = await page.evaluate(() => {
    const animation = window.popAnimation;
    return { duration: animation.effect.getTiming().duration, frames: animation.effect.getKeyframes().map(frame => ({
      offset: frame.offset, easing: frame.easing, transform: frame.transform, opacity: frame.opacity,
    })) };
  });
  assert.deepEqual(frames, { duration: 400, frames: [
    { offset: 0, easing: 'ease-out', transform: 'scale(1)', opacity: '1' },
    { offset: 0.35, easing: 'ease-out', transform: 'scale(0.65)', opacity: '0.35' },
    { offset: 0.7, easing: 'ease-out', transform: 'scale(1.3)', opacity: '1' },
    { offset: 1, easing: 'ease-out', transform: 'scale(1)', opacity: '1' },
  ] });
  await page.evaluate(() => {
    Math.random = () => 0.999999; // Let this cell finish while future ticks choose another.
    window.popAnimation.finish();
  });
  await page.waitForFunction(() => !window.popCell.classList.contains('git-cell-pop'));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.gh-app').evaluate(el => el.getAnimations({ subtree: true }).length), 0);
  console.log('PASS: cached cells, layout-free overlapping restarts, unchanged keyframes, finish cleanup and reduced motion');
} finally {
  await browser.close();
}
