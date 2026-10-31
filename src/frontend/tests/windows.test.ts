import assert from "node:assert/strict";
import { test } from "node:test";
import { activateWindow, activeWindowId, clampWindowPos, layoutDesktop, makeExperienceWindow, makeExplorerWindow, minimizeWindowTree, nestBounds, openApp, reflowDesktop, restoreDecorations, taskWindows, TASKBAR_H, type AppId, type DesktopWindow } from "@/components/desktop/windows";

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
		assert.ok(secrets.y + secrets.h <= height - TASKBAR_H - 24);
		assert.equal(secrets.y + secrets.h, adam.y + adam.h);
	}
	const secrets = makeExplorerWindow(50, undefined, 1440, 900);
	assert.equal(secrets.x + secrets.w / 2, 720);
	assert.equal(secrets.y + secrets.h / 2, (900 - TASKBAR_H) / 2);
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
		assert.ok(Math.abs(adam.y + adam.h / 2 - (height - TASKBAR_H) / 2) <= 0.5);
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
	assert.deepEqual(result.find((w) => w.id === "explorer"), { ...current.at(-1), x: 220.5, y: 120 });
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
	assert.equal(parent.y, 600 - TASKBAR_H - 22);
	const bounds = nestBounds(parent);
	assert.ok(child.x >= bounds.x && child.y >= bounds.y);
	assert.ok(child.x + child.w <= bounds.x + bounds.w);
	assert.ok(child.y + child.h <= bounds.y + bounds.h);
	assert.deepEqual(clampWindowPos(-5000, -5000, 400, 960, 600), { x: -352, y: 0 });
});

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

test("PSP fits narrow viewports and stays above previously open windows only when active", () => {
	const mobile = makeExperienceWindow(1, 390, 844);
	assert.equal(mobile.title, "experience");
	assert.ok(mobile.x >= 0 && mobile.x + mobile.w <= 390);
	assert.ok(mobile.y >= 0 && mobile.y + mobile.h <= 844 - TASKBAR_H);

	let windows = openApp(layoutDesktop(1440, 900), "experience", 1440, 900);
	const pspZ = windows.find((w) => w.id === "experience")!.z;
	windows = openApp(windows, "terminal", 1440, 900);
	assert.ok(windows.find((w) => w.id === "terminal")!.z > pspZ);
	assert.ok(windows.find((w) => w.id === "github")!.z < pspZ);

	windows = openApp(windows, "experience", 1440, 900);
	assert.ok(windows.find((w) => w.id === "experience")!.z > windows.find((w) => w.id === "terminal")!.z);
});

test("launching opens missing apps once and restores without resetting geometry", () => {
	let windows = layoutDesktop(1440, 900).filter((w) => w.id !== "me" && w.id !== "alt");
	for (const id of ["me", "terminal", "github", "explorer", "experience", "cd-player", "recycle-bin"] as AppId[]) {
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
