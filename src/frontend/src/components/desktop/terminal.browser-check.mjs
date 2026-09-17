/** Focused browser check; start the dev server, then run from src/frontend:
 * node src/components/desktop/terminal.browser-check.mjs
 * Uses the existing playwright-cli tool. Clipboard and chat are mocked.
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
	const opening = await page.locator(".term__line").allTextContents();
	check(opening[0] === "Microsoft(R) Windows 95", "Wrong DOS banner");
	check(opening.includes("   (C)Copyright Microsoft Corp 1981-1995."), "Wrong copyright year");
	check(opening.includes("C:\\PORTFOLIO>ADAM.EXE"), "Chat program did not launch");
	check(opening.includes("ADAM> how u doing :)"), "ASCII greeting missing");
	// Test controls unobstructed by the deliberately overlapping desktop windows.
	await page.locator(".win--dos").evaluate((el) => {
		el.style.cssText += ";left:20px;top:20px;width:640px;height:480px;z-index:100";
	});
	await page.evaluate(() => {
		window.testClipboard = "";
		window.clipboardDenied = false;
		window.testChatRequests = [];
		const nativeFetch = window.fetch.bind(window);
		window.fetch = (resource, init) => {
			if (new URL(String(resource), location.href).pathname !== "/chat") return nativeFetch(resource, init);
			window.testChatRequests.push(JSON.parse(init.body));
			return new Promise((resolve) => {
				window.finishChat = () => {
					delete window.finishChat;
					resolve(new Response('event: token\ndata: {"content":"hello"}\n\nevent: token\ndata: {"content":" there"}\n\n', {
						headers: { "Content-Type": "text/event-stream" },
					}));
				};
			});
		};
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

	await input.fill("abcd");
	await input.press("ArrowLeft");
	await input.press("ArrowLeft");
	await input.pressSequentially("X");
	check(await input.inputValue() === "abXcd", "Mid-line editing failed");
	check(await input.evaluate((el) => el.selectionStart) === 3, "Caret lost the insertion point");
	check(await input.evaluate((el) => getComputedStyle(el).color) === "rgb(192, 192, 192)", "Native input text is invisible");
	await input.fill("long command ".repeat(100));
	check(await page.locator(".term__body").evaluate((el) => el.scrollWidth <= el.clientWidth), "Long input overflowed the terminal");
	const fontSize = page.getByRole("combobox", { name: "Terminal font size" });
	await fontSize.focus();
	await page.keyboard.press("Tab");
	check(await page.getByRole("button", { name: "Copy", exact: true }).evaluate((el) => el === document.activeElement), "Toolbar keyboard focus was stolen");
	await input.fill("composition");
	await input.dispatchEvent("keydown", { key: "Enter", isComposing: true });
	check(await page.evaluate(() => window.testChatRequests.length) === 0, "IME confirmation submitted a message");
	await input.fill("hello");
	await input.press("Enter");
	await page.waitForFunction(() => typeof window.finishChat === "function");
	check(await input.evaluate((el) => el.readOnly && el === document.activeElement), "Reply lost the input or its focus");
	await fontSize.focus();
	await page.evaluate(() => window.finishChat());
	await page.waitForFunction(() => !document.querySelector(".term__input").readOnly);
	check(await fontSize.evaluate((el) => el === document.activeElement), "Reply completion stole focus from the toolbar");
	check((await page.locator(".term__line").allTextContents()).includes("ADAM> hello there"), "Streamed tokens were not assembled");
	return "PASS: DOS chrome, font, clipboard, native editing, long input, IME, focus, and streamed reply";
}

try {
	browser("open", url, "--browser", "chrome");
	console.log(browser("run-code", checkTerminal.toString()));
} finally {
	browser("close");
}
