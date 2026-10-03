/**
 * node tests/styles.mjs record|compare [url] [artifact-directory]
 * Record before a CSS change; compare afterwards with the same browser and DPR.
 * Uses the existing playwright-cli and sharp installations, no new dependencies.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import sharp from 'sharp';
import { mockSoundCloud } from './soundcloud.mjs';

const [mode, url = 'http://127.0.0.1:3187', directory = '/tmp/portfolio-styles'] = process.argv.slice(2);
assert.ok(['record', 'compare'].includes(mode), 'Use record or compare');
const cli = await realpath(execFileSync('which', ['playwright-cli'], { encoding: 'utf8' }).trim());
const { chromium, devices } = createRequire(cli)('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const beepBoopFrame = await sharp(new URL('../public/photos/beep-boop.webp', import.meta.url).pathname).png().toBuffer();
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 900 } },
  { name: 'small-desktop', viewport: { width: 960, height: 600 } },
  { name: 'narrow-desktop', viewport: { width: 390, height: 844 } },
  { name: 'iphone', ...devices['iPhone 13'], mobile: true },
  { name: 'ipad', ...devices['iPad (gen 7)'], mobile: true },
];
let count = 0;
await mkdir(directory, { recursive: true });

try {
  for (const { name, mobile, ...options } of profiles) {
    const context = await browser.newContext({ ...options, reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'UTC' });
    await context.addInitScript(mockSoundCloud);
    await context.addInitScript(() => {
      let seed = 42;
      Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
    });
    await context.route('**/api/views', route => route.fulfill({ json: { count: 1234 } }));
    await context.route('https://github-contributions-api.jogruber.de/**', route => route.fulfill({ json: {
      contributions: Array.from({ length: 365 }, (_, i) => ({
        date: new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10), count: i % 5, level: i % 5,
      })),
    } }));
    await context.route('**/photos/beep-boop.webp', route => route.fulfill({ contentType: 'image/png', body: beepBoopFrame }));
    await context.route('**/api/resume', route => route.fulfill({ body: String.raw`
      \begin{document}
      \begin{center}Adam Example \\ \href{https://example.com}{Portfolio}\end{center}
      \section{Experience}
      \resumeSubheading{Example Company}{2024--2026}{Software Engineer}{Remote}
      \resumeItem{Built accessible interfaces with \textbf{TypeScript}.}
      \end{document}
    ` }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-09-16T12:00:00Z'));
    await page.goto(url);
    await page.locator('.rsod').waitFor();
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });

    async function capture(state, selector) {
      const target = page.locator(selector);
      await target.waitFor();
      await page.evaluate(() => document.fonts.ready);
      await target.evaluate(root => Promise.all([...root.querySelectorAll('img')].map(img => img.decode().catch(() => {}))));
      await page.waitForTimeout(250);
      const styles = await target.evaluate(root => {
        const properties = ['display', 'position', 'box-sizing', 'font', 'font-feature-settings',
          'font-variation-settings', 'letter-spacing', 'line-height', 'color', 'background-color',
          'background-image', 'background-size', 'border', 'border-radius', 'padding', 'margin',
          'gap', 'align-items', 'justify-content', 'flex', 'overflow', 'box-shadow', 'outline',
          'text-decoration', 'text-align', 'white-space', 'list-style', 'vertical-align',
          'object-fit', 'image-rendering', 'opacity', 'cursor', 'user-select', 'appearance'];
        return [root, ...root.querySelectorAll('*')].map(element => {
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { tag: element.tagName, class: element.getAttribute('class'),
            box: [rect.x, rect.y, rect.width, rect.height],
            style: Object.fromEntries(properties.map(property => [property, style.getPropertyValue(property)])) };
        });
      });
      const file = path.join(directory, `${name}-${state}`);
      const image = await target.screenshot({ animations: 'disabled', caret: 'hide' });
      // Ignore server origins and the production minifier's equivalent gradient
      // direction. The screenshot comparison still guards the rendered pixels.
      const normalize = value => JSON.parse(JSON.stringify(value)
        .replace(/https?:\/\/(?:127\.0\.0\.1|localhost):\d+/g, '')
        .replaceAll('linear-gradient(to right,', 'linear-gradient(90deg,'));
      const normalized = normalize(styles);
      if (mode === 'record') {
        await writeFile(`${file}.json`, JSON.stringify(normalized));
        await writeFile(`${file}.png`, image);
      } else {
        await writeFile(`${file}-actual.json`, JSON.stringify(normalized));
        await writeFile(`${file}-actual.png`, image);
        assert.deepEqual(normalized, normalize(JSON.parse(await readFile(`${file}.json`, 'utf8'))), `${name}/${state}: layout and styles`);
        const actual = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        const expected = await sharp(`${file}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        assert.deepEqual(actual.info, expected.info, `${name}/${state}: image dimensions`);
        let different = 0;
        for (let i = 0; i < actual.data.length; i += 4) {
          if (actual.data.subarray(i, i + 4).some((value, channel) => Math.abs(value - expected.data[i + channel]) > 12)) different++;
        }
        // Match the existing performance check's scaled-image rasterization budget.
        // Every element's geometry and key styles above must still match exactly.
        assert.ok(different <= actual.info.width * actual.info.height * 0.002, `${name}/${state}: ${different} pixels differ`);
        console.log(`PASS ${name}/${state}: exact layout/styles; ${different} differing pixels`);
      }
      count++;
    }

    await capture('boot', '.rsod');
    if (!mobile) {
      await page.locator('button.rsod').click();
      await page.locator('.fracture-background--ready').waitFor();
      await page.locator('.gh-app rect[data-date="2025-12-31"]').waitFor();
      await page.locator('.neko').waitFor({ state: 'attached' });
      await capture('desktop', '.desktop');

      // Exercise the additional UI surfaces at the full desktop size. Other
      // profiles guard viewport-dependent layout and the mobile device gate.
      if (name === 'desktop') {
        async function launch(group, label, selector) {
          await page.getByRole('button', { name: 'Start', exact: true }).click();
          await page.getByRole('menuitem', { name: group, exact: true }).click();
          await page.getByRole('menuitem', { name: label, exact: true }).click();
          await page.locator(selector).waitFor();
          await page.locator('.desktop--busy').waitFor({ state: 'hidden' });
        }
        await page.getByRole('button', { name: 'Start', exact: true }).click();
        await page.getByRole('menuitem', { name: 'Documents', exact: true }).click();
        await capture('start-menu', '.start-menu');
        await page.keyboard.press('Escape');
        await page.keyboard.press('Escape');

        await launch('Documents', 'bio.txt', '#desktop-window-bio');
        await capture('bio', '#desktop-window-bio');
        await launch('Documents', 'secrets', '#desktop-window-explorer');
        await capture('explorer', '#desktop-window-explorer');
        await page.getByRole('option', { name: 'experience.exe', exact: true }).dblclick();
        await page.locator('.psp-xmb').waitFor();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.psp__screen')).visibility === 'visible');
        await capture('psp', '#desktop-window-experience');
        await page.getByRole('button', { name: 'Close Experience', exact: true }).click();

        await launch('Documents', 'resume.doc', '#desktop-window-word');
        await page.locator('.word__scroll[aria-busy="false"]').waitFor();
        await capture('word', '#desktop-window-word');
        await launch('Programs', 'CD Player', '#desktop-window-cd-player');
        const cd = page.locator('#desktop-window-cd-player');
        for (let i = 0; i < 20 && !(await cd.innerText()).includes('Fallen Down'); i++) {
          await cd.getByRole('toolbar', { name: 'Playback' }).getByRole('button', { name: 'Next track', exact: true }).click();
        }
        assert.match(await cd.innerText(), /Fallen Down/);
        await capture('cd-player', '#desktop-window-cd-player');

        await page.locator('.win:not([data-minimized="true"]) .win-min[aria-label="Minimize"]')
          .evaluateAll(buttons => buttons.forEach(button => button.click()));
        await page.locator('[data-recycle-bin]').dblclick();
        await page.locator('#desktop-window-recycle-bin').waitFor();
        await capture('recycle-bin', '#desktop-window-recycle-bin');
        await page.locator('#desktop-window-recycle-bin .win-min[aria-label="Minimize"]').click();
        await page.locator('[data-recycle-bin]').click({ button: 'right' });
        await capture('context-menu', '.shell-menu:popover-open');
        await page.getByRole('menuitem', { name: 'Properties', exact: true }).click();
        await capture('properties', '.shell-dialog[open]');
      }
    }
    assert.deepEqual(errors, [], `${name}: browser errors`);
    await context.close();
  }
  console.log(`${mode}: ${count} UI snapshots across ${profiles.length} profiles`);
} finally {
  await browser.close();
}
