/** Run from src/frontend against the dev server: node tests/recycle-bin.browser-check.mjs */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const session = `recycle-check-${process.pid}`;
function browser(...args) {
	const output = execFileSync("playwright-cli", [`-s=${session}`, ...args], { encoding: "utf8", timeout: 180000 });
	assert.ok(!output.includes("### Error"), output);
	return output;
}

async function checkRecycling(page) {
	const check = (value, message) => { if (!value) throw new Error(message); };
	const key = "portfolio.shell.v3";
	const errors = [];
	page.on("pageerror", (error) => errors.push(error.message));
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.route("**/api/views", (route) => route.fulfill({ json: { count: 1 } }));
	// File operations do not need the third-party music player's timers/canvas.
	await page.route((url) => url.hostname === "w.soundcloud.com" && url.pathname === "/player/", (route) => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Muted test player</title>" }));
	await page.addInitScript(() => {
		window.Audio = class extends window.Audio {
			constructor(...args) { super(...args); super.volume = 0; }
			get volume() { return 0; }
			set volume(_value) {}
		};
		window.openedLinks = [];
		window.open = (...args) => { window.openedLinks.push(args); return null; };
	});
	await page.evaluate(() => localStorage.clear());
	await page.reload();
	await page.clock.install({ time: new Date("2026-01-01T12:00:00Z") });
	await page.clock.pauseAt(new Date("2026-01-01T12:00:01Z"));
	const bin = () => page.locator("[data-recycle-bin]");
	const icon = (id) => page.locator(`.desktop__icons [data-shell-item="${id}"]`);
	const win = (id) => page.locator(`#desktop-window-${id}`);
	const row = (id) => win("explorer").locator(`[data-shell-item="${id}"]`);
	const deleted = (name) => win("recycle-bin").getByRole("option", { name, exact: true });
	const dialog = () => page.getByRole("dialog");
	const state = () => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
	const parentOf = async (id) => (await state()).nodes.find((node) => node.id === id)?.parentId;
	async function boot() {
		await page.locator(".rsod").click();
		await page.clock.runFor(900);
		await page.locator(".taskbar").waitFor();
		await page.clock.runFor(2100);
		await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
	}
	async function minimizeAll() {
		await page.locator('.win:not([data-minimized="true"]) .win-titlebar button[aria-label="Minimize"]').evaluateAll((buttons) => buttons.forEach((button) => button.click()));
	}
	async function openIcon(id) {
		await minimizeAll();
		await icon(id).dblclick();
		await page.clock.runFor(id === "secrets" || id === "recycle-bin" ? 500 : 1500);
		await page.clock.runFor(16);
	}
	async function answer(label) {
		await dialog().getByRole("button", { name: label, exact: true }).click();
		await dialog().waitFor({ state: "hidden" });
	}
	await boot();
	await minimizeAll();

	// Single click selects, Enter opens; Ctrl-selection deletes as one confirmed operation.
	await icon("hollow-knight").click();
	check(await icon("hollow-knight").getAttribute("aria-selected") === "true", "Single click did not select");
	check(await page.evaluate(() => window.openedLinks.length) === 0, "Single click launched a shortcut");
	await page.keyboard.press("Control+Space");
	check(await icon("hollow-knight").getAttribute("aria-selected") === "false", "Ctrl+Space did not clear selection");
	await page.keyboard.press("Control+Space");
	check(await icon("hollow-knight").getAttribute("aria-selected") === "true", "Ctrl+Space did not toggle selection");
	await page.keyboard.press("Enter");
	check(await page.evaluate(() => window.openedLinks.length) === 1, "Enter did not open the shortcut");
	await icon("terraria").click({ modifiers: ["Meta"] }); // Ctrl-click opens the native context menu on macOS.
	await page.keyboard.press("Delete");
	await answer("No");
	check(await icon("terraria").count() === 1, "Cancel changed the desktop");
	await page.keyboard.press("Delete");
	await answer("Yes");
	await icon("terraria").waitFor({ state: "detached" });
	check((await state()).entries.length === 2, "Multi-delete did not create recoverable entries");
	check((await bin().locator("img").getAttribute("src")).includes("full"), "Nonempty bin has empty icon");

	await openIcon("recycle-bin");
	await page.keyboard.press("h");
	check(await deleted("Hollow Knight").getAttribute("aria-selected") === "true", "Typing in the bin was stolen by Terminal");
	for (const view of ["Large Icons", "Small Icons", "List", "Details"]) {
		await win("recycle-bin").getByRole("menuitem", { name: "View", exact: true }).click();
		await page.getByRole("menuitemradio", { name: view, exact: true }).click();
		check(await deleted("Hollow Knight").isVisible(), `Item disappeared in ${view} view`);
	}
	await win("recycle-bin").getByRole("menuitem", { name: "View", exact: true }).click();
	await page.getByRole("menuitemcheckbox", { name: "Toolbar", exact: true }).click();
	check(await win("recycle-bin").getByRole("toolbar").isVisible(), "Toolbar toggle did not enable the toolbar");
	await win("recycle-bin").getByRole("button", { name: "Sort by Date Deleted" }).click();
	await page.screenshot({ path: "/tmp/portfolio-recycle-bin.png" });
	await deleted("Hollow Knight").click();
	await win("recycle-bin").getByRole("toolbar").getByRole("button", { name: "Restore", exact: true }).click();
	await deleted("Hollow Knight").waitFor({ state: "detached" });
	check(await icon("hollow-knight").count() === 1, "Restore did not return shortcut");
	check(await page.evaluate(() => window.openedLinks.length) === 1, "Restoring launched the shortcut");
	await deleted("Terraria").click({ button: "right" });
	await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
	await deleted("Terraria").waitFor({ state: "detached" });
	check((await state()).entries.length === 0, "Context-menu restore left the entry behind");

	// Folder membership: a child whose folder is gone comes back onto the desktop.
	await openIcon("secrets");
	await win("explorer").getByRole("button", { name: "Up", exact: true }).click();
	await page.clock.runFor(516);
	check(await win("explorer").getAttribute("aria-label") === "desktop", "Explorer title did not follow navigation");
	await row("secrets").dblclick();
	await page.clock.runFor(516);
	check(await win("explorer").getAttribute("aria-label") === "secrets", "Explorer title did not return to the folder");
	await row("experience").click();
	await page.keyboard.press("Delete");
	await answer("Yes");
	await row("experience").waitFor({ state: "detached" });
	await minimizeAll();
	await icon("secrets").click();
	await page.keyboard.press("Delete");
	await answer("Yes");
	await icon("secrets").waitFor({ state: "detached" });
	await openIcon("recycle-bin");
	await deleted("experience.exe").click();
	await page.keyboard.press("Alt+f");
	await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
	await deleted("experience.exe").waitFor({ state: "detached" });
	check(await parentOf("experience") === "desktop", "A child of a deleted folder was not restored onto the desktop");
	check(!(await state()).nodes.some((node) => node.id === "resume"), "Restoring a child resurrected siblings");
	await deleted("secrets").click();
	await page.keyboard.press("Alt+f");
	await page.getByRole("menuitem", { name: "Restore", exact: true }).click();
	await deleted("secrets").waitFor({ state: "detached" });
	check(await parentOf("secrets") === "desktop" && await parentOf("resume") === "secrets", "The folder did not come back with its contents");
	await minimizeAll();
	await icon("experience").dragTo(icon("secrets"));
	await icon("experience").waitFor({ state: "detached" });
	check(await parentOf("experience") === "secrets", "Dragging a file onto a folder did not move it");

	// Reload keeps recoverable entries.
	await openIcon("secrets");
	await row("experience").click();
	await page.keyboard.press("Delete");
	await answer("Yes");
	await row("experience").waitFor({ state: "detached" });
	await page.reload();
	await boot();
	check((await state()).entries[0].nodes[0].id === "experience", "Reload lost bin contents");
	await openIcon("recycle-bin");
	await deleted("experience.exe").click();
	await page.keyboard.press("Delete");
	await answer("Yes");
	await deleted("experience.exe").waitFor({ state: "detached" });
	check((await bin().locator("img").getAttribute("src")).includes("empty"), "Purged bin has full icon");

	// Native dragging only accepts an internal shell operation; windows are never files.
	await minimizeAll();
	await icon("silksong").dragTo(bin());
	await icon("silksong").waitFor({ state: "detached" });
	check(await dialog().count() === 0, "Ordinary drag unexpectedly prompted");
	await bin().evaluate((element) => {
		const dataTransfer = new DataTransfer();
		dataTransfer.setData("text/plain", "roblox");
		dataTransfer.setData("application/x-portfolio-shell", JSON.stringify({ kind: "nodes", ids: ["roblox"] }));
		element.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer }));
	});
	check(await icon("roblox").count() === 1, "External data was accepted as an internal drag");
	await page.locator('[data-task-id="terminal"]').click();
	const header = await win("terminal").locator(".win-titlebar").boundingBox();
	const target = await bin().boundingBox();
	await page.mouse.move(header.x + 30, header.y + 10);
	await page.mouse.down();
	await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 8 });
	await page.mouse.up();
	check(await win("terminal").count() === 1, "Dragging a window recycled it");
	check((await state()).entries.length === 1, "Dragging a window changed bin contents");

	// Empty is irreversible; reset is a separate, explicitly confirmed escape hatch.
	await minimizeAll();
	await bin().click({ button: "right" });
	await page.getByRole("menuitem", { name: "Empty Recycle Bin", exact: true }).click();
	await answer("No");
	check((await state()).entries.length === 1, "Cancel emptied the bin");
	await bin().click({ button: "right" });
	await page.getByRole("menuitem", { name: "Empty Recycle Bin", exact: true }).click();
	await answer("Yes");
	await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).entries.length === 0, key);
	await page.getByRole("button", { name: "Start", exact: true }).click();
	await page.getByRole("menuitem", { name: "Reset portfolio", exact: true }).click();
	await answer("Yes");
	await icon("silksong").waitFor();
	check((await state()).nodes.length === 14, "Reset did not restore the initial catalog");
	// A queued taskbar-focus frame must not steal focus after typing activates Terminal.
	await page.locator('[data-task-id="terminal"]').click();
	await page.clock.runFor(16);
	const terminalInput = win("terminal").locator(".term__input");
	await terminalInput.fill("");
	await page.locator('[data-task-id="cd-player"]').click();
	await page.keyboard.type("x");
	await page.clock.runFor(16);
	check(await terminalInput.inputValue() === "x" && await terminalInput.evaluate((el) => document.activeElement === el), "Delayed task focus stole Terminal typing");

	// Shift+Delete is permanent, missing Start targets cannot recreate files.
	await openIcon("secrets");
	await row("resume").click();
	await page.keyboard.press("Shift+Delete");
	await answer("No");
	check((await state()).nodes.some((node) => node.id === "resume"), "Cancel permanently deleted a file");
	await page.keyboard.press("Shift+Delete");
	await answer("Yes");
	await row("resume").waitFor({ state: "detached" });
	check((await state()).entries.length === 0, "Shift+Delete recycled instead of deleting");
	await page.getByRole("button", { name: "Start", exact: true }).click();
	await page.getByRole("menuitem", { name: "Documents", exact: true }).click();
	await page.getByRole("menuitem", { name: "resume.doc", exact: true }).click();
	check(await dialog().innerText().then((text) => text.includes("could not be found")), "Start recreated a deleted document");
	await answer("OK");

	// Dragging to the bin never asks; dragging out restores where it lands.
	await minimizeAll();
	await icon("roblox").dragTo(bin());
	await icon("roblox").waitFor({ state: "detached" });
	check(await dialog().count() === 0, "Dragging to the bin asked for confirmation");
	await openIcon("recycle-bin");
	await deleted("Roblox").dragTo(page.locator(".desktop"), { targetPosition: { x: 1200, y: 50 } });
	await deleted("Roblox").waitFor({ state: "detached" });
	check(await icon("roblox").count() === 1, "Dragging out did not restore to Desktop");

	// A failed write keeps the change for this visit and says it was not saved.
	await minimizeAll();
	const beforeFailure = await state();
	await page.evaluate((key) => {
		window.originalStorageWrite = Storage.prototype.setItem;
		Storage.prototype.setItem = function (name, value) {
			if (name === key) throw new Error("Storage unavailable");
			return window.originalStorageWrite.call(this, name, value);
		};
	}, key);
	await icon("roblox").click();
	await page.keyboard.press("Delete");
	// The notice takes the confirmation's place in the same dialog.
	await dialog().getByRole("button", { name: "Yes", exact: true }).click();
	await dialog().getByText("could not be saved").waitFor();
	check(JSON.stringify(await state()) === JSON.stringify(beforeFailure) && await icon("roblox").count() === 0, "A failed save was not kept in memory only");
	await page.evaluate(() => { Storage.prototype.setItem = window.originalStorageWrite; });
	await answer("OK");

	// Damaged saved data starts a fresh desktop, says so, and survives until the next change.
	await page.evaluate((key) => localStorage.setItem(key, "damaged snapshot"), key);
	await page.reload();
	await boot();
	await dialog().waitFor();
	check(await dialog().innerText().then((text) => text.includes("could not be read")), "Damaged saved data was not reported");
	await answer("OK");
	check(await icon("roblox").count() === 1 && await page.evaluate((key) => localStorage.getItem(key), key) === "damaged snapshot", "Damaged saved data was silently replaced");
	await minimizeAll();
	await icon("roblox").dragTo(bin());
	await icon("roblox").waitFor({ state: "detached" });
	check((await state()).entries.length === 1, "The next change did not replace the damaged copy");
	check(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
	await page.clock.resume();
	return "PASS: Win95 selection, views, restore, folder recovery, moving, reload persistence, safe dragging, permanent deletion, reset and storage failures";
}

try {
	browser("open", process.env.RECYCLE_TEST_URL || "http://localhost:3000", "--browser", "chrome");
	console.log(browser("run-code", checkRecycling.toString()));
} catch (error) {
	console.log(browser("run-code", `async (page) => { await page.clock.resume(); return { active: await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 500)), dialogs: await page.locator('dialog').evaluateAll((elements) => elements.map((el) => el.outerHTML)), selected: await page.locator('[aria-selected="true"]').allTextContents(), state: await page.evaluate(() => localStorage.getItem('portfolio.shell.v3')) }; }`));
	throw error;
} finally {
	try { browser("close"); } catch { /* Preserve the original failure. */ }
}
