/** node tests/mobile-boot.mjs [url] — device gate, not a viewport-size gate. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { mockSoundCloud } from './soundcloud.mjs';

const cli = await realpath(execFileSync('which', ['playwright-cli'], { encoding: 'utf8' }).trim());
const { chromium, devices } = createRequire(cli)('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const url = process.argv[2] ?? 'http://127.0.0.1:3187';
const macUserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15';
const cases = [
  { name: 'iphone', options: devices['iPhone 13'], blocked: true },
  { name: 'android-phone', options: devices['Pixel 7'], blocked: true },
  { name: 'ipad', options: devices['iPad (gen 7)'], blocked: true },
  { name: 'android-tablet', options: { ...devices['iPad (gen 7)'], userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel Tablet) AppleWebKit/537.36 Chrome/149.0.0.0 Safari/537.36' }, blocked: true },
  { name: 'desktop-identifying-ipad', options: { ...devices['iPad (gen 7)'], userAgent: macUserAgent }, touchPoints: 5, blocked: true },
  { name: 'mac-desktop', options: { ...devices['Desktop Chrome'], userAgent: macUserAgent }, blocked: false },
  { name: 'narrow-desktop', options: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } }, blocked: false },
  { name: 'touch-laptop', options: { ...devices['Desktop Chrome'], hasTouch: true }, touchPoints: 10, blocked: false },
];

try {
  for (const { name, options, touchPoints, blocked } of cases) {
    const context = await browser.newContext({ ...options, reducedMotion: 'reduce' });
    // Keep unrelated integration failures out of desktop boot checks.
    await context.addInitScript(mockSoundCloud);
    await context.route('**/api/views', route => route.fulfill({ json: { count: 1 } }));
    await context.route('https://github-contributions-api.jogruber.de/**', route => route.fulfill({ json: { contributions: [] } }));
    if (touchPoints !== undefined) {
      await context.addInitScript(value => Object.defineProperty(navigator, 'maxTouchPoints', { value }), touchPoints);
    }
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.locator('.rsod').waitFor();
    await page.clock.install();

    if (blocked) {
      const error = page.getByRole('main', { name: 'Mobile device not supported' });
      assert.equal(await error.count(), 1, `${name}: mobile compatibility screen missing`);
      assert.match(await error.innerText(), /not compatible with mobile devices/i);
      assert.match(await error.innerText(), /desktop or laptop computer/i);
      assert.doesNotMatch(await error.innerText(), /press any key|ctrl\+alt\+del/i);
      assert.equal(await error.getByRole('button').count(), 0);
      assert.equal(await error.evaluate(element => getComputedStyle(element).backgroundColor), 'rgb(175, 0, 0)');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Error screen overflows the device');
      if (name === 'iphone') await page.screenshot({ path: '/tmp/portfolio-mobile-error.png' });

      await error.click();
      await page.keyboard.press('Enter');
      await page.keyboard.press('Space');
      await page.clock.runFor(4000);
      const { width, height } = page.viewportSize();
      await page.setViewportSize({ width: height, height: width });
      await page.keyboard.press('a');
      await page.clock.runFor(4000);
      assert.equal(await error.isVisible(), true, `${name}: input or rotation bypassed the error`);
      assert.equal(await page.locator('.restarting, .desktop, #sc-cd-player').count(), 0);
    } else {
      assert.equal(await page.locator('button.rsod').count(), 1, `${name}: desktop was blocked`);
      await page.locator('button.rsod').click();
      await page.clock.runFor(3000);
      await page.locator('.desktop').waitFor();
      assert.equal(await page.getByRole('main', { name: 'Mobile device not supported' }).count(), 0);
    }

    assert.deepEqual(errors, [], `${name}: browser errors`);
    await context.close();
    console.log(`PASS: ${name} ${blocked ? 'stays blocked' : 'boots normally'}`);
  }
} finally {
  await browser.close();
}
