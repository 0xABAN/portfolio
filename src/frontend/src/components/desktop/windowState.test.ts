import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutDesktop } from "./windows";
import { activateWindow, activeWindowId, minimizeWindowTree, taskWindows } from "./windowState";

test("task order survives switching, minimizing and restoring", () => {
	let windows = layoutDesktop(1440, 900);
	const order = taskWindows(windows).map((w) => w.id);
	assert.ok(order.includes("terminal") && order.includes("me"));
	assert.ok(!order.includes("alt"));
	windows = activateWindow(windows, "terminal");
	assert.equal(activeWindowId(windows), "terminal");
	assert.strictEqual(activateWindow(windows, "terminal"), windows);
	windows = minimizeWindowTree(windows, "terminal");
	assert.notEqual(activeWindowId(windows), "terminal");
	windows = activateWindow(windows, "terminal");
	assert.equal(activeWindowId(windows), "terminal");
	assert.deepEqual(taskWindows(windows).map((w) => w.id), order);
	assert.strictEqual(activateWindow(windows, "missing"), windows);
});

test("activating a nested window raises and restores its entire family", () => {
	let windows = minimizeWindowTree(layoutDesktop(1440, 900), "me");
	assert.ok(windows.filter((w) => w.id === "me" || w.id === "alt").every((w) => w.minimized));
	for (let i = 0; i < 150; i++) {
		windows = activateWindow(activateWindow(windows, "terminal"), "alt");
		const paint = windows.find((w) => w.id === "me")!;
		const child = windows.find((w) => w.id === "alt")!;
		assert.equal(activeWindowId(windows), "me");
		assert.ok(!paint.minimized && !child.minimized);
		assert.equal(child.z, paint.z + 1);
		assert.ok(windows.filter((w) => w.id !== "me" && w.id !== "alt").every((w) => w.z < paint.z));
	}
});
