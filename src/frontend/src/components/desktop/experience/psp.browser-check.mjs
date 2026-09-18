/** Run against the dev server from src/frontend with node. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const session = `psp-check-${process.pid}`;
function browser(...args) {
	const output = execFileSync("playwright-cli", [`-s=${session}`, ...args], { encoding: "utf8", timeout: 60_000 });
	assert.ok(!output.includes("### Error"), output);
	return output;
}

browser("open", "http://localhost:3000", "--browser", "chrome");
const result = browser("run-code", `async (page) => {
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.locator(".rsod").click();
	await page.locator(".desktop--busy").waitFor({ state: "hidden" });

	const psp = page.locator("#desktop-window-experience");
	const xmb = page.locator(".psp-xmb");
	const screen = page.locator(".psp__screen");
	const initialProject = await xmb.getAttribute("data-project");
	const titlebars = await psp.locator(".win-titlebar").count();
	const beforeScreenClick = await psp.boundingBox();
	const screenBox = await screen.boundingBox();
	await page.mouse.click(screenBox.x + screenBox.width / 2, screenBox.y + screenBox.height / 2);
	const afterScreenClick = await psp.boundingBox();

	await xmb.focus();
	await page.keyboard.press("ArrowRight");
	const nextProject = await xmb.getAttribute("data-project");
	await page.keyboard.press("ArrowDown");
	const selectedItem = await page.locator(".psp-xmb__item.is-selected").innerText();
	await page.keyboard.press("Enter");
	const detailVisible = await page.locator(".psp-xmb__detail").count();
	await page.keyboard.press("Escape");
	const listVisible = await page.locator(".psp-xmb__items").count();

	return {
		initialProject,
		nextProject,
		selectedItem,
		detailVisible,
		listVisible,
		titlebars,
		screenDrag: [afterScreenClick.x - beforeScreenClick.x, afterScreenClick.y - beforeScreenClick.y],
	};
}`);

assert.match(result, /"initialProject":"amazon"/);
assert.match(result, /"nextProject":"ibm"/);
assert.match(result, /"selectedItem":"Item 2"/);
assert.match(result, /"detailVisible":1/);
assert.match(result, /"listVisible":1/);
assert.match(result, /"titlebars":0/);
assert.match(result, /"screenDrag":\[0,0\]/);
console.log(result);
