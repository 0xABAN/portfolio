/** Run against the dev server from src/frontend with node; uses installed playwright-cli. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const session = `audio-check-${process.pid}`;
function browser(...args) {
	const output = execFileSync("playwright-cli", [`-s=${session}`, ...args], { encoding: "utf8", timeout: 60000 });
	assert.ok(!output.includes("### Error"), output);
	return output;
}

async function checkAudio(page) {
	const check = (value, message) => { if (!value) throw new Error(message); };
	const near = (actual, expected) => check(Math.abs(actual - expected) < 0.005, `Expected volume ${expected}, got ${actual}`);
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.emulateMedia({ reducedMotion: "reduce" });
	await page.route("**/api/views", (route) => route.fulfill({ json: { count: 1 } }));
	await page.addInitScript(() => {
		// Keep real media loading/playback, but silence the test's physical output.
		window.Audio = class extends window.Audio {
			requestedVolume = 1;
			constructor(...args) {
				super(...args);
				super.volume = 0;
				window.taskbarAudio = this;
			}
			get volume() { return this.requestedVolume; }
			set volume(value) { this.requestedVolume = value; }
			play() {
				window.playAttempts = (window.playAttempts || 0) + 1;
				const result = window.blockAudio
					? Promise.reject(new DOMException("Gesture required", "NotAllowedError"))
					: super.play();
				window.audioStarted = result.then(() => true, () => false);
				return result;
			}
		};
	});
	await page.clock.install({ time: new Date("2026-01-01T00:00:00Z") });

	const state = () => page.evaluate(() => {
		const { muted, volume, paused } = window.taskbarAudio;
		return { muted, volume, paused, attempts: window.playAttempts };
	});
	const speaker = page.locator(".taskbar__speaker");
	const player = page.locator("#desktop-window-cd-player");
	const launcher = page.locator('[data-app-id="cd-player"]');
	const task = page.locator('[data-task-id="cd-player"]');
	async function boot(blocked = false) {
		// Let Next hydrate before freezing its scheduler along with the boot timers.
		await page.clock.resume();
		await page.reload();
		await page.locator(".rsod").waitFor();
		await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000));
		await page.evaluate((value) => { window.blockAudio = value; }, blocked);
		await page.locator(".rsod").click();
		await page.clock.runFor(900);
		await page.locator(".taskbar").waitFor();
		check(await page.evaluate(() => window.audioStarted) === !blocked, "Unexpected initial playback result");
		await page.clock.runFor(2000);
		check((await state()).volume === 0, "Music became audible before boot finished");
		check(await speaker.getAttribute("aria-pressed") === "true", "Music is not enabled by default");
		check(await task.count() === 1 && await player.evaluate((el) => el.inert), "CD Player must start minimized as a running app");
	}

	await boot();
	await page.clock.runFor(100);
	near((await state()).volume, 0);
	await page.clock.runFor(5000);
	near((await state()).volume, 0.25);
	await speaker.click();
	check((await state()).muted, "Mute did not immediately silence the fade");
	await task.click();
	const volume = player.getByRole("slider", { name: "Volume" });
	check(await volume.inputValue() === "1", "Fade moved the user's volume slider");
	await volume.fill("0.4");
	near((await state()).volume, 0.1);
	const oldTrack = await task.getAttribute("title");
	await player.getByRole("toolbar", { name: "Playback" }).getByRole("button", { name: "Next track", exact: true }).click();
	await page.evaluate(() => window.audioStarted);
	check(await task.getAttribute("title") !== oldTrack, "Taskbar did not follow the selected track");
	near((await state()).volume, 0.1);
	await page.clock.runFor(5032);
	near((await state()).volume, 0.4);
	check((await state()).muted, "Fade or track change overrode mute");
	await speaker.click();
	check(!(await state()).muted, "Unmute stopped working");
	await player.getByRole("button", { name: "Pause", exact: true }).click();
	await page.locator(".taskbar__clock").click();
	check((await state()).paused, "A later gesture resumed deliberately paused music");

	await boot();
	await speaker.click();
	await page.clock.runFor(100);
	await page.clock.runFor(10_032);
	check((await state()).muted, "Muting during boot was overridden by the fade");
	near((await state()).volume, 1);

	await boot(true);
	await page.clock.runFor(10_200);
	near((await state()).volume, 0);
	await page.evaluate(() => { window.blockAudio = false; });
	await page.locator(".taskbar__clock").click();
	check(await page.evaluate(() => window.audioStarted), "A gesture did not retry blocked autoplay");
	await page.clock.runFor(5000);
	near((await state()).volume, 0.25);
	await page.clock.runFor(5032);
	near((await state()).volume, 1);

	await boot(true);
	await task.click();
	await player.getByRole("button", { name: "Stop", exact: true }).click();
	const stopped = await state();
	await page.evaluate(() => { window.blockAudio = false; });
	await page.locator(".taskbar__clock").click();
	await page.clock.runFor(10_200);
	check((await state()).paused && (await state()).attempts === stopped.attempts, "Stop left autoplay retries armed");

	await boot();
	await task.click();
	await page.clock.runFor(100);
	await page.clock.runFor(4000);
	check((await state()).volume > 0, "Quit check did not start during the fade");
	await player.getByRole("button", { name: "Close CD Player" }).click();
	check(await player.count() === 0 && await task.count() === 0, "Quit left an app window or task behind");
	check(await page.evaluate(() => window.taskbarAudio.paused && window.taskbarAudio.currentTime === 0 && !window.taskbarAudio.getAttribute("src")), "Quit did not stop, rewind and unload the music");
	const quitAttempts = (await state()).attempts;
	await page.clock.runFor(20_000);
	await page.locator(".taskbar__clock").click();
	await speaker.click();
	await speaker.click();
	check((await state()).attempts === quitAttempts && (await state()).volume === 0, "A gesture, mute toggle or pending fade restarted a closed app");
	await page.setViewportSize({ width: 390, height: 844 });
	check(await task.count() === 0, "Resize resurrected the closed player");
	await page.setViewportSize({ width: 1440, height: 900 });
	await launcher.dblclick();
	await page.clock.runFor(1500);
	await player.waitFor();
	check(await page.evaluate(() => window.audioStarted), "Desktop icon did not restart the closed player");
	check(await player.isVisible() && await task.getAttribute("aria-pressed") === "true", "Relaunch did not open and activate the app");
	await page.clock.runFor(5000);
	near((await state()).volume, 0.25);

	await boot(true);
	await task.click();
	await page.evaluate(() => {
		window.pendingPlayCalls = 0;
		window.taskbarAudio.play = () => {
			++window.pendingPlayCalls;
			return new Promise((_, reject) => { window.rejectPendingPlay = reject; });
		};
	});
	await player.getByRole("button", { name: "Play", exact: true }).click();
	await player.getByRole("button", { name: "Close CD Player" }).click();
	await page.evaluate(() => window.rejectPendingPlay(new DOMException("Gesture required", "NotAllowedError")));
	await page.locator(".taskbar__clock").click();
	check(await page.evaluate(() => window.pendingPlayCalls) === 1, "Late play rejection rearmed autoplay after quitting");

	// playwright-cli waits on a page timer after run-code returns.
	await page.clock.resume();
	return "PASS: silent boot, 10-second gentle fade, early/mid-fade mute, volume/track changes, pause/stop, quit/relaunch and blocked-autoplay recovery";
}

try {
	browser("open", process.env.AUDIO_TEST_URL || "http://localhost:3000", "--browser", "chrome");
	console.log(browser("run-code", checkAudio.toString()));
} finally {
	try { browser("close"); } catch { /* Preserve the original test failure. */ }
}
