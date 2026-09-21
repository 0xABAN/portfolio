import assert from "node:assert/strict";
import { test } from "node:test";
import { layoutDesktop, reflowDesktop, TASKBAR_H } from "./windows";
import { activateWindow, activeWindowId, minimizeWindowTree, openApp, restoreDecorations, taskWindows, toggleMaximizeWindow, type AppId } from "./windowState";

test("task order survives switching, minimizing and restoring", () => {
	let windows = layoutDesktop(1440, 900);
	const order = taskWindows(windows).map((w) => w.id);
	assert.deepEqual(order, ["me", "terminal", "github", "cd-player"]);
	assert.equal(windows.find((w) => w.id === "experience"), undefined);
	assert.equal(activeWindowId(activateWindow(windows, "sysmsg-0")), undefined);
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

test("launching opens missing apps once and restores without resetting geometry", () => {
	let windows = layoutDesktop(1440, 900).filter((w) => w.id !== "me" && w.id !== "alt");
	for (const id of ["me", "terminal", "github", "explorer", "bio", "experience", "cd-player", "word", "recycle-bin"] as AppId[]) {
		windows = openApp(windows, id, 1440, 900);
		const opened = windows.find((w) => w.id === id)!;
		windows = minimizeWindowTree(windows.map((w) => w.id === id ? { ...w, x: w.x + 17 } : w), id);
		windows = openApp(windows, id, 1440, 900);
		assert.equal(windows.filter((w) => w.id === id).length, 1);
		assert.equal(windows.find((w) => w.id === id)?.x, opened.x + 17);
		assert.equal(windows.find((w) => w.id === id)?.launched, true);
		assert.equal(activeWindowId(windows), id);
	}
	assert.equal(windows.filter((w) => w.id === "alt").length, 1);
});

test("Word maximizes, survives viewport changes and restores its saved geometry", () => {
	const layout = layoutDesktop(1440, 900);
	let windows = openApp(layout, "word", 1440, 900);
	const original = windows.find((w) => w.id === "word")!;
	windows = toggleMaximizeWindow(windows, "word", 1440, 900);
	assert.equal(windows.find((w) => w.id === "word")?.w, 1440);
	windows = toggleMaximizeWindow(windows, "word", 1440, 900);
	const restored = windows.find((w) => w.id === "word")!;
	for (const key of ["x", "y", "w", "h"] as const) assert.equal(restored[key], original[key]);
	windows = toggleMaximizeWindow(windows, "word", 1440, 900);
	windows = reflowDesktop(windows, layout, layoutDesktop(390, 844), 390, 844);
	const maximized = windows.find((w) => w.id === "word")!;
	assert.deepEqual([maximized.x, maximized.y, maximized.w, maximized.h], [0, 0, 390, 844 - TASKBAR_H]);
	windows = toggleMaximizeWindow(windows, "word", 390, 844);
	const mobile = windows.find((w) => w.id === "word")!;
	assert.ok(mobile.x >= 0 && mobile.x + mobile.w <= 390);
	assert.equal(mobile.restoreBounds, undefined);
});

test("CD Player starts minimized and can be fully removed and relaunched", () => {
	let windows = layoutDesktop(1440, 900);
	assert.equal(windows.find((w) => w.id === "cd-player")?.minimized, true);
	windows = openApp(windows, "cd-player", 1440, 900);
	assert.equal(activeWindowId(windows), "cd-player");
	windows = windows.filter((w) => w.id !== "cd-player");
	assert.ok(!taskWindows(windows).some((w) => w.id === "cd-player"));
	assert.ok(!restoreDecorations(windows).some((w) => w.id === "cd-player"));
	windows = openApp(windows, "cd-player", 390, 844);
	const player = windows.find((w) => w.id === "cd-player")!;
	assert.equal(player.minimized, false);
	assert.equal(player.launched, true);
	assert.ok(player.x >= 0 && player.x + player.w <= 390);
});

test("restoring decorations leaves app state and removed windows alone", () => {
	const windows = minimizeWindowTree(minimizeWindowTree(layoutDesktop(1440, 900), "terminal"), "sysmsg-0")
		.filter((w) => w.id !== "new");
	const result = restoreDecorations(windows);
	assert.equal(result.find((w) => w.id === "sysmsg-0")?.minimized, false);
	assert.strictEqual(result.find((w) => w.id === "terminal"), windows.find((w) => w.id === "terminal"));
	assert.ok(!result.some((w) => w.id === "new"));
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
