/** Run against the dev server from src/frontend with node; uses installed playwright-cli. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const session = `taskbar-check-${process.pid}`;
function browser(...args) {
	const output = execFileSync("playwright-cli", [`-s=${session}`, ...args], { encoding: "utf8", timeout: 60000 });
	assert.ok(!output.includes("### Error"), output);
	return output;
}

async function checkTaskbar(page) {
	const check = (value, message) => { if (!value) throw new Error(message); };
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.locator(".rsod").click();
	await page.locator("#desktop-window-sysmsg-4").waitFor();
	await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
	const task = (id) => page.locator(`[data-task-id="${id}"]`);
	const win = (id) => page.locator(`#desktop-window-${id}`);
	const order = await page.locator("[data-task-id]").evaluateAll((nodes) => nodes.map((el) => el.dataset.taskId));
	check(JSON.stringify(order) === JSON.stringify(["me", "terminal", "github"]), "Decorations leaked into main-app tasks");

	await task("terminal").click();
	check(await task("terminal").getAttribute("aria-pressed") === "true", "Task click did not activate Terminal");
	await task("me").click();
	await win("alt").locator(".win-titlebar").click();
	check(await task("me").getAttribute("aria-pressed") === "true", "Nested activation lost its owner");
	check(await win("alt").evaluate((el) => +el.style.zIndex > +document.getElementById("desktop-window-me").style.zIndex), "Paint covered its nested window");
	await win("me").getByRole("button", { name: "Minimize", exact: true }).click();
	check(!(await win("me").isVisible()) && !(await win("alt").isVisible()), "Family did not minimize together");
	await task("me").click();
	check(await win("alt").isVisible(), "Nested window did not restore");
	check(JSON.stringify(await page.locator("[data-task-id]").evaluateAll((nodes) => nodes.map((el) => el.dataset.taskId))) === JSON.stringify(order), "Switching reordered tasks");

	await task("terminal").click();
	const input = page.getByRole("textbox", { name: "Terminal input" });
	await input.fill("keep my draft");
	await input.evaluate((el) => { window.savedTerminalInput = el; });
	await win("terminal").getByRole("button", { name: "Minimize", exact: true }).click();
	check(await win("terminal").count() === 1, "Minimization unmounted Terminal");
	check(await win("terminal").evaluate((el) => el.inert), "Minimized window is still interactive");
	await task("terminal").click();
	check(await input.inputValue() === "keep my draft", "Minimization erased the draft");
	await page.waitForFunction(() => document.activeElement === window.savedTerminalInput);
	check(await input.evaluate((el) => el === window.savedTerminalInput && el === document.activeElement), "Restoration replaced the field or lost its focus");

	await task("me").click();
	const canvas = win("me").locator("canvas");
	await page.waitForFunction(() => document.querySelector(".paint__canvas").getContext("2d").getImageData(10, 10, 1, 1).data[3] > 0);
	const original = await canvas.evaluate((el) => el.toDataURL());
	const rect = await canvas.boundingBox();
	await page.mouse.move(rect.x + 15, rect.y + rect.height * 0.7);
	await page.mouse.down();
	await page.mouse.move(rect.x + 55, rect.y + rect.height * 0.7 + 15, { steps: 4 });
	await page.mouse.up();
	const painted = await canvas.evaluate((el) => el.toDataURL());
	check(painted !== original, "Paint stroke did not draw");
	await win("me").getByRole("button", { name: "Minimize", exact: true }).click();
	await page.keyboard.press("Control+z");
	check(await canvas.evaluate((el) => el.toDataURL()) === painted, "Hidden Paint processed undo or lost its drawing");
	await task("me").click();
	await page.keyboard.press("Control+z");
	check(await canvas.evaluate((el) => el.toDataURL()) === original, "Paint lost undo history");

	await page.evaluate(() => {
		for (let i = 0; i < 120; i++) {
			for (const id of ["me", "terminal"]) document.getElementById(`desktop-window-${id}`).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		}
	});
	check(await win("terminal").evaluate((el) => el.parentElement.classList.contains("desktop__windows") && +getComputedStyle(el.parentElement).zIndex < +getComputedStyle(document.querySelector(".taskbar")).zIndex), "Windows escaped the taskbar stacking boundary");
	const start = page.getByRole("button", { name: "Start", exact: true });
	const menu = page.getByRole("menu", { name: "Start menu", exact: true });
	await start.focus();
	await start.press("ArrowDown");
	await menu.getByRole("menuitem", { name: "Programs", exact: true }).press("ArrowRight");
	await page.waitForFunction(() => document.activeElement?.textContent === "Paint");
	await page.keyboard.press("ArrowDown");
	await page.keyboard.press("Enter");
	check(!(await menu.isVisible()), "Launch did not dismiss Start");
	check(await input.inputValue() === "keep my draft", "Start relaunched an existing terminal");

	await start.click();
	await menu.getByRole("menuitem", { name: "Documents", exact: true }).hover();
	await menu.getByRole("menuitem", { name: "bio.txt", exact: true }).click();
	check(await win("bio").isVisible(), "Documents did not open bio.txt");
	await win("bio").evaluate((el) => { window.savedBio = el; });
	await win("bio").getByRole("button", { name: "Minimize", exact: true }).click();
	await start.click();
	await menu.getByRole("menuitem", { name: "Documents", exact: true }).click();
	await page.waitForFunction(() => document.activeElement?.textContent === "secrets");
	await page.keyboard.press("End");
	await page.keyboard.press("Enter");
	check(await win("bio").evaluate((el) => el === window.savedBio && !el.inert), "Start replaced rather than restored bio.txt");
	await page.waitForFunction(() => document.getElementById("desktop-window-bio").contains(document.activeElement));

	await start.focus();
	await start.press("ArrowDown");
	await page.keyboard.press("ArrowRight");
	await page.waitForFunction(() => document.activeElement?.textContent === "Paint");
	await page.keyboard.press("Escape");
	check(await menu.isVisible(), "Submenu Escape closed all menus");
	await page.keyboard.press("Escape");
	check(!(await menu.isVisible()), "Escape did not close Start");
	check(await start.evaluate((el) => el === document.activeElement), "Escape lost the Start trigger focus");
	await start.click();
	await page.mouse.click(300, 40);
	check(!(await menu.isVisible()), "Outside click did not dismiss Start");

	await win("sysmsg-4").dispatchEvent("pointerdown", { button: 0 });
	await win("sysmsg-4").getByRole("button", { name: "Minimize", exact: true }).click();
	await start.click();
	await menu.getByRole("menuitem", { name: "Restore desktop decorations" }).click();
	check(await win("sysmsg-4").isVisible(), "Start did not restore decorations");
	check(await page.locator('[data-task-id^="sysmsg"], [data-task-id="new"]').count() === 0, "Dismissal or restoration created decoration tasks");
	check(await input.inputValue() === "keep my draft", "Decoration restore reset an app");
	return "PASS: activation, stacking, stable tasks, preserved sessions, Paint undo and Start menu";
}

try {
	browser("open", process.env.TASKBAR_TEST_URL || "http://localhost:3000", "--browser", "chrome");
	console.log(browser("run-code", checkTaskbar.toString()));
} finally {
	try { browser("close"); } catch { /* Preserve the original test failure. */ }
}
