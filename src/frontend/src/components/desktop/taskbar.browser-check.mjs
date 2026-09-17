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
	check(order.includes("me") && order.includes("terminal") && !order.includes("alt"), "Wrong task membership");

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

	await page.evaluate(() => {
		for (let i = 0; i < 120; i++) {
			for (const id of ["me", "terminal"]) document.getElementById(`desktop-window-${id}`).dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		}
	});
	check(await win("terminal").evaluate((el) => el.parentElement.classList.contains("desktop__windows") && +getComputedStyle(el.parentElement).zIndex < +getComputedStyle(document.querySelector(".taskbar")).zIndex), "Windows escaped the taskbar stacking boundary");
	return "PASS: activation, family stacking, stable task order and taskbar layering";
}

try {
	browser("open", process.env.TASKBAR_TEST_URL || "http://localhost:3000", "--browser", "chrome");
	console.log(browser("run-code", checkTaskbar.toString()));
} finally {
	try { browser("close"); } catch { /* Preserve the original test failure. */ }
}
