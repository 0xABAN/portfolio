import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { FRACTURE_PIECES } from "./fractureAssets";
import { installFractureRenderer } from "./fractureRenderer";

/** Replay the real renderer against style sinks, without browser scheduling noise. */
function replay(width: number, height: number) {
	const originalRandom = Math.random;
	let seed = 42;
	Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
	const frames = new Map<number, FrameRequestCallback>();
	let frameId = 0;
	let resize = () => {};
	let bounds = { width, height, left: 19, top: 33 };
	const desktop = new EventTarget();
	const motion = Object.assign(new EventTarget(), { matches: true });
	const hover = Object.assign(new EventTarget(), { matches: true });
	const doc = Object.assign(new EventTarget(), { hidden: false });
	let redundantWrites = 0;
	const elements = new Map<string, { style: Record<string, string> }>();
	for (const selector of [
		...FRACTURE_PIECES.flatMap(({ id }) => [`[data-piece="${id}"]`, `[data-growth="${id}"]`, `[data-growth="${id}"] img`]),
		".fracture-details",
	]) {
		const values: Record<string, string> = {};
		elements.set(selector, { style: new Proxy(values, {
			get: (target, key: string) => target[key] ?? "",
			set(target, key: string, value: string) {
				if (target[key] === value) redundantWrites++;
				target[key] = value;
				return true;
			},
		}) });
	}
	const globals = {
		window: Object.assign(new EventTarget(), { matchMedia: (query: string) => query.includes("hover:") ? hover : motion }),
		document: doc,
		ResizeObserver: class {
			constructor(callback: () => void) { resize = callback; }
			observe() {}
			disconnect() {}
		},
		requestAnimationFrame: (callback: FrameRequestCallback) => { frames.set(++frameId, callback); return frameId; },
		cancelAnimationFrame: (id: number) => { frames.delete(id); },
	};
	const descriptors = Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
	Object.assign(globalThis, globals);
	const hash = createHash("sha256");
	let controller: ReturnType<typeof installFractureRenderer> | undefined;

	try {
		controller = installFractureRenderer(
			{ closest: () => desktop, getBoundingClientRect: () => bounds } as unknown as HTMLElement,
			{ querySelector: (selector: string) => elements.get(selector) } as unknown as HTMLElement,
		);
		controller.setActive(true);
		let now = 100;
		for (let frame = 0; frame < 3600; frame++) {
			if (frame === 200) desktop.dispatchEvent(Object.assign(new Event("pointermove"), {
				pointerType: "mouse", clientX: width / 3, clientY: height / 2,
			}));
			if (frame === 900) { bounds = { ...bounds, width: width + 140, height: height - 60 }; resize(); }
			if (frame === 1400) desktop.dispatchEvent(new Event("pointerleave"));
			if (frame === 1800 || frame === 1810) {
				doc.hidden = frame === 1800;
				doc.dispatchEvent(new Event("visibilitychange"));
			}
			if (frame === 2400 || frame === 2500) {
				motion.matches = frame === 2500;
				motion.dispatchEvent(new Event("change"));
			}
			if (frame === 3100 || frame === 3200) controller.setActive(frame === 3200);
			now += [16, 33, 100, 5][frame % 4];
			for (const [id, callback] of [...frames]) { frames.delete(id); callback(now); }
			if (frame % 17 === 0) {
				hash.update(JSON.stringify([...elements].map(([key, element]) => [key,
					element.style.transform, element.style.opacity, element.style.maskImage])));
			}
		}
		controller.destroy();
		assert.equal(frames.size, 0, "Teardown must cancel the animation loop");
		return { digest: hash.digest("hex"), redundantWrites };
	} finally {
		controller?.destroy();
		Math.random = originalRandom;
		for (const [key, descriptor] of descriptors) {
			if (descriptor) Object.defineProperty(globalThis, key, descriptor);
			else Reflect.deleteProperty(globalThis, key);
		}
	}
}

// Captured before optimizing: exact style output across drift, hover, resizing,
// hidden tabs, reduced motion and reactivation. Update only for intentional motion changes.
for (const [width, height, expected] of [
	[1440, 868, "934fa784b568dcae4e1e9b847079792f18816279cdd537c5003ba53f8f2d1ed4"],
	[390, 868, "2474f0c2e8be39ad789805356e9f145c8b29ad5c3c574127cc92c7f7a41a0eb2"],
	[2560, 1408, "0a28db55f1c60ab8a6253f5c966fca06751bca8b26ae964b30656b09c4f70aa2"],
] as const) {
	test(`fracture replay preserves every sampled style at ${width}×${height}`, () => {
		const result = replay(width, height);
		assert.equal(result.digest, expected);
		assert.equal(result.redundantWrites, 0, "Do not rewrite unchanged styles");
	});
}
