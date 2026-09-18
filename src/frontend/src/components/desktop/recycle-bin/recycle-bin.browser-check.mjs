/** Run from src/frontend against the dev server: node src/components/desktop/recycle-bin/recycle-bin.browser-check.mjs */
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
	const key = "portfolio.shell.v1";
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
	async function properties() {
		await minimizeAll();
		await bin().click({ button: "right" });
		await page.getByRole("menuitem", { name: "Properties", exact: true }).click();
		await dialog().waitFor();
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
	await deleted("Hollow Knight").dblclick();
	check(await dialog().getAttribute("aria-labelledby"), "Item Properties has no accessible title");
	check(await page.evaluate(() => window.openedLinks.length) === 1, "Opening deleted item launched its target");
	await dialog().getByRole("button", { name: "Restore", exact: true }).click();
	await deleted("Hollow Knight").waitFor({ state: "detached" });
	check(await icon("hollow-knight").count() === 1, "Restore did not return shortcut");
	await win("recycle-bin").getByRole("listbox").focus();
	await page.keyboard.press("Control+z");
	await deleted("Terraria").waitFor({ state: "detached" });
	check((await state()).entries.length === 0, "Undo did not recover remaining batch entries");

	// Folder membership, missing-parent restoration and explicit folder merge.
	await openIcon("secrets");
	await win("explorer").getByRole("button", { name: "Up", exact: true }).click();
	await page.clock.runFor(516);
	check(await win("explorer").getAttribute("aria-label") === "Desktop", "Explorer title did not follow navigation");
	await row("secrets").dblclick();
	await page.clock.runFor(516);
	check(await win("explorer").getAttribute("aria-label") === "secrets", "Explorer title did not return to the folder");
	await row("bio").click();
	await page.keyboard.press("Delete");
	await answer("Yes");
	await row("bio").waitFor({ state: "detached" });
	await minimizeAll();
	await icon("secrets").click();
	await page.keyboard.press("Delete");
	await answer("Yes");
	await icon("secrets").waitFor({ state: "detached" });
	await openIcon("recycle-bin");
	await deleted("bio.txt").dblclick();
	await dialog().getByRole("button", { name: "Restore", exact: true }).click();
	check(await dialog().innerText().then((text) => text.includes("recreate")), "Missing parent was not confirmed");
	await answer("Yes");
	await deleted("bio.txt").waitFor({ state: "detached" });
	check((await state()).nodes.filter((node) => ["resume", "experience"].includes(node.id)).length === 0, "Restoring a child resurrected siblings");
	await deleted("secrets").dblclick();
	await dialog().getByRole("button", { name: "Restore", exact: true }).click();
	check(await dialog().innerText().then((text) => text.includes("Combine")), "Existing folder merge was not confirmed");
	await answer("Yes");
	await deleted("secrets").waitFor({ state: "detached" });

	// Full drive settings: Cancel is inert; Apply and independent settings persist.
	await properties();
	await dialog().locator('input[type="range"]').focus();
	await page.keyboard.press("Home");
	await page.keyboard.press("ArrowRight");
	await answer("Cancel");
	check((await state()).settings.global.percent === 10, "Cancel applied drive settings");
	await properties();
	await dialog().getByRole("radio", { name: "Configure drives independently" }).check();
	await dialog().getByRole("tab", { name: "(C:)" }).click();
	await dialog().locator('input[type="range"]').focus();
	await page.keyboard.press("Home");
	for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
	await dialog().getByRole("button", { name: "Apply", exact: true }).click();
	await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).settings.drive.percent === 3, key);
	await answer("OK");

	const folderId = (await state()).nodes.find((node) => node.catalogId === "secrets").id;
	await openIcon(folderId);
	await page.clock.runFor(1500);
	for (const id of ["resume", "experience"]) {
		await row(id).click();
		await page.keyboard.press("Delete");
		await answer("Yes");
		await row(id).waitFor({ state: "detached" });
	}
	check((await state()).entries.length === 1 && (await state()).entries[0].rootId === "experience", "Quota did not evict oldest entry");

	// Reload keeps both permanent deletions and recoverable entries.
	await page.reload();
	await boot();
	check((await state()).entries[0].rootId === "experience", "Reload lost bin contents");
	check(!(await state()).nodes.some((node) => node.id === "resume"), "Reload resurrected an evicted file");
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
	check((await state()).nodes.length === 15 && (await state()).settings.global.percent === 10, "Reset did not restore the initial catalog/settings");
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
	await row("bio").click();
	await page.keyboard.press("Shift+Delete");
	await answer("No");
	check((await state()).nodes.some((node) => node.id === "bio"), "Cancel permanently deleted a file");
	await page.keyboard.press("Shift+Delete");
	await answer("Yes");
	await row("bio").waitFor({ state: "detached" });
	check((await state()).entries.length === 0, "Shift+Delete recycled instead of deleting");
	await page.getByRole("button", { name: "Start", exact: true }).click();
	await page.getByRole("menuitem", { name: "Documents", exact: true }).click();
	await page.getByRole("menuitem", { name: "bio.txt", exact: true }).click();
	check(await dialog().innerText().then((text) => text.includes("could not be found")), "Start recreated a deleted document");
	await answer("OK");

	await properties();
	await dialog().getByRole("checkbox", { name: "Display delete confirmation dialog" }).uncheck();
	await answer("OK");
	await minimizeAll();
	await icon("roblox").click();
	await page.keyboard.press("Delete");
	await icon("roblox").waitFor({ state: "detached" });
	check(await dialog().count() === 0, "Disabled delete confirmation was ignored");
	await openIcon("recycle-bin");
	await deleted("Roblox").dragTo(page.locator(".desktop"), { targetPosition: { x: 1200, y: 50 } });
	await deleted("Roblox").waitFor({ state: "detached" });
	check(await icon("roblox").count() === 1, "Dragging out did not restore to Desktop");

	// Small viewports keep settings reachable and Details headings aligned while scrolling.
	await page.setViewportSize({ width: 320, height: 700 });
	await properties();
	const bounds = await dialog().boundingBox();
	check(bounds.x >= 0 && bounds.x + bounds.width <= 320, "Properties overflows the viewport");
	check(Math.abs(bounds.x - (320 - bounds.width) / 2) < 2 && Math.abs(bounds.y - (700 - bounds.height) / 2) < 2, "Properties is not centered");
	await page.screenshot({ path: "/tmp/portfolio-recycle-properties-mobile.png" });
	await answer("Cancel");

	// A failed persistent write must not publish a deletion or lose the old bin.
	await page.setViewportSize({ width: 1440, height: 900 });
	await minimizeAll();
	const beforeFailure = await state();
	await page.evaluate(() => {
		window.originalStorageWrite = Storage.prototype.setItem;
		Storage.prototype.setItem = function (key, value) {
			if (key === "portfolio.shell.v1") throw new Error("Storage unavailable");
			return window.originalStorageWrite.call(this, key, value);
		};
	});
	await icon("roblox").click();
	await page.keyboard.press("Delete");
	await dialog().waitFor();
	check(await dialog().innerText().then((text) => text.includes("No changes")), "Storage failure was hidden");
	check(JSON.stringify(await state()) === JSON.stringify(beforeFailure) && await icon("roblox").count() === 1, "Failed save published a deletion");
	await page.evaluate(() => { Storage.prototype.setItem = window.originalStorageWrite; });
	await answer("OK");

	// Damaged updates from another tab preserve the last good UI until explicit reset.
	await icon("hollow-knight").click();
	await page.keyboard.press("Delete");
	await icon("hollow-knight").waitFor({ state: "detached" });
	await page.evaluate((key) => {
		localStorage.setItem(key, "damaged snapshot");
		window.dispatchEvent(new StorageEvent("storage", { key, newValue: "damaged snapshot" }));
	}, key);
	await dialog().waitFor();
	check(await icon("hollow-knight").count() === 0 && (await bin().locator("img").getAttribute("src")).includes("full"), "Damaged update replaced the last good desktop");
	check(await page.evaluate((key) => localStorage.getItem(key), key) === "damaged snapshot", "Damaged saved data was silently overwritten");
	await answer("OK");
	await page.getByRole("button", { name: "Start", exact: true }).click();
	await page.getByRole("menuitem", { name: "Reset portfolio", exact: true }).click();
	await answer("Yes");
	await icon("hollow-knight").waitFor();
	check((await state()).nodes.length === 15 && (await state()).entries.length === 0, "Explicit reset did not recover damaged storage");
	check(errors.length === 0, `Browser errors: ${errors.join("; ")}`);
	await page.clock.resume();
	return "PASS: Win95 selection, restore, undo, folder recovery, quota settings/eviction, reload persistence, safe dragging, permanent deletion and reset";
}

try {
	browser("open", process.env.RECYCLE_TEST_URL || "http://localhost:3000", "--browser", "chrome");
	console.log(browser("run-code", checkRecycling.toString()));
} catch (error) {
	console.log(browser("run-code", `async (page) => { await page.clock.resume(); return { active: await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 500)), dialogs: await page.locator('dialog').evaluateAll((elements) => elements.map((el) => el.outerHTML)), selected: await page.locator('[aria-selected="true"]').allTextContents(), state: await page.evaluate(() => localStorage.getItem('portfolio.shell.v1')) }; }`));
	throw error;
} finally {
	try { browser("close"); } catch { /* Preserve the original failure. */ }
}
