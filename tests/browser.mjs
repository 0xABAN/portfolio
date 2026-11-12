import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpath } from "node:fs/promises";
import { createRequire } from "node:module";
import sharp from "sharp";

const cli = await realpath(execFileSync("which", ["playwright-cli"], { encoding: "utf8" }).trim());
export const { chromium, devices } = createRequire(cli)("playwright");

export function runCheck(check, url = process.argv[2] ?? "http://localhost:3000") {
	const session = `check-${process.pid}`;
	const browser = (...args) => {
		const output = execFileSync("playwright-cli", [`-s=${session}`, ...args], { encoding: "utf8", timeout: 180_000 });
		assert.ok(!output.includes("### Error"), output);
		return output;
	};
	try {
		browser("open", url, "--browser", "chrome");
		return browser("run-code", String(check));
	} finally {
		try { browser("close"); } catch {}
	}
}

export function mockSoundCloud() {
	const listeners = {};
	const Events = { READY: "ready", PLAY: "play", PAUSE: "pause", FINISH: "finish", PLAY_PROGRESS: "progress", ERROR: "error" };
	const emit = (event, data) => {
		for (const listener of listeners[event] ?? []) listener(data);
	};
	const sounds = [
		{ id: 1, title: "Test Track One", user: { username: "Test Artist" }, artwork_url: null },
		{ id: 2, title: "Test Track Two", user: { username: "Test Artist" }, artwork_url: null },
	];
	let current = 0;

	function Widget() {
		return {
			bind(event, listener) {
				(listeners[event] ??= []).push(listener);
				if (event === Events.READY) queueMicrotask(listener);
			},
			unbind(event) { listeners[event] = []; },
			play() {
				window.audioPlayCalls = (window.audioPlayCalls ?? 0) + 1;
				return Promise.resolve().then(() => emit(Events.PLAY));
			},
			pause() { emit(Events.PAUSE); },
			skip(index) {
				current = index;
				return this.play();
			},
			seekTo(milliseconds) { emit(Events.PLAY_PROGRESS, { currentPosition: milliseconds }); },
			setVolume() {},
			getSounds(callback) { callback(sounds); },
			getCurrentSound(callback) { callback(sounds[current]); },
		};
	}

	Widget.Events = Events;
	window.SC = { Widget };
	window.testWidget = { emit, Events };
}

export async function desktopContext(browser, options) {
	const context = await browser.newContext({ locale: "en-US", timezoneId: "UTC", ...options });
	await context.addInitScript(mockSoundCloud);
	await context.addInitScript(() => {
		let seed = 42;
		Math.random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);
	});
	await context.route("**/api/views", (route) => route.fulfill({ json: { count: 1234 } }));
	await context.route("https://github-contributions-api.jogruber.de/**", (route) => route.fulfill({ json: {
		contributions: Array.from({ length: 365 }, (_, i) => ({
			date: new Date(Date.UTC(2025, 0, i + 1)).toISOString().slice(0, 10), count: i % 5, level: i % 5,
		})),
	} }));
	const beepBoopFrame = await sharp(new URL("../public/desktop/beep-boop.webp", import.meta.url).pathname).png().toBuffer();
	await context.route("**/desktop/beep-boop.webp", (route) => route.fulfill({ contentType: "image/png", body: beepBoopFrame }));
	return context;
}

export async function stillDesktop(page) {
	await page.locator(".term__input").waitFor({ state: "attached" });
	await page.locator('.fracture-background video[src*="intro"]').waitFor({ state: "detached" });
	const loop = page.locator(".fracture-background video");
	await loop.evaluate((video) => {
		video.pause();
		const seeked = new Promise((resolve) => video.addEventListener("seeked", resolve, { once: true }));
		video.currentTime = 0;
		return seeked;
	});
	const style = await page.addStyleTag({ content: `
		.desktop-sparks, .neko { display: none !important; }
		*, *::before, *::after { animation: none !important; transition: none !important; }
	` });

	return async () => {
		await style.evaluate((element) => element.remove());
		await loop.evaluate((video) => video.play());
	};
}

export async function assertSameImage(image, file, label) {
	const actual = await sharp(image).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	const expected = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
	assert.deepEqual(actual.info, expected.info, `${label}: image dimensions`);
	let different = 0;
	for (let i = 0; i < actual.data.length; i += 4) {
		if (actual.data.subarray(i, i + 4).some((value, channel) => Math.abs(value - expected.data[i + channel]) > 12)) different++;
	}
	assert.ok(different <= actual.info.width * actual.info.height * 0.002, `${label}: ${different} pixels differ`);
	return different;
}
