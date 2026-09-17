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
	const help = opening.indexOf("C:\\PORTFOLIO>help");
	const explanation = opening.indexOf("  ADAM.EXE  Chat with Adam about his work.");
	const launch = opening.indexOf("C:\\PORTFOLIO>ADAM.EXE");
	const greeting = opening.indexOf("ADAM> how u doing :)");
	check(help > 1 && explanation > help && launch > explanation && greeting > launch, "Expected HELP, command list, ADAM.EXE, then Adam's greeting");
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

	check(await page.locator(".win--dos .win-titlebar").evaluate((el) => getComputedStyle(el).backgroundColor) === "rgb(175, 0, 0)", "Portfolio-red title bar missing");
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

	await input.fill("VeR");
	await input.press("Enter");
	check((await page.locator(".term__line").allTextContents()).includes("Windows 95. [Version 4.00.950]"), "VER did not run locally");
	await input.fill("help");
	await input.press("Enter");
	check((await page.locator(".term__body").innerText()).includes("CLEAR  Alias for CLS."), "HELP omitted supported commands");
	await input.fill("unsent draft");
	for (const [key, expected] of [
		["ArrowUp", "help"], ["ArrowUp", "VeR"], ["ArrowUp", "hello"],
		["ArrowUp", "hello"], ["ArrowDown", "VeR"], ["ArrowDown", "help"],
		["ArrowDown", "unsent draft"], ["ArrowDown", "unsent draft"], ["Escape", ""],
	]) {
		await input.press(key);
		check(await input.inputValue() === expected, `${key}: expected ${expected}`);
	}
	await input.press("ArrowUp");
	await input.pressSequentially("!");
	await input.press("ArrowUp");
	await input.press("ArrowDown");
	check(await input.inputValue() === "help!", "Editing recalled input lost the new draft");
	await input.fill(" ClS ");
	await input.press("Enter");
	check(await page.locator(".term__line").count() === 0, "CLS did not clear output without rebooting");
	check(await page.evaluate(() => window.testChatRequests.length) === 1, "Local commands reached the chat API");
	await input.press("ArrowUp");
	check(await input.inputValue() === "ClS", "CLS erased input recall");
	await input.fill("follow-up");
	await input.press("Enter");
	await page.waitForFunction(() => typeof window.finishChat === "function");
	const messages = await page.evaluate(() => window.testChatRequests[1].messages);
	check(JSON.stringify(messages.map((message) => message.content)) === JSON.stringify(["how u doing :)", "hello", "hello there", "follow-up"]), "CLS reset or polluted the conversation");
	await page.evaluate(() => window.finishChat());
	await page.waitForFunction(() => !document.querySelector(".term__input").readOnly);
	await input.fill("clear");
	await input.press("Enter");
	check(await page.locator(".term__line").count() === 0, "CLEAR alias failed");
	check(await page.evaluate(() => window.testChatRequests.length) === 2, "CLEAR sent a chat request");

	// Check narrow text wrapping; preserve the desktop's existing off-screen placement.
	await page.setViewportSize({ width: 390, height: 844 });
	await page.reload();
	await page.locator(".rsod").click();
	await input.waitFor();
	check(await page.locator(".term__body").evaluate((el) => el.scrollWidth <= el.clientWidth), "Narrow terminal overflowed horizontally");
	check(await input.evaluate((el) => el.getBoundingClientRect().width > 100), "Narrow prompt has no usable input space");
	check(await input.evaluate((el) => getComputedStyle(el).getPropertyValue("caret-animation")) === "manual", "Reduced-motion caret still animates");

	// Normal-motion startup must type both commands, not just show the final log.
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.reload();
	await page.evaluate(() => {
		// Record mutations: polling can miss a short-lived typing frame.
		window.startupCommands = new Set();
		const observer = new MutationObserver(() => {
			for (const line of document.querySelectorAll(".term__line")) {
				if (line.textContent.startsWith("C:\\PORTFOLIO>")) window.startupCommands.add(line.textContent);
			}
			if (document.querySelector(".term__input")) observer.disconnect();
		});
		observer.observe(document, { subtree: true, childList: true, characterData: true });
	});
	await page.locator(".rsod").click();
	await input.waitFor();
	const frames = await page.evaluate(() => [...window.startupCommands]);
	check(frames.includes("C:\\PORTFOLIO>hel") && frames.includes("C:\\PORTFOLIO>ADA"), "Startup did not animate both commands");
	check((await page.locator(".term__line").allTextContents()).includes("ADAM> how u doing :)"), "Animated startup did not reach chat");
	return "PASS: red DOS chrome, animated HELP/ADAM.EXE sequence, clipboard, editing, IME, focus, streaming, recall, local commands, preserved conversation, narrow text wrapping, and reduced motion";
}

try {
	browser("open", url, "--browser", "chrome");
	console.log(browser("run-code", checkTerminal.toString()));
} finally {
	browser("close");
}
