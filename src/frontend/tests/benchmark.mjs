/**
 * node tests/benchmark.mjs baseline-url candidate-url [output.json]
 * Five alternating production comparisons; fresh contexts for cold loads, then
 * normal navigation in the SAME context for warm loads. No routing (it disables
 * Playwright's HTTP cache). Data and SoundCloud are stubbed, not app timers.
 * LIVE=1 uses real integrations and records completed iframe requests separately.
 * WIDTH/HEIGHT/DPR/MOTION/RUNS select additional profiles; defaults are below.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { realpath, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { mockSoundCloud } from './soundcloud.mjs';

const [baseline, candidate, output = '/tmp/portfolio-benchmark.json'] = process.argv.slice(2);
assert.ok(baseline && candidate, 'Supply baseline and candidate production URLs');
const cli = await realpath(execFileSync('which', ['playwright-cli'], { encoding: 'utf8' }).trim());
const { chromium } = createRequire(cli)('playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const live = process.env.LIVE === '1';
const profile = {
  viewport: { width: Number(process.env.WIDTH ?? 1440), height: Number(process.env.HEIGHT ?? 900) },
  deviceScaleFactor: Number(process.env.DPR ?? 1),
  reducedMotion: process.env.MOTION ?? 'no-preference',
};
const reports = [];

try {
  for (let run = 0; run < Number(process.env.RUNS ?? 5); run++) {
    const order = run % 2 ? [['candidate', candidate], ['baseline', baseline]] : [['baseline', baseline], ['candidate', candidate]];
    for (const [label, url] of order) {
      const context = await browser.newContext(profile);
      if (!live) {
        await context.addInitScript(mockSoundCloud);
        await context.addInitScript(() => {
          // Keep the initial cover art and animation choices comparable too.
          let seed = 42;
          Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
          const fetch = window.fetch.bind(window);
          window.fetch = (input, init) => {
            const url = new URL(input instanceof Request ? input.url : input, location.href);
            const data = url.origin === location.origin && url.pathname === '/api/views' ? { count: 1234 }
              : url.hostname === 'github-contributions-api.jogruber.de' ? { contributions: Array.from({ length: 365 }, (_, i) => ({
                date: new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10), count: i % 5, level: i % 5,
              })) } : null;
            return data ? Promise.resolve(Response.json(data)) : fetch(input, init);
          };
        });
      }
      await context.addInitScript(() => {
        window.benchmark = { longTasks: [], frameGaps: [], events: [], boot: {} };
        new PerformanceObserver(list => window.benchmark.longTasks.push(...list.getEntries().map(e => e.duration)))
          .observe({ type: 'longtask', buffered: true });
        new PerformanceObserver(list => window.benchmark.events.push(...list.getEntries().map(e => ({ name: e.name, duration: e.duration }))))
          .observe({ type: 'event', durationThreshold: 16, buffered: true });
        document.addEventListener('click', event => {
          if (event.target.closest?.('.rsod')) window.benchmark.boot.continueAt = performance.now();
        }, true);
        const observer = new MutationObserver(() => {
          for (const [name, selector] of [['desktopAt', '.desktop'], ['revealAt', '.desktop-sparks'], ['fractureDecodedAt', '.fracture-background--ready']]) {
            if (!window.benchmark.boot[name] && document.querySelector(selector)) window.benchmark.boot[name] = performance.now();
          }
        });
        observer.observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class'] });
      });
      const page = await context.newPage();
      page.setDefaultTimeout(90_000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Performance.enable');
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false, latency: 150, downloadThroughput: 1_500_000 / 8, uploadThroughput: 750_000 / 8,
      });
      let transferred = 0;
      cdp.on('Network.loadingFinished', event => { transferred += event.encodedDataLength; });
      const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));

      for (const cache of ['cold', 'warm']) {
        transferred = 0;
        errors.length = 0;
        const finished = [];
        const onFinished = request => finished.push((async () => {
          try { return { url: request.url(), bytes: await request.sizes() }; }
          catch { return { url: request.url(), incomplete: true }; }
        })());
        context.on('requestfinished', onFinished);
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 });
        await page.waitForFunction(() => Object.keys(document.querySelector('.rsod') ?? {}).some(key => key.startsWith('__reactProps$')));
        const hydratedAt = await page.evaluate(() => performance.now());
        await page.locator('.rsod').click();
        await page.locator('.fracture-background--ready').waitFor();
        await page.locator('.neko').waitFor({ state: 'attached' });
        await page.locator('.desktop-sparks').waitFor({ state: 'attached' });
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all([...document.images].map(image => image.decode()));
          window.benchmark.boot.imagesAt = performance.now();
        });
        const startupTransferredBytes = transferred;
        // Sample steady-state separately, after the existing 10-second audio fade.
        await page.waitForFunction(() => performance.now() - window.benchmark.boot.revealAt >= 10_100);
        await page.evaluate(() => {
          window.benchmark.frameGaps = [];
          window.benchmark.longTasks = [];
          let previous;
          const until = performance.now() + 5000;
          function frame(now) {
            if (previous !== undefined) window.benchmark.frameGaps.push(now - previous);
            previous = now;
            if (now < until) requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        });
        const before = await metrics();
        await page.waitForTimeout(5100);
        const after = await metrics();
        context.off('requestfinished', onFinished);
        const audit = await page.evaluate(() => window.benchmark);
        const sortedGaps = audit.frameGaps.toSorted((a, b) => a - b);
        const report = {
          run, label, cache, hydratedAt, ...audit.boot,
          bootRevealMs: audit.boot.revealAt - audit.boot.continueAt,
          imagesAfterContinueMs: audit.boot.imagesAt - audit.boot.continueAt,
          // CDP page-target bytes include local assets; not an all-frame live total.
          startupTransferredBytes,
          idleTaskMsPerSecond: (after.TaskDuration - before.TaskDuration) * 1000 / (after.Timestamp - before.Timestamp),
          idleScriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
          // rAF scheduling gaps are NOT rendered FPS or a weak-GPU simulation.
          idleRafGapP95Ms: sortedGaps[Math.floor(sortedGaps.length * 0.95)],
          idleLongTasks: audit.longTasks, inputEvents: audit.events,
          jsHeapUsedBytes: after.JSHeapUsedSize, errors: [...errors],
          // Includes completed iframe requests; sizes may include cached bodies.
          completedRequests: await Promise.all(finished),
        };
        reports.push(report);
        console.log(JSON.stringify({ ...report, completedRequests: report.completedRequests.length }));
        await writeFile(output, JSON.stringify({ profile, live, cpuRate: 6, downloadMbps: 1.5, latencyMs: 150, reports }, null, 2));
        if (!live) assert.deepEqual(errors, [], 'Deterministic benchmark browser errors');
      }
      await context.close();
    }
  }
} finally {
  await browser.close();
}
