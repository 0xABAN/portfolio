/** Run against the dev server from src/frontend with node; uses installed playwright-cli. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const session = `launch-check-${process.pid}`;
function browser(...args) {
	const output = execFileSync("playwright-cli", [`-s=${session}`, ...args], { encoding: "utf8", timeout: 60000 });
	assert.ok(!output.includes("### Error"), output);
	return output;
}

async function checkLaunches(page) {
	const check = (value, message) => { if (!value) throw new Error(message); };
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.route("**/api/views", (route) => route.fulfill({ json: { count: 1 } }));
	await page.locator(".rsod").waitFor();
	await page.evaluate(() => {
		// These checks exercise app launching, not audio output.
		window.Audio = class extends window.Audio {
			constructor(...args) { super(...args); super.volume = 0; }
			get volume() { return 0; }
			set volume(_value) {}
		};
		window.openedLinks = [];
		window.open = (...args) => { window.openedLinks.push(args); return null; };
	});
	await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });
	await page.clock.pauseAt(new Date("2026-01-01T00:00:01Z"));
	await page.locator(".rsod").click();
	await page.clock.runFor(900);
	await page.locator(".taskbar").waitFor();
	await page.clock.runFor(2100);
	await page.addStyleTag({ content: "nextjs-portal { display: none; }" });

	const win = (id) => page.locator(`#desktop-window-${id}`);
	const task = (id) => page.locator(`[data-task-id="${id}"]`);
	const icon = (id) => page.locator(`[data-app-id="${id}"]`);
	const busy = () => page.locator(".desktop").evaluate((el) => el.classList.contains("desktop--busy"));
	async function delayed(id, milliseconds, launch, whileWaiting) {
		check(!(await win(id).isVisible()), `${id} is already visible before the launch check`);
		await launch();
		check(await busy(), `${id} skipped the wait animation`);
		check(await page.getByRole("button", { name: "Start", exact: true }).evaluate((el) => getComputedStyle(el).cursor.includes("/cursors/wait.cur")), "Launch did not show the hourglass");
		if (whileWaiting) await whileWaiting();
		await page.clock.runFor(milliseconds - 1);
		check(await busy() && !(await win(id).isVisible()), `${id} opened before its delay finished`);
		await page.clock.runFor(1);
		await win(id).waitFor();
		check(!(await busy()), `${id} left the desktop busy`);
		await page.clock.runFor(16); // Let the explicit launch restore keyboard focus.
	}
	async function fromStart(label, group = "Programs") {
		await page.getByRole("button", { name: "Start", exact: true }).click();
		const menu = page.getByRole("menu", { name: "Start menu", exact: true });
		await menu.getByRole("menuitem", { name: group, exact: true }).click();
		await menu.getByRole("menuitem", { name: label, exact: true }).click();
	}

	await delayed("cd-player", 1500, () => icon("cd-player").click(), () => icon("explorer").click());
	check(await win("explorer").count() === 0, "A second click queued another app during the wait");
	await delayed("explorer", 500, () => icon("explorer").click());
	await delayed("bio", 1500, () => win("explorer").getByRole("button", { name: "bio.txt", exact: true }).click());
	await task("explorer").click();
	check(!(await busy()) && await win("explorer").isVisible(), "Taskbar switching unexpectedly used the launch delay");
	await delayed("experience", 1500, () => win("explorer").getByRole("button", { name: "experience.exe", exact: true }).click());

	for (const [id, label, group] of [
		["me", "Paint", "Programs"],
		["terminal", "MS-DOS Prompt", "Programs"],
		["github", "Activity", "Programs"],
		["experience", "Experience", "Programs"],
		["cd-player", "CD Player", "Programs"],
		["explorer", "secrets", "Documents"],
		["bio", "bio.txt", "Documents"],
	]) {
		// Some initial windows extend offscreen; minimize without moving their layout.
		await win(id).getByRole("button", { name: "Minimize", exact: true }).dispatchEvent("click");
		await delayed(id, id === "explorer" ? 500 : 1500, () => fromStart(label, group));
	}

	await win("bio").getByRole("button", { name: "Minimize", exact: true }).click();
	await task("bio").click();
	check(await win("bio").isVisible() && !(await busy()), "Taskbar restoration should remain immediate");
	await task("explorer").click();
	await win("explorer").getByRole("button", { name: "resume.pdf", exact: true }).click();
	check(!(await busy()) && await page.evaluate(() => window.openedLinks.length) === 1, "External links were delayed out of their user gesture");

	// playwright-cli waits on a page timer after run-code returns.
	await page.clock.resume();
	return "PASS: desktop, every Start app, Explorer files, exact delays, hourglass, busy-click guard and immediate taskbar restores";
}

try {
	browser("open", process.env.LAUNCH_TEST_URL || "http://localhost:3000", "--browser", "chrome");
	console.log(browser("run-code", checkLaunches.toString()));
} finally {
	try { browser("close"); } catch { /* Preserve the original test failure. */ }
}
