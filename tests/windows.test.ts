import assert from "node:assert/strict";
import { test } from "node:test";
import {
	activateWindow,
	activeWindowId,
	clampWindowPos,
	layoutDesktop,
	makeExperienceWindow,
	minimizeWindowTree,
	resizeDesktop,
	nestBounds,
	openApp,
	restoreDecorations,
	taskWindows,
	TASKBAR_H,
	TITLE_H,
	type AppId,
	type DesktopWindow,
} from "@/components/desktop/windows";

const SIZES = [[1280, 720], [1710, 900], [1920, 1080], [2560, 1440]];
const size = ({ id, w, h }: DesktopWindow) => `${id}:${w}x${h}`;

test("windows keep the same pixel size at every resolution", () => {
	const [first, ...rest] = SIZES.map(([width, height]) => layoutDesktop(width, height).map(size));
	for (const sizes of rest) assert.deepEqual(sizes, first);
});

test("the default arrangement fits the 1710x900 design screen", () => {
	for (const w of layoutDesktop(1710, 900).filter((w) => !w.minimized)) {
		assert.ok(w.x >= 0 && w.y >= 0, w.id);
		assert.ok(w.x + w.w <= 1710 && w.y + w.h <= 900 - TASKBAR_H, w.id);
	}
});

test("secrets starts open as a small window over the lower-left of adam", () => {
	const [adam, secrets] = ["me", "explorer"].map((id) => layoutDesktop(1710, 900).find((w) => w.id === id)!);
	assert.ok(secrets.w <= 252 && secrets.h <= 190);
	assert.ok(secrets.x < adam.x && secrets.x + secrets.w > adam.x);
	assert.ok(secrets.y > adam.y + adam.h / 2 && secrets.y + secrets.h < adam.y + adam.h);
	assert.ok(secrets.z > adam.z);
});

test("resizing keeps the arrangement centered and dragged offsets intact", () => {
	const wide = layoutDesktop(1798, 900).map((w) => (w.id === "terminal" ? { ...w, x: w.x + 30 } : w));
	const narrow = layoutDesktop(1710, 900);
	const result = resizeDesktop(wide, -44, 0, 1710, 900);

	for (const w of result.filter((w) => w.id !== "cd-player")) {
		const base = narrow.find((n) => n.id === w.id)!;
		assert.equal(w.x - base.x, w.id === "terminal" ? 30 : 0, w.id);
		assert.equal(w.y, base.y, w.id);
	}
});

test("shrinking the screen moves windows only enough to keep titlebars reachable", () => {
	const windows = layoutDesktop(1920, 1080);
	const moved = resizeDesktop(windows, 0, 0, 800, 600);

	for (const w of moved) {
		const before = windows.find((b) => b.id === w.id)!;
		assert.equal(size(w), size(before));
		if (w.parentId) continue;
		assert.ok(w.x + w.w >= 48 && w.x <= 800 - 48, w.id);
		assert.ok(w.y >= 0 && w.y <= 600 - TASKBAR_H - TITLE_H, w.id);
	}

	const [paint, alt] = ["me", "alt"].map((id) => moved.find((w) => w.id === id)!);
	const bounds = nestBounds(paint);
	assert.ok(alt.x >= bounds.x && alt.y >= bounds.y);
	assert.ok(alt.x + alt.w <= bounds.x + bounds.w && alt.y + alt.h <= bounds.y + bounds.h);
	assert.deepEqual(clampWindowPos(-5000, -5000, 400, 960, 600), { x: -352, y: 0 });
});

test("task order survives switching, minimizing and restoring", () => {
	let windows = layoutDesktop(1440, 900);
	const order = taskWindows(windows).map((w) => w.id);
	assert.deepEqual(order, ["me", "terminal", "github", "cd-player", "explorer"]);
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
