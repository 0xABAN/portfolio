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
	await page.locator(".rsod").waitFor({ state: "visible" });
	await page.locator(".rsod").click();
	await page.locator(".desktop--busy").waitFor({ state: "hidden" });

	const psp = page.locator("#desktop-window-experience");
	await psp.locator(".psp-xmb").waitFor({ state: "visible" });
	await psp.locator(".psp-xmb__category").first().waitFor({ state: "visible" });
	const xmb = page.locator(".psp-xmb");
	const screen = page.locator(".psp__screen");
	const initialCategory = await xmb.getAttribute("data-category");
	const initialBackground = await xmb.evaluate((element) => getComputedStyle(element).backgroundImage);
	const titlebars = await psp.locator(".win-titlebar").count();
	const beforeScreenClick = await psp.boundingBox();
	const screenBox = await screen.boundingBox();
	await page.mouse.click(screenBox.x + screenBox.width * 0.98, screenBox.y + screenBox.height * 0.75);
	const afterScreenClick = await psp.boundingBox();

	await xmb.focus();
	const categoryLabels = await psp.locator(".psp-xmb__category").allTextContents();
	const disabledCategories = await psp.locator(".psp-xmb__category:disabled").count();
	const initialItems = await psp.locator(".psp-xmb__item-content strong").allTextContents();
	const initialCardDescription = await psp.locator(".psp-xmb__item.is-selected .psp-xmb__item-content span").innerText();
	await page.keyboard.press("ArrowDown");
	const selectedItem = await psp.locator(".psp-xmb__item.is-selected .psp-xmb__item-content strong").innerText();
	const selectedCardDescription = await psp.locator(".psp-xmb__item.is-selected .psp-xmb__item-content span").innerText();
	await page.keyboard.press("Enter");
	const jobDetailVisible = await psp.locator(".psp-xmb__detail").count();
	const jobListVisible = await psp.locator(".psp-xmb__items").count();
	await page.keyboard.press("Escape");
	await page.keyboard.press("ArrowRight");
	const nextCategory = await xmb.getAttribute("data-category");
	const projectBackground = await xmb.evaluate((element) => getComputedStyle(element).backgroundImage);
	const projectItems = await psp.locator(".psp-xmb__item-content strong").allTextContents();
	const openPopup = async (action) => {
		const popupPromise = page.waitForEvent("popup");
		await action();
		const popup = await popupPromise;
		await popup.waitForLoadState("domcontentloaded").catch(() => {});
		const title = await popup.title();
		await popup.close();
		return title;
	};
	const projectEnterTitle = await openPopup(() => page.keyboard.press("Enter"));
	const projectClickTitle = await openPopup(() => psp.locator(".psp-xmb__item.is-selected").click());
	await xmb.focus();
	for (let index = 0; index < 4; index += 1) await page.keyboard.press("ArrowDown");
	await page.waitForTimeout(50);
	const scrolledItem = await psp.locator(".psp-xmb__item.is-selected .psp-xmb__item-content strong").innerText();
	const listScrollTop = await psp.locator(".psp-xmb__items").evaluate((element) => element.scrollTop);
	const listVisible = await psp.locator(".psp-xmb__items").count();

	return {
		initialCategory,
		initialBackground,
		nextCategory,
		projectBackground,
		categoryLabels,
		disabledCategories,
		initialItems,
		initialCardDescription,
		selectedItem,
		selectedCardDescription,
		jobDetailVisible,
		jobListVisible,
		projectEnterTitle,
		projectClickTitle,
		projectItems,
		scrolledItem,
		listScrollTop,
		listVisible,
		titlebars,
		screenDrag: [afterScreenClick.x - beforeScreenClick.x, afterScreenClick.y - beforeScreenClick.y],
	};
}`);

assert.match(result, /"initialCategory":"jobs"/);
assert.match(result, /"initialBackground".*hxh-red\.png/);
assert.match(result, /"nextCategory":"projects"/);
assert.match(result, /"projectBackground".*reze-mono\.png/);
assert.match(result, /"categoryLabels":\["Jobs","Projects","Settings","Photo","Music","Video","Game","Network","PlayStation Network"\]/);
assert.match(result, /"disabledCategories":7/);
assert.match(result, /"initialItems":\["amazon","ibm"\]/);
assert.match(result, /"initialCardDescription":"swe intern @ amazon summer 2026"/);
assert.match(result, /"selectedItem":"ibm"/);
assert.match(result, /"selectedCardDescription":"ai eng co-op @ ibm 2025-2026"/);
assert.match(result, /"jobDetailVisible":0/);
assert.match(result, /"jobListVisible":1/);
assert.match(result, /"projectEnterTitle".*0xABAN\/copycat/);
assert.match(result, /"projectClickTitle".*0xABAN\/copycat/);
assert.match(result, /"projectItems":\["copycat","definitive multiplayer","fit-check","maestro","simulacra","terrar.ai"\]/);
assert.match(result, /"scrolledItem":"simulacra"/);
assert.match(result, /"listScrollTop":[1-9]/);
assert.match(result, /"listVisible":1/);
assert.match(result, /"titlebars":0/);
assert.match(result, /"screenDrag":\[0,0\]/);
console.log(result);
