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
	const waitForLaunch = () => page.locator(".desktop--busy").waitFor({ state: "hidden" });
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.route("**/api/views", (route) => route.fulfill({ json: { count: 2717 } }));
	await page.evaluate(() => {
		// Observe the real page-lifetime transport without adding production test hooks.
		window.audioActions = [];
		window.Audio = class extends window.Audio {
			requestedVolume = 1;
			constructor(...args) {
				super(...args);
				super.volume = 0; // Silence physical output without interfering with the fade.
				window.taskbarAudio = this;
			}
			get volume() { return this.requestedVolume; }
			set volume(value) { this.requestedVolume = value; }
			play() { window.audioActions.push("play"); return super.play(); }
			pause() { window.audioActions.push("pause"); return super.pause(); }
			load() { window.audioActions.push("load"); return super.load(); }
		};
	});
	await page.locator(".rsod").click();
	await page.locator("#desktop-window-sysmsg-4").waitFor();
	const icons = await page.locator(".desktop__icons .desk-icon__label").allTextContents();
	check(JSON.stringify(icons.slice(-3)) === JSON.stringify(["CD Player", "secrets", "Recycle Bin"]), "CD Player must sit immediately above Secrets");
	const cdIcon = page.locator('[data-app-id="cd-player"]');
	const cdIconBounds = await cdIcon.boundingBox();
	const secretsBounds = await page.locator('[data-app-id="explorer"]').boundingBox();
	check(cdIconBounds.x === secretsBounds.x && cdIconBounds.y < secretsBounds.y, "CD Player icon is not above Secrets");
	const secrets = page.locator('[data-app-id="explorer"]');
	const bubble = secrets.locator(".desk-icon__bubble");
	check(await bubble.innerText() === "don't click me!", "Secrets speech bubble has the wrong text");
	check(await bubble.evaluate(async (el) => {
		const style = getComputedStyle(el);
		const art = new Image();
		art.src = "/icons/secrets-bubble.svg";
		await art.decode();
		return art.naturalWidth === 120 && art.naturalHeight === 58
			&& style.width === "120px" && style.height === "58px"
			&& style.backgroundImage.includes("/icons/secrets-bubble.svg")
			&& style.imageRendering === "pixelated"
			&& style.backgroundColor === "rgba(0, 0, 0, 0)"
			&& style.pointerEvents === "none";
	}), "Secrets speech bubble lost its angular, pixelated, noninteractive artwork");
	check(await bubble.evaluate((el) => getComputedStyle(el).animationName === "none"), "Secrets bubble moves when reduced motion is requested");
	for (const width of [1440, 390, 320]) {
		await page.setViewportSize({ width, height: 900 });
		const art = await secrets.locator(".desk-icon__art").boundingBox();
		const bounds = await bubble.boundingBox();
		check(bounds.width <= 126 && bounds.height <= 63, "Secrets bubble is too large");
		check(bounds.x >= art.x + art.width && bounds.x + bounds.width <= width, "Secrets bubble is not beside the folder or clips off-screen");
	}
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
	await page.evaluate(() => {
		window.openedLinks = [];
		window.open = (...args) => { window.openedLinks.push(args); return null; };
	});
	check(await page.evaluate(async () => {
		const cursor = new Image();
		cursor.src = "/cursors/hand.svg";
		await cursor.decode();
		return cursor.naturalWidth === 20 && cursor.naturalHeight === 20;
	}), "Retro hand cursor failed to load");
	const clickable = '.desktop :is(button, a[href]):not(:disabled, [aria-disabled="true"])';
	check(await page.locator(clickable).evaluateAll((nodes) => nodes.length > 0 && nodes.every((el) =>
		[el, ...el.querySelectorAll("span, img, svg")].every((part) => getComputedStyle(part).cursor.includes('/cursors/hand.svg") 7 1, pointer')))), "Clickable controls or their artwork lost the hand cursor");
	check(await page.locator('.desktop :is(button:disabled, [aria-disabled="true"])').evaluateAll((nodes) => nodes.length > 0 && nodes.every((el) => !getComputedStyle(el).cursor.includes("/cursors/hand.svg"))), "Disabled controls advertise clickability");
	check(await page.locator(".win-titlebar, .paint__canvas, .paint__menu-item, .term__font-size").evaluateAll((nodes) => nodes.every((el) => getComputedStyle(el).cursor.includes("/cursors/arrow.cur"))), "Hand cursor replaced dragging, painting or decorative cursors");
	check(await page.locator(".term__input").evaluate((el) => getComputedStyle(el).cursor) === "text", "Terminal lost its text cursor");
	check(await page.locator(".desktop").evaluate((el) => {
		el.classList.add("desktop--busy");
		try {
			return [...el.querySelectorAll("button, a[href], .paint__canvas, .term__input")]
				.every((control) => getComputedStyle(control).cursor.includes("/cursors/wait.cur"));
		} finally {
			el.classList.remove("desktop--busy");
		}
	}), "Hand cursor overrides the busy hourglass");

	const sparks = page.locator(".desktop-sparks");
	check(!(await sparks.isVisible()), "Sparks ignore reduced motion");
	check(await sparks.evaluate((el) => el.getAnimations({ subtree: true }).length) === 0, "Hidden sparks still animate");
	check(await sparks.getAttribute("aria-hidden") === "true", "Decorative sparks are exposed to assistive technology");
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await sparks.waitFor({ state: "visible" });
	check(await bubble.evaluate((el) => getComputedStyle(el).animationName === "secrets-bubble-cartoon" && el.getAnimations().length > 0), "Secrets bubble is not animated");
	await page.locator(".fracture-background--ready").waitFor();
	check(await page.locator(".fracture-overlay, .fracture-fragments").count() === 0, "Branch-hover particle renderer still exists");
	check(await sparks.evaluate((el) => {
		const z = (selector) => Number(getComputedStyle(document.querySelector(selector)).zIndex);
		return z(".fracture-background") < z(".desktop-sparks") && z(".desktop-sparks") < z(".desktop__windows")
			&& z(".desktop__windows") < z(".neko") && z(".neko") < z(".taskbar")
			&& el.getBoundingClientRect().bottom === document.querySelector(".taskbar").getBoundingClientRect().top;
	}), "Sparks are not between the wallpaper and desktop windows");
	check(await sparks.locator("span").evaluateAll((nodes) => nodes.length === 24 && nodes.every((el) => {
		const style = getComputedStyle(el);
		return style.backgroundColor === "rgb(0, 0, 0)" && style.opacity === "1" && style.filter === "none"
			&& style.boxShadow === "none" && style.pointerEvents === "none" && el.tabIndex === -1
			&& parseFloat(style.width) >= 5 && parseFloat(style.height) >= 4;
	})), "Sparks lost their bounded, chunky, solid-black, noninteractive appearance");
	check(await sparks.locator("span").evaluateAll((nodes) => {
		const styles = nodes.map((el) => getComputedStyle(el));
		const x = styles.map((style) => parseFloat(style.getPropertyValue("--spark-x")));
		const y = styles.map((style) => parseFloat(style.getPropertyValue("--spark-y")));
		return new Set(styles.map((style) => style.clipPath)).size >= 5
			&& new Set(styles.map((style) => style.getPropertyValue("--spark-angle"))).size >= 12
			&& x.some((value) => value < 0) && x.some((value) => value > 0)
			&& y.some((value) => value < 0) && y.some((value) => value > 0);
	}), "Sparks need varied shapes, angles and travel directions");
	const firstTransform = await sparks.locator("span").first().evaluate((el) => getComputedStyle(el).transform);
	await page.waitForFunction((previous) => getComputedStyle(document.querySelector(".desktop-sparks__spark")).transform !== previous, firstTransform);
	// Keep sparks running for the interaction checks below: they must not intercept input.
	for (const [label, url] of [
		["GitHub", "https://github.com/0xABAN"],
		["LinkedIn", "https://www.linkedin.com/in/adam-torres-encarnacion/"],
		["Twitter", "https://x.com/0xABANN"],
	]) {
		const shortcut = page.locator(".desktop__icons").getByRole("button", { name: label, exact: true });
		await shortcut.click();
		const opened = await page.evaluate(() => window.openedLinks.at(-1));
		check(JSON.stringify(opened) === JSON.stringify([url, "_blank", "noopener,noreferrer"]), "Social destination or opener protection changed");
		check(await shortcut.locator("img").evaluate((el) => el.complete && el.naturalWidth === 32), "Desktop shortcut artwork failed to load");
		check(await page.locator(".taskbar").getByRole("button", { name: label, exact: true }).count() === 0, "Social shortcut still appears as a task");
	}
	const task = (id) => page.locator(`[data-task-id="${id}"]`);
	const win = (id) => page.locator(`#desktop-window-${id}`);
	const order = await page.locator("[data-task-id]").evaluateAll((nodes) => nodes.map((el) => el.dataset.taskId));
	check(JSON.stringify(order) === JSON.stringify(["me", "terminal", "github", "cd-player"]), "Running apps or decorations have incorrect tasks");
	check(await win("cd-player").evaluate((el) => el.inert) && await task("cd-player").getAttribute("aria-pressed") === "false", "CD Player did not start minimized");

	await task("github").click();
	check(await task("github").innerText() === "Activity", "Activity task has the wrong name");
	check(await win("github").getAttribute("aria-label") === "Activity", "Activity window has the wrong accessible name");
	check(await win("github").locator(".win-titlebar__text").innerText() === "Activity", "Activity window title is missing");
	check(await win("github").locator(".win-titlebar").evaluate((el) => getComputedStyle(el).backgroundColor) === "rgb(10, 10, 10)", "Activity did not use the standard black title bar");
	for (const icon of [task("github").locator("img"), win("github").locator(".win-titlebar__icon")]) {
		check(await icon.getAttribute("src") === "/icons/code.svg", "Activity still uses a GitHub icon");
		check(await icon.evaluate((el) => el.complete && el.naturalWidth === 16), "Activity code icon failed to load");
	}

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

	await secrets.click();
	await win("explorer").waitFor();
	await page.waitForFunction(() => document.getElementById("desktop-window-explorer").contains(document.activeElement));
	check(await bubble.count() === 0 && await secrets.locator(".desk-icon__badge").count() === 0, "Secrets bubble or badge survived the first opening");
	await win("explorer").getByRole("button", { name: "Minimize", exact: true }).click();

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
	await page.waitForFunction(() => document.getElementById("desktop-window-me").contains(document.activeElement));
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
	check(await menu.locator('button:not(:disabled), a[href]').evaluateAll((nodes) => nodes.every((el) => getComputedStyle(el).cursor.includes("/cursors/hand.svg"))), "Start popup lost the hand cursor");
	check(await menu.getByRole("menuitem", { name: "Activity", exact: true }).locator("img").getAttribute("src") === "/icons/code.svg", "Start did not use the Activity name and code icon");
	check(await page.locator(".start-menu__submenu button").evaluateAll((items) => items.every((el) => el.getBoundingClientRect().height === 26)), "Start flyout rows lost their compact height");
	check(await page.evaluate(() => getComputedStyle(document.activeElement).backgroundColor) === "rgb(175, 0, 0)", "Keyboard menu selection has no highlight");
	const programs = menu.getByRole("menuitem", { name: "Programs", exact: true });
	check(await programs.evaluate((el) => getComputedStyle(el).backgroundColor) === "rgb(175, 0, 0)", "Expanded menu parent lost its selection highlight");
	const parentBounds = await programs.boundingBox();
	const flyoutBounds = await page.getByRole("menu", { name: "Programs", exact: true }).boundingBox();
	check(Math.abs(flyoutBounds.y - parentBounds.y) <= 4, "Desktop Start flyout is not aligned with its parent row");
	await page.keyboard.press("ArrowDown");
	await page.keyboard.press("Enter");
	await waitForLaunch();
	check(!(await menu.isVisible()), "Launch did not dismiss Start");
	check(await input.inputValue() === "keep my draft", "Start relaunched an existing terminal");

	await start.click();
	await menu.getByRole("menuitem", { name: "Documents", exact: true }).hover();
	await menu.getByRole("menuitem", { name: "bio.txt", exact: true }).click();
	await waitForLaunch();
	check(await win("bio").isVisible(), "Documents did not open bio.txt");
	await win("bio").evaluate((el) => { window.savedBio = el; });
	await win("bio").getByRole("button", { name: "Minimize", exact: true }).click();
	await start.click();
	await menu.getByRole("menuitem", { name: "Documents", exact: true }).click();
	await page.waitForFunction(() => document.activeElement?.textContent === "secrets");
	await page.keyboard.press("End");
	await page.keyboard.press("Enter");
	await waitForLaunch();
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
	check(await page.evaluate(async () => {
		const regular = await document.fonts.load('11px "Win95 UI"');
		const bold = await document.fonts.load('700 11px "Win95 UI"');
		return regular.length === 1 && bold.length === 1;
	}), "Win95 fonts did not load");
	check(await page.locator(".taskbar").evaluate((el) => el.getBoundingClientRect().height === 32), "Taskbar height drifted");
	check(await start.evaluate((el) => getComputedStyle(el).borderTopWidth === "1px"), "Start lost its layered 1px bevel");
	check(await page.locator(".taskbar__tray .taskbar__speaker").count() === 1, "Speaker is not inside the recessed tray");
	check(await page.locator(".taskbar__views").innerText() === "2,717 views", "View counter was lost");
	await task("terminal").click();
	await page.waitForFunction(() => document.getElementById("desktop-window-terminal").contains(document.activeElement));
	const music = task("cd-player");
	const player = win("cd-player");
	const audioState = () => page.evaluate(() => {
		const { paused, muted, volume, src } = window.taskbarAudio;
		return JSON.stringify({ paused, muted, volume, src, actions: window.audioActions.length });
	});
	// Compare CD launcher actions only after the independent startup fade settles.
	await page.waitForFunction(() => window.taskbarAudio.readyState >= 2 && window.taskbarAudio.volume === 1);
	const elapsed = music.locator(".task-btn__elapsed");
	const firstElapsed = await elapsed.innerText();
	check((await music.getAttribute("title")).includes(" - "), "CD task lost its artist and track label");
	await page.waitForFunction((previous) => document.querySelector('[data-task-id="cd-player"] .task-btn__elapsed').textContent !== previous, firstElapsed);
	check(await page.evaluate(() => document.querySelector('.task-btn__elapsed').textContent === document.querySelector('#desktop-window-cd-player [aria-label="Elapsed time"]').textContent), "Taskbar and player progress drifted apart");
	await cdIcon.hover();
	await cdIcon.focus();
	await page.evaluate(() => new Promise(requestAnimationFrame));
	check(!(await player.isVisible()), "Hover or focus opened CD Player without a click");
	const beforeOpen = await audioState();
	await cdIcon.click();
	await waitForLaunch();
	await player.waitFor();
	check(await player.locator("button:not(:disabled)").evaluateAll((nodes) => nodes.every((el) => getComputedStyle(el).cursor.includes("/cursors/hand.svg"))), "CD controls lost the hand cursor");
	check(await player.evaluate((el) => el.parentElement.classList.contains("desktop__windows")), "CD Player is not a desktop app");
	check(await music.getAttribute("aria-pressed") === "true", "CD Player did not become the active task");
	check(await audioState() === beforeOpen, "Opening CD Player changed existing music");
	await cdIcon.click();
	await waitForLaunch();
	check(await player.count() === 1 && await music.count() === 1 && await audioState() === beforeOpen, "Repeated launches duplicated the app or restarted music");
	const playerBounds = await player.boundingBox();
	const musicBounds = await music.boundingBox();
	check(Math.abs(playerBounds.y + playerBounds.height - musicBounds.y + 4) <= 1, "CD Player did not open directly above its task");
	check(Math.abs(playerBounds.x - Math.max(4, Math.min(musicBounds.x, 1440 - playerBounds.width - 4))) <= 1, "CD Player is not aligned to its taskbar entry");
	await page.mouse.move(playerBounds.x + 60, playerBounds.y + 12);
	await page.mouse.down();
	await page.mouse.move(playerBounds.x + 140, playerBounds.y - 38, { steps: 4 });
	await page.mouse.up();
	const movedPlayer = await player.boundingBox();
	check(movedPlayer.x === playerBounds.x + 80 && movedPlayer.y === playerBounds.y - 50, "CD Player stopped being draggable");
	await page.mouse.move(600, 40);
	await start.focus();
	check(await player.isVisible(), "Leaving CD Player dismissed it");
	await music.press("Enter");
	await page.waitForFunction(() => document.getElementById("desktop-window-cd-player").contains(document.activeElement));
	await page.keyboard.press("Tab");
	check(await player.evaluate((el) => el.contains(document.activeElement)), "Keyboard cannot reach CD controls");
	await page.keyboard.press("Escape");
	check(await player.isVisible() && await audioState() === beforeOpen, "Escape quit the standalone player");
	await player.getByRole("button", { name: "Minimize", exact: true }).click();
	check(await player.evaluate((el) => el.inert) && await audioState() === beforeOpen, "Minimizing CD Player stopped its music");
	await music.press("Enter");
	await player.waitFor();
	check(await audioState() === beforeOpen, "Keyboard restoration changed music");

	const speaker = page.locator(".taskbar__speaker");
	const muted = await speaker.getAttribute("aria-pressed");
	await speaker.click();
	check(await speaker.getAttribute("aria-pressed") !== muted, "Mute toggle stopped working");
	check(await music.getAttribute("aria-pressed") === "true", "Speaker toggle changed the active app");
	if (await page.evaluate(() => window.taskbarAudio.paused)) await player.getByRole("button", { name: "Play", exact: true }).click();
	await player.getByRole("button", { name: "Pause", exact: true }).waitFor();
	const playingState = await audioState();
	await music.click();
	check(await audioState() === playingState, "CD launcher interrupted playing music");
	await player.getByRole("button", { name: "Pause", exact: true }).click();
	await player.getByRole("button", { name: "Play", exact: true }).waitFor();
	check(await page.evaluate(() => window.taskbarAudio.paused), "Pause control did not pause playback");
	const pausedState = await audioState();
	await player.getByRole("button", { name: "Minimize", exact: true }).click();
	check(!(await player.isVisible()), "Minimize did not hide CD Player");
	await music.press("Space");
	await player.waitFor();
	check(await audioState() === pausedState, "Restoring CD Player resumed paused music");
	const restoredPlayer = await player.boundingBox();
	check(restoredPlayer.x === movedPlayer.x && restoredPlayer.y === movedPlayer.y, "Reopening CD Player reset its dragged position");
	await player.getByRole("button", { name: "Play", exact: true }).click();
	await player.getByRole("button", { name: "Pause", exact: true }).waitFor();
	check(await page.evaluate(() => !window.taskbarAudio.paused), "Play control did not resume playback");
	const resumedState = await audioState();
	await player.getByRole("button", { name: "Minimize", exact: true }).click();
	check(!(await player.isVisible()) && await audioState() === resumedState, "Minimizing CD Player stopped its transport");

	// Ordinary desktop typing uses native input insertion, not a simulated keyboard.
	await input.fill("");
	await music.click();
	await page.keyboard.type("Hello ");
	check(await input.inputValue() === "Hello ", "Desktop typing lost or duplicated the first character");
	check(await input.evaluate((el) => el === document.activeElement), "Desktop typing did not focus Terminal");
	check(await task("terminal").getAttribute("aria-pressed") === "true", "Desktop typing did not raise Terminal");
	check(await player.isVisible() && await music.getAttribute("aria-pressed") === "false" && await audioState() === resumedState, "Typing quit CD Player or changed its music");
	await win("terminal").getByRole("button", { name: "Minimize", exact: true }).click();
	await page.keyboard.type("there!");
	check(await input.inputValue() === "Hello there!" && !(await win("terminal").evaluate((el) => el.inert)), "Typing did not restore Terminal and preserve its draft");
	await input.fill("abcd");
	await input.evaluate((el) => el.setSelectionRange(1, 3));
	await task("me").click();
	await page.waitForFunction(() => document.getElementById("desktop-window-me").contains(document.activeElement));
	await page.keyboard.type("Z");
	check(await input.inputValue() === "aZd", "Redirected typing lost the existing selection");

	await task("me").click();
	await page.waitForFunction(() => document.getElementById("desktop-window-me").contains(document.activeElement));
	await page.keyboard.press("Control+z");
	await win("me").dispatchEvent("keydown", { key: "q", isComposing: true, bubbles: true });
	check(await task("me").getAttribute("aria-pressed") === "true" && await input.inputValue() === "aZd", "Typing redirect intercepted a shortcut or IME composition");
	await music.click();
	const volume = player.getByRole("slider", { name: "Volume" });
	await volume.focus();
	await volume.press("Home");
	await volume.press("x");
	check(await volume.evaluate((el) => el === document.activeElement) && await input.inputValue() === "aZd", "Typing redirect intercepted a slider");
	await player.getByRole("button", { name: "Close CD Player" }).click();
	check(await player.count() === 0 && await music.count() === 0, "Close did not remove the app and its task");
	check(await page.evaluate(() => window.taskbarAudio.paused && window.taskbarAudio.currentTime === 0 && !window.taskbarAudio.getAttribute("src")), "Close did not quit the audio transport");
	await page.waitForFunction(() => document.activeElement?.getAttribute("data-app-id") === "cd-player");

	for (const editable of ["textarea", "contenteditable"]) {
		await page.evaluate((kind) => {
			const field = document.createElement(kind === "textarea" ? "textarea" : "div");
			field.id = "typing-fixture";
			if (kind === "contenteditable") field.contentEditable = "true";
			document.querySelector(".desktop").append(field);
			field.focus();
		}, editable);
		await page.keyboard.type("keep here");
		check(await page.locator("#typing-fixture").evaluate((el) => (el.value ?? el.textContent) === "keep here"), "Typing left another editable field");
		check(await input.inputValue() === "aZd", "Typing in another field leaked into Terminal");
		await page.locator("#typing-fixture").evaluate((el) => el.remove());
	}
	await start.click();
	await menu.getByRole("menuitem", { name: "Programs", exact: true }).focus();
	await page.keyboard.type("!");
	check(!(await menu.isVisible()) && await input.inputValue() === "aZ!d", "Typing from Start did not dismiss the menu and reach Terminal");

	// Complete a paused chat stream while Terminal is hidden, then recall the request.
	await page.evaluate(() => {
		const nativeFetch = window.fetch.bind(window);
		window.fetch = (resource, init) => {
			if (new URL(String(resource), location.href).pathname !== "/chat") return nativeFetch(resource, init);
			return Promise.resolve(new Response(new ReadableStream({ start(controller) {
				window.finishHiddenChat = () => {
					controller.enqueue(new TextEncoder().encode('event: token\ndata: {"content":"Still here."}\n\nevent: done\ndata: {"remaining":10}\n\n'));
					controller.close();
				};
			} }), { headers: { "Content-Type": "text/event-stream" } }));
		};
	});
	await task("terminal").click();
	await input.fill("reply while minimized");
	await input.press("Enter");
	await page.waitForFunction(() => Boolean(window.finishHiddenChat));
	await task("me").click();
	await page.waitForFunction(() => document.getElementById("desktop-window-me").contains(document.activeElement));
	await page.keyboard.type("q");
	check(await task("terminal").getAttribute("aria-pressed") === "true" && await input.inputValue() === "" && await input.evaluate((el) => el.readOnly), "Desktop typing bypassed the Terminal reply lock");
	await win("terminal").getByRole("button", { name: "Minimize", exact: true }).click();
	await start.focus();
	await page.evaluate(() => window.finishHiddenChat());
	await page.waitForFunction(() => !document.querySelector(".term__input").readOnly);
	check(await start.evaluate((el) => el === document.activeElement), "A hidden reply stole focus");
	await task("terminal").click();
	check((await page.locator(".term__line").allTextContents()).includes("ADAM> Still here."), "Minimization lost the streamed reply");
	check(await input.evaluate((el) => el === window.savedTerminalInput), "Streaming restoration replaced the terminal session");
	await input.press("ArrowUp");
	check(await input.inputValue() === "reply while minimized", "Minimization lost terminal recall");

	for (const width of [390, 320]) {
		await page.setViewportSize({ width, height: 844 });
		check(await sparks.evaluate((el) => el.getAnimations({ subtree: true }).length) === 12, "Narrow screens did not reduce spark density");
		check(await page.evaluate(() => document.documentElement.scrollWidth === innerWidth), "Sparks added horizontal overflow");
		for (const control of [start, page.locator(".taskbar__tray")]) {
			const r = await control.boundingBox();
			check(r.x >= 0 && r.x + r.width <= width, "Fixed taskbar controls clipped on narrow screens");
		}
		await page.locator("#task-strip").evaluate((el) => { el.scrollLeft = 0; });
		await page.getByRole("button", { name: "Next tasks", exact: true }).click();
		check(await page.locator("#task-strip").evaluate((el) => el.scrollLeft > 0), "Task overflow arrows did not scroll");
		await task("bio").focus();
		await task("bio").press("Enter");
		check(await task("bio").getAttribute("aria-pressed") === "true", "An overflowed task was unreachable");
		await start.click();
		await menu.getByRole("menuitem", { name: "Programs", exact: true }).click();
		const submenu = await page.getByRole("menu", { name: "Programs", exact: true }).boundingBox();
		check(submenu.x >= 0 && submenu.y >= 0 && submenu.x + submenu.width <= width, "Start flyout left the viewport");
		await menu.getByRole("menuitem", { name: "CD Player", exact: true }).click();
		await waitForLaunch();
		await player.waitFor();
		await page.waitForFunction(() => document.getElementById("desktop-window-cd-player").contains(document.activeElement));
		const bounds = await player.boundingBox();
		const trigger = await music.boundingBox();
		check(Math.abs(bounds.y + bounds.height - trigger.y + 4) <= 1, "CD Player lost its taskbar anchor on a narrow screen");
		check(bounds.x >= 0 && bounds.x + bounds.width <= width, `CD Player left the ${width}px viewport: ${JSON.stringify(bounds)}`);
		check(await player.locator(".win__client").evaluate((el) => el.scrollHeight <= el.clientHeight && el.scrollWidth <= el.clientWidth), "CD controls are clipped");
		check(await elapsed.evaluate((el) => {
			const text = el.getBoundingClientRect();
			const button = el.closest("button").getBoundingClientRect();
			return text.x >= button.x && text.right <= button.right;
		}), "Taskbar truncation hid the music progress");
		await player.getByRole("button", { name: "Minimize", exact: true }).click();
	}
	await page.emulateMedia({ reducedMotion: "reduce" });
	check(!(await sparks.isVisible()) && await sparks.evaluate((el) => el.getAnimations({ subtree: true }).length) === 0, "Sparks did not stop after a reduced-motion change");
	return "PASS: window state, Start, social links, Win95 chrome/fonts, tray, CD playback/keyboard access, desktop typing, hidden streaming, sparks and narrow overflow";
}

try {
	browser("open", process.env.TASKBAR_TEST_URL || "http://localhost:3000", "--browser", "chrome");
	console.log(browser("run-code", checkTaskbar.toString()));
} finally {
	try { browser("close"); } catch { /* Preserve the original test failure. */ }
}
