import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { realpath } from "node:fs/promises";
import { createRequire } from "node:module";

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
