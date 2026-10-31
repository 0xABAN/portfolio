import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { assertSameImage, chromium, desktopContext, devices, stillDesktop } from './browser.mjs';

const [mode, url = 'http://localhost:3000', directory = '/tmp/portfolio-styles'] = process.argv.slice(2);
assert.ok(['record', 'compare'].includes(mode), 'Use record or compare');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
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
    const context = await desktopContext(browser, options);
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
        const different = await assertSameImage(image, `${file}.png`, `${name}/${state}`);
        console.log(`PASS ${name}/${state}: exact layout/styles; ${different} differing pixels`);
      }
      count++;
    }

    await capture('boot', '.rsod');
    if (!mobile) {
      await page.locator('button.rsod').click();
      await page.locator('.gh-app rect[data-date="2025-12-31"]').waitFor();
      await page.locator('.neko').waitFor({ state: 'attached' });
      await stillDesktop(page);
      await capture('desktop', '.desktop');

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

        await launch('Documents', 'secrets', '#desktop-window-explorer');
        await capture('explorer', '#desktop-window-explorer');
        await page.getByRole('option', { name: 'experience.exe', exact: true }).dblclick();
        await page.locator('.psp-xmb').waitFor();
        await page.waitForFunction(() => getComputedStyle(document.querySelector('.psp__screen')).visibility === 'visible');
        await capture('psp', '#desktop-window-experience');
        await page.getByRole('button', { name: 'Close Experience', exact: true }).click();

        await launch('Programs', 'CD Player', '#desktop-window-cd-player');
        await capture('cd-player', '#desktop-window-cd-player');

        await page.locator('.win:not([data-minimized="true"]) .win-min[aria-label="Minimize"]')
          .evaluateAll(buttons => buttons.forEach(button => button.click()));
        await page.locator('[data-recycle-bin]').dblclick();
        await page.locator('#desktop-window-recycle-bin').waitFor();
        await capture('recycle-bin', '#desktop-window-recycle-bin');
        await page.locator('#desktop-window-recycle-bin .win-min[aria-label="Minimize"]').click();
        await page.locator('[data-recycle-bin]').click({ button: 'right' });
        await capture('context-menu', '.shell-menu:popover-open');
        await page.keyboard.press('Escape');
        await page.locator('[data-icon-id="roblox"]').click({ button: 'right' });
        await page.getByRole('menuitem', { name: 'Delete', exact: true }).click();
        await capture('confirm-dialog', '.shell-dialog[open]');
      }
    }
    assert.deepEqual(errors, [], `${name}: browser errors`);
    await context.close();
  }
  console.log(`${mode}: ${count} UI snapshots across ${profiles.length} profiles`);
} finally {
  await browser.close();
}
