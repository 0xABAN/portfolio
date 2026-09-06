import assert from "node:assert/strict";
import { test } from "node:test";
import {
	clampWindowPos,
	layoutDesktop,
	makeExplorerWindow,
	nestBounds,
	reflowDesktop,
	type DesktopWindow,
} from "./windows";

test("secrets opens left of the current adam window with aligned bottom borders", () => {
	for (const [width, height] of [[1920, 1080], [1440, 900]]) {
		const adam = layoutDesktop(width, height).find((w) => w.id === "me")!;
		for (const anchor of [adam, { ...adam, x: adam.x + 80, y: adam.y - 10 }]) {
			const secrets = makeExplorerWindow(50, anchor, width, height);
			assert.equal(anchor.x - (secrets.x + secrets.w), 35);
			assert.equal(secrets.y + secrets.h, anchor.y + anchor.h);
			assert.ok(secrets.x >= 24);
			assert.ok(secrets.w >= 320 && secrets.w <= 520);
			assert.equal(secrets.h, 360);
			assert.equal(secrets.z, 50);
		}
	}
});

test("secrets stays fully accessible when there is no room beside adam", () => {
	for (const [width, height] of [[390, 844], [844, 390]]) {
		const adam = layoutDesktop(width, height).find((w) => w.id === "me")!;
		const secrets = makeExplorerWindow(50, adam, width, height);
		assert.ok(secrets.x >= 24 && secrets.y >= 24);
		assert.ok(secrets.x + secrets.w <= width - 24);
		assert.ok(secrets.y + secrets.h <= height - 36 - 24);
		assert.equal(secrets.y + secrets.h, adam.y + adam.h);
	}
	const secrets = makeExplorerWindow(50, undefined, 1440, 900);
	assert.equal(secrets.x + secrets.w / 2, 720);
	assert.equal(secrets.y + secrets.h / 2, (900 - 36) / 2);
});

test("default windows reflow exactly between docked, mobile, and restored viewports", () => {
	let previous = layoutDesktop(1440, 900);
	let current = previous;
	for (const [width, height] of [[960, 900], [960, 600], [390, 844], [1440, 600], [1440, 900]]) {
		const next = layoutDesktop(width, height);
		current = reflowDesktop(current, previous, next, width, height);
		assert.deepEqual(current, next);
		const adam = current.find((w) => w.id === "me")!;
		assert.ok(Math.abs(adam.x + adam.w / 2 - width / 2) <= 0.5);
		assert.ok(Math.abs(adam.y + adam.h / 2 - (height - 36) / 2) <= 0.5);
		previous = next;
	}
});

test("reflow preserves dragged offsets, nested placement, and user window state", () => {
	const previous = layoutDesktop(1440, 900);
	const current: DesktopWindow[] = previous.filter((w) => w.id !== "new").map((w) => {
		if (w.id === "me") return { ...w, x: w.x + 35, y: w.y + 14 };
		if (w.id === "alt") return { ...w, x: w.x + 40, y: w.y + 11 };
		if (w.id === "terminal") return { ...w, minimized: true, z: 88 };
		return w;
	});
	current.push({ id: "explorer", title: "secrets", kind: "explorer", x: 460, y: 270, w: 520, h: 360, z: 100 });
	const next = layoutDesktop(960, 600);
	const result = reflowDesktop(current, previous, next, 960, 600);
	assert.deepEqual(result.map((w) => w.id), current.map((w) => w.id));
	for (const [id, dx, dy] of [["me", 35, 14], ["alt", 40, 11]] as const) {
		const window = result.find((w) => w.id === id)!;
		const base = next.find((w) => w.id === id)!;
		assert.equal(window.x - base.x, dx);
		assert.equal(window.y - base.y, dy);
	}
	assert.equal(result.find((w) => w.id === "terminal")?.minimized, true);
	assert.equal(result.find((w) => w.id === "terminal")?.z, 88);
	assert.deepEqual(result.find((w) => w.id === "explorer"), { ...current.at(-1), x: 220, y: 120 });
	const restored = reflowDesktop(result, next, previous, 1440, 900);
	assert.deepEqual(restored, current);
});

test("resized parents stay reachable and nested windows stay inside their canvas", () => {
	const previous = layoutDesktop(1440, 900);
	const current = previous.map((w) => w.id === "me" || w.parentId === "me"
		? { ...w, x: w.x + 5000, y: w.y + 5000 }
		: w);
	const next = layoutDesktop(960, 600);
	const result = reflowDesktop(current, previous, next, 960, 600);
	const parent = result.find((w) => w.id === "me")!;
	const child = result.find((w) => w.id === "alt")!;
	assert.equal(parent.x, 960 - 48);
	assert.equal(parent.y, 600 - 36 - 22);
	const bounds = nestBounds(parent);
	assert.ok(child.x >= bounds.x && child.y >= bounds.y);
	assert.ok(child.x + child.w <= bounds.x + bounds.w);
	assert.ok(child.y + child.h <= bounds.y + bounds.h);
	assert.deepEqual(clampWindowPos(-5000, -5000, 400, 960, 600), { x: -352, y: 0 });
});
