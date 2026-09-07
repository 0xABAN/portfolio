/** Bounded Chromium rendering benchmark. Run after production server starts:
 * node scripts/benchmark-fracture.mjs http://localhost:3001 /tmp/fracture-benchmark.json
 * CPU throttling is host-relative; this does not emulate a low-end GPU.
 */
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdtemp, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
const url = process.argv[2] || "http://localhost:3001";
const output = process.argv[3] || "/tmp/fracture-benchmark.json";
const manifest = await readFile(
  new URL("../src/components/desktop/fractureAssets.ts", import.meta.url),
  "utf8",
);
const assets = JSON.parse(
  manifest.match(/FRACTURE_PIECES: FractureAsset\[\] = (.*);/)[1],
);
const artwork = await readFile(
  new URL("../public/fracture/artwork.svg", import.meta.url),
  "utf8",
);
const candidates = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/chromium",
  "/usr/bin/google-chrome",
].filter(Boolean);
let executable;
for (const candidate of candidates) {
  try {
    await access(candidate);
    executable = candidate;
    break;
  } catch {}
}
if (!executable) throw new Error("Chrome unavailable; set CHROME_PATH");
const profile = await mkdtemp(path.join(tmpdir(), "fracture-benchmark-"));
// GPU remains enabled: disabling it would benchmark a different rendering path.
const chrome = spawn(
  executable,
  [
    "--headless=new",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: ["ignore", "ignore", "pipe"] },
);
let socket;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
try {
  const endpoint = await new Promise((resolve, reject) => {
    let log = "";
    const timer = setTimeout(
      () => reject(new Error("Chrome startup timeout")),
      20000,
    );
    chrome.stderr.on("data", (chunk) => {
      log += chunk;
      const match = log.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    chrome.on("error", reject);
  });
  const pages = await (
    await fetch(`http://${new URL(endpoint).host}/json/list`)
  ).json();
  socket = new WebSocket(
    pages.find((p) => p.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  let trace = [];
  let layers = [];
  let paints = {};
  let tracingDone;
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.method === "Tracing.dataCollected")
      trace.push(...message.params.value);
    if (message.method === "Tracing.tracingComplete") tracingDone?.();
    if (message.method === "LayerTree.layerTreeDidChange")
      layers = message.params.layers || layers;
    if (message.method === "LayerTree.layerPainted")
      paints[message.params.layerId] =
        (paints[message.params.layerId] || 0) + 1;
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  await send("Page.enable");
  await send("LayerTree.enable");
  const results = [];
  for (const scenario of [
    { mode: "cached-app", width: 1366, height: 768, dpr: 1, throttle: 1 },
    { mode: "cached-app", width: 1366, height: 768, dpr: 1, throttle: 4 },
    { mode: "cached-app", width: 1366, height: 768, dpr: 1, throttle: 6 },
    { mode: "cached-app", width: 1920, height: 1080, dpr: 2, throttle: 4 },
    {
      mode: "filtered-svg-isolated",
      width: 1366,
      height: 768,
      dpr: 1,
      throttle: 4,
    },
  ].filter(
    (_, index) =>
      !process.env.FRACTURE_CASE || index === Number(process.env.FRACTURE_CASE),
  )) {
    await send("Emulation.setCPUThrottlingRate", { rate: 1 });
    await send("Emulation.setDeviceMetricsOverride", {
      width: scenario.width,
      height: scenario.height,
      deviceScaleFactor: scenario.dpr,
      mobile: false,
    });
    await send("Page.navigate", {
      url: scenario.mode === "cached-app" ? url : "about:blank",
    });
    if (scenario.mode === "cached-app") {
      await evaluate(
        `new Promise((resolve,reject)=>{const start=Date.now();const poll=()=>{const button=document.querySelector('.rsod');if(button)button.click();if(document.querySelector('.fracture-background--ready'))resolve(true);else if(Date.now()-start>25000)reject('Ready timeout');else setTimeout(poll,100)};poll()})`,
      );
      await delay(3500);
    } else {
      await evaluate(
        `document.body.innerHTML=${JSON.stringify(artwork)};document.body.style.cssText='margin:0;overflow:hidden;background:#b00000';document.querySelector('svg').style.cssText='position:fixed;width:100vw;height:100vh';window.benchmarkStart=performance.now();function animate(t){const p=(1-Math.cos((t-window.benchmarkStart)/6000))/2;document.querySelectorAll('[data-piece]').forEach(g=>g.setAttribute('transform','translate(800 500) rotate('+p*8+') scale('+(1+p*.05)+') translate(-800 -500)'));requestAnimationFrame(animate)}requestAnimationFrame(animate);`,
      );
      await delay(1500);
    }
    await send("LayerTree.disable");
    await send("LayerTree.enable");
    await send("Page.captureScreenshot", { format: "png" });
    await send("Emulation.setCPUThrottlingRate", { rate: scenario.throttle });
    trace = [];
    paints = {};
    await send("Tracing.start", {
      categories:
        "devtools.timeline,cc,benchmark,disabled-by-default-devtools.timeline.frame",
      transferMode: "ReportEvents",
    });
    const browserMetrics = await evaluate(
      `(${measure.toString()})(${JSON.stringify(assets)},${JSON.stringify(scenario.mode)})`,
    );
    const done = new Promise((resolve) => {
      tracingDone = resolve;
    });
    await send("Tracing.end");
    await done;
    const totals = {};
    const frameEvents = {};
    for (const event of trace) {
      if (
        [
          "Paint",
          "Layout",
          "RasterTask",
          "UpdateLayoutTree",
          "CompositeLayers",
        ].includes(event.name)
      ) {
        const bucket = (totals[event.name] ||= { count: 0, durationMs: 0 });
        bucket.count++;
        bucket.durationMs += (event.dur || 0) / 1000;
      }
      if (
        /^(DrawFrame|DroppedFrame|PipelineReporter|BeginFrame)$/i.test(
          event.name,
        )
      )
        frameEvents[event.name] = (frameEvents[event.name] || 0) + 1;
    }
    const paintNodes = {};
    for (const event of trace.filter((e) => e.name === "Paint")) {
      const id = event.args?.data?.nodeId;
      if (id) paintNodes[id] = (paintNodes[id] || 0) + 1;
    }
    const paintedNodes = [];
    for (const [id, count] of Object.entries(paintNodes)) {
      let node = "";
      try {
        const result = await send("DOM.describeNode", {
          backendNodeId: Number(id),
        });
        node = JSON.stringify(result.node.attributes || []);
      } catch {}
      paintedNodes.push({ id, count, node });
    }
    const layerSummary = [];
    for (const layer of layers.filter((l) => l.drawsContent)) {
      let node = "";
      if (layer.backendNodeId) {
        try {
          const result = await send("DOM.describeNode", {
            backendNodeId: layer.backendNodeId,
          });
          node = JSON.stringify(result.node.attributes || []);
        } catch {}
      }
      layerSummary.push({
        id: layer.layerId,
        width: layer.width,
        height: layer.height,
        paintCount: layer.paintCount,
        paintsDuringRun: paints[layer.layerId] || 0,
        node,
      });
    }
    const result = {
      ...scenario,
      browserMetrics,
      traceTotals: totals,
      frameEvents,
      paintedNodes,
      layers: layerSummary,
    };
    results.push(result);
    console.log(JSON.stringify(result));
  }
  await writeFile(
    output,
    JSON.stringify(
      {
        limitations: [
          "One run per case; exploratory stress test, not statistical confidence.",
          "Headless Chrome and CPU throttling do not emulate low-end GPU/memory.",
          "Filtered SVG baseline is isolated and lacks full app/hover load; conservative comparison.",
          "Trace frame event counts are emitted events, not a guaranteed presented-FPS measure.",
        ],
        results,
      },
      null,
      2,
    ),
  );
  console.log(`Saved ${output}`);
} finally {
  socket?.close();
  chrome.kill();
  await new Promise((resolve) => chrome.once("exit", resolve));
  await rm(profile, { recursive: true, force: true });
}

async function measure(assets, mode) {
  const intervals = { ambient: [], interactive: [] };
  const longTasks = [];
  let maxParticles = 0;
  let pointerMoves = 0;
  let previous = 0;
  const start = performance.now();
  const observer = new PerformanceObserver((list) =>
    longTasks.push(...list.getEntries().map((e) => e.duration)),
  );
  observer.observe({ type: "longtask", buffered: false });
  const timer = setInterval(() => {
    if (performance.now() - start < 4000 || mode !== "cached-app") return;
    const desktop = document.querySelector(".desktop");
    for (const asset of assets) {
      const image = document.querySelector('[data-piece="' + asset.id + '"]');
      const matrix = new DOMMatrix(getComputedStyle(image).transform);
      for (let i = 0; i < asset.outline.length; i += 4) {
        const p = asset.outline[i];
        const q = new DOMPoint(p.x - asset.x, p.y - asset.y).matrixTransform(
          matrix,
        );
        if (
          q.x < 20 ||
          q.y < 20 ||
          q.x > innerWidth - 20 ||
          q.y > innerHeight - 20 ||
          document.elementFromPoint(q.x, q.y) !== desktop
        )
          continue;
        const offset = Math.sin((performance.now() - start) / 90) * 36;
        desktop.dispatchEvent(
          new PointerEvent("pointermove", {
            clientX: q.x + offset,
            clientY: q.y,
            bubbles: true,
            pointerType: "mouse",
            buttons: 1,
          }),
        );
        pointerMoves++;
        return;
      }
    }
  }, 40);
  await new Promise((resolve) => {
    function frame(now) {
      const elapsed = now - start;
      if (previous)
        intervals[elapsed < 4000 ? "ambient" : "interactive"].push(
          now - previous,
        );
      previous = now;
      maxParticles = Math.max(
        maxParticles,
        document.querySelector(".fracture-fragments")?.childElementCount || 0,
      );
      if (elapsed >= 8000) resolve();
      else requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  });
  clearInterval(timer);
  observer.disconnect();
  const summarize = (values) => {
    values.sort((a, b) => a - b);
    return {
      frames: values.length,
      medianMs: values[Math.floor(values.length * 0.5)],
      p95Ms: values[Math.floor(values.length * 0.95)],
      p99Ms: values[Math.floor(values.length * 0.99)],
      over33ms: values.filter((v) => v > 33.4).length,
      over50ms: values.filter((v) => v > 50).length,
    };
  };
  return {
    ambient: summarize(intervals.ambient),
    interactive: summarize(intervals.interactive),
    longTasks,
    pointerMoves,
    maxParticles,
  };
}
