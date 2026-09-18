/** Run from src/frontend against the dev server with node. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const url = process.env.WORD_TEST_URL || "http://localhost:3000";
const session = `word-check-${process.pid}`;
function browser(...args) {
	const output = execFileSync("playwright-cli", [`-s=${session}`, ...args], { encoding: "utf8", timeout: 120000 });
	assert.ok(!output.includes("### Error"), output);
	return output;
}

async function checkWord(page, source) {
	const check = (condition, message) => { if (!condition) throw new Error(message); };
	const errors = [];
	let failResume = false;
	page.on("pageerror", (error) => errors.push(error.message));
	await page.setViewportSize({ width: 1440, height: 1000 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.route("**/api/views", (route) => route.fulfill({ json: { count: 1 } }));
	await page.route("**/api/resume", (route) => route.fulfill({ status: failResume ? 503 : 200, contentType: "text/plain", body: failResume ? "Unavailable" : source }));
	await page.route((url) => url.hostname === "w.soundcloud.com" && url.pathname === "/player/", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Silent test player</title>" }));
	await page.locator(".rsod").waitFor();
	await page.evaluate(() => {
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
	const win = page.locator("#desktop-window-word");
	const doc = win.locator(".word__page");

	async function openWord() {
		await page.getByRole("button", { name: "Start", exact: true }).click();
		await page.getByRole("menuitem", { name: "Documents", exact: true }).click();
		await page.getByRole("menuitem", { name: "resume.doc", exact: true }).click();
		await page.clock.runFor(1516);
		await win.waitFor();
	}

	// Enter through the folder so its desktop notification does not obscure the document.
	await page.getByRole("button", { name: "Start", exact: true }).click();
	await page.getByRole("menuitem", { name: "Documents", exact: true }).click();
	await page.getByRole("menuitem", { name: "secrets", exact: true }).click();
	await page.clock.runFor(516);
	await openWord();
	for (const label of ["Programming Languages:", "Frameworks:", "Developer Tools:", "Databases:", "Cloud/Infra:"]) {
		await doc.getByText(label, { exact: true }).waitFor();
	}
	check((await doc.innerText()).includes("C#"), "Escaped programming-language name is damaged");
	check(!(await doc.innerText()).includes("\\"), "Raw TeX escapes remain in the resume");
	check(await doc.locator(".word__inline-icon").count() === (source.match(/\\fa(?:Github|Linkedin|Envelope)\b/g) || []).length, "A contact or project icon is missing");
	check(await doc.locator(".word__inline-icon").evaluateAll(async (icons) => {
		for (const icon of icons) {
			const style = getComputedStyle(icon);
			const url = style.maskImage.match(/url\("?([^"\)]+)/)?.[1];
			if (!url || icon.getBoundingClientRect().width < 8) return false;
			const image = new Image();
			image.src = url;
			await image.decode();
			if (!image.naturalWidth) return false;
		}
		return true;
	}), "Resume icon artwork did not load");
	check(await win.locator(".win-titlebar").evaluate((element) => {
		const channels = getComputedStyle(element).backgroundColor.match(/\d+/g).map(Number);
		return channels[0] <= 16 && channels[0] === channels[1] && channels[1] === channels[2];
	}), "Word title bar is blue instead of black");
	check(await win.getByRole("toolbar", { name: "Standard", exact: true }).getByRole("button").count() === 21, "Standard toolbar does not match the reference");
	check(await win.getByRole("toolbar", { name: "Formatting", exact: true }).getByRole("button").count() === 13, "Formatting toolbar is incomplete");
	check(await win.getByRole("combobox", { name: "Font", exact: true }).inputValue() === "Times New Roman", "Font selector is missing");
	check(await win.getByRole("combobox", { name: "Font size", exact: true }).inputValue() === "12", "Font selector does not show 12 pt");
	check(await doc.locator("li, .word__paragraph, .word__contact, .word__job, .word__role").evaluateAll((elements) => elements.every((element) => getComputedStyle(element).fontSize === "16px")), "Resume text is not uniformly 12 pt");
	check(await page.evaluate(async () => {
		const image = new Image(); image.src = "/icons/word/toolbar.png"; await image.decode();
		return image.naturalWidth === 560 && image.naturalHeight === 16;
	}), "Native-size Word toolbar sprite is missing");
	await page.clock.runFor(16);
	check(await doc.evaluate((element) => document.activeElement === element), "Word did not receive document focus");
	await page.keyboard.type("x");
	check(await doc.evaluate((element) => document.activeElement === element), "Read-only Word typing was redirected to Terminal");

	await win.getByRole("button", { name: "Open resume source", exact: true }).click();
	check(await page.evaluate(() => window.openedLinks[0]?.[0]) === "/api/resume", "Open Source is not connected");
	const downloadReady = page.waitForEvent("download");
	await win.getByRole("button", { name: "Save resume source", exact: true }).click();
	const download = await downloadReady;
	check((await download.suggestedFilename()).endsWith("Resume.tex") && await download.failure() === null, "Save Source failed");

	const restoredBounds = await win.boundingBox();
	await win.getByRole("button", { name: "Maximize", exact: true }).click();
	check((await win.boundingBox()).width === 1440 && (await win.boundingBox()).height === 968, "Maximize does not fill the work area");
	await win.getByRole("button", { name: "Restore window", exact: true }).click();
	check(JSON.stringify(await win.boundingBox()) === JSON.stringify(restoredBounds), "Restore changed the Word window's original geometry");

	check(await win.locator(".word__scroll").evaluate((viewport) => {
		const page = viewport.querySelector(".word__page").getBoundingClientRect();
		const left = viewport.getBoundingClientRect().left;
		return Math.abs((page.left - left) - (left + viewport.clientWidth - page.right)) < 1;
	}), "Resume page has unequal left and right margins");
	const initialWidth = (await doc.boundingBox()).width;
	await win.getByRole("combobox", { name: "Zoom", exact: true }).selectOption("125");
	check(Math.abs((await doc.boundingBox()).width / initialWidth - 1.25) < 0.01, "Zoom did not resize the document");
	await win.getByRole("combobox", { name: "Zoom", exact: true }).selectOption("100");
	await win.locator(".word__scroll").evaluate((element) => { element.scrollTop = 0; element.scrollLeft = 0; });
	await page.clock.runFor(16);
	await win.screenshot({ path: "/tmp/portfolio-word95.png" });
	await doc.locator(".word__job").filter({ hasText: "Agent-Driven" }).scrollIntoViewIfNeeded();
	await win.screenshot({ path: "/tmp/portfolio-word95-projects.png" });

	await win.getByRole("button", { name: "Minimize document", exact: true }).click();
	check(await win.getAttribute("data-minimized") === "true", "Document Minimize is not connected");
	await page.locator('[data-task-id="word"]').click();
	await page.clock.runFor(16);
	check(await win.isVisible() && await doc.getByText("Programming Languages:", { exact: true }).count() === 1, "Restoring Word lost the resume");
	await win.getByRole("button", { name: "Close document", exact: true }).click();
	await win.waitFor({ state: "detached" });

	await page.setViewportSize({ width: 390, height: 844 });
	await openWord();
	await doc.getByText("Programming Languages:", { exact: true }).waitFor();
	const bounds = await win.boundingBox();
	check(bounds.x >= 0 && bounds.x + bounds.width <= 390, "Word chrome leaves the mobile viewport");
	await win.getByRole("combobox", { name: "Zoom", exact: true }).selectOption("50");
	await win.screenshot({ path: "/tmp/portfolio-word95-mobile.png" });
	await win.getByRole("button", { name: "Close document", exact: true }).click();
	await win.waitFor({ state: "detached" });
	failResume = true;
	await openWord();
	await doc.getByText("Could not load resume from GitHub.", { exact: false }).waitFor();
	check(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
	await page.clock.resume();
	return "PASS: live resume skills/icons, safe TeX rendering, black Word95 chrome, both toolbars, source download, zoom, focus, minimize/restore, mobile and error state";
}

const response = await fetch(`${url}/api/resume`);
assert.ok(response.ok, `Resume source returned HTTP ${response.status}`);
const source = await response.text();
try {
	browser("open", url, "--browser", "chrome");
	console.log(browser("run-code", `async page => (${checkWord.toString()})(page, ${JSON.stringify(source)})`));
} catch (error) {
	console.log(browser("run-code", "async page => { await page.clock.resume(); return { title: await page.title(), word: await page.locator('.word').allTextContents(), boot: await page.locator('.rsod').count() }; }"));
	throw error;
} finally {
	try { browser("close"); } catch { /* Preserve the original failure. */ }
}
