/** Focused browser check; start the dev server, then run from src/frontend:
 * node src/components/desktop/terminal.browser-check.mjs
 * Uses the existing playwright-cli tool. Clipboard access is mocked.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const session = `terminal-check-${process.pid}`;
const url = process.env.TERMINAL_TEST_URL || "http://localhost:3000";

function browser(...args) {
	const output = execFileSync("playwright-cli", [`-s=${session}`, ...args], {
		encoding: "utf8",
		timeout: 60000,
	});
	// The CLI can report page exceptions without a nonzero exit code.
	assert.ok(!output.includes("### Error"), output);
	return output;
}

async function checkTerminal(page) {
	const check = (condition, message) => {
		if (!condition) throw new Error(message);
	};
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.locator(".rsod").click();
	const input = page.getByRole("textbox", { name: "Terminal input" });
	await input.waitFor();
	// Test controls unobstructed by the deliberately overlapping desktop windows.
	await page.locator(".win--dos").evaluate((el) => {
		el.style.cssText += ";left:20px;top:20px;width:640px;height:480px;z-index:100";
	});
	await page.evaluate(() => {
		window.testClipboard = "";
		window.clipboardDenied = false;
		Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
			writeText: async (text) => {
				if (window.clipboardDenied) throw new Error("Denied");
				window.testClipboard = text;
			},
			readText: async () => {
				if (window.clipboardDenied) throw new Error("Denied");
				return window.testClipboard;
			},
		} });
	});

	check(await page.locator(".win--dos .win-titlebar").evaluate((el) => getComputedStyle(el).backgroundColor) === "rgb(0, 0, 128)", "Navy title bar missing");
	check(await page.locator(".win--dos .win-titlebar__text").innerText() === "MS-DOS Prompt", "Wrong window title");
	await page.evaluate(() => document.fonts.load('16px "IBM VGA"'));
	check(await page.evaluate(() => document.fonts.check('16px "IBM VGA"')), "DOS font did not load");
	await page.getByRole("button", { name: "Copy", exact: true }).click();
	check((await page.evaluate(() => window.testClipboard)).includes("Microsoft"), "Copy did not include transcript");
	await input.fill("hello world");
	await input.evaluate((el) => el.setSelectionRange(6, 11));
	await page.evaluate(() => { window.testClipboard = "DOS"; });
	await page.getByRole("button", { name: "Paste", exact: true }).click();
	check(await input.inputValue() === "hello DOS", "Paste did not replace the selection");
	await page.getByRole("combobox", { name: "Terminal font size" }).selectOption("32");
	check(await page.locator(".term__body").evaluate((el) => getComputedStyle(el).fontSize) === "32px", "Font size did not change");
	await page.getByRole("combobox", { name: "Terminal font size" }).selectOption("16");
	await page.evaluate(() => { window.clipboardDenied = true; });
	await page.getByRole("button", { name: "Paste", exact: true }).click();
	check((await page.locator(".term__status").innerText()).includes("Clipboard unavailable"), "Clipboard denial was not explained");
	return "PASS: DOS chrome, font, copy, selection-aware paste, sizing, and clipboard denial";
}

try {
	browser("open", url, "--browser", "chrome");
	console.log(browser("run-code", checkTerminal.toString()));
} finally {
	browser("close");
}
