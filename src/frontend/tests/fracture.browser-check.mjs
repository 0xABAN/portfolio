/** Run against the dev server from src/frontend with node; uses installed playwright-cli. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const session = `fracture-check-${process.pid}`;
function browser(...args) {
	const output = execFileSync("playwright-cli", [`-s=${session}`, ...args], { encoding: "utf8", timeout: 60000 });
	assert.ok(!output.includes("### Error"), output);
	return output;
}

async function checkFracture(page) {
	const check = (value, message) => { if (!value) throw new Error(message); };
	await page.setViewportSize({ width: 1440, height: 900 });
	await page.emulateMedia({ reducedMotion: "no-preference" });
	await page.route("**/api/views", (route) => route.fulfill({ json: { count: 1 } }));
	// Hold the loop back until well after the intro ends: the intro must stay on its last frame meanwhile.
	await page.route("**/fracture/loop.mp4", async (route) => {
		await page.waitForTimeout(2500);
		await route.continue();
	});
	await page.locator(".rsod").waitFor();
	await page.evaluate(() => {
		// Log each clip's frames as they reach the screen, its playback events and the intro's removal.
		// The loop only gets its source once the intro can play through.
		window.wallpaper = [];
		const log = (...entry) => window.wallpaper.push(entry);
		new MutationObserver(() => {
			for (const video of document.querySelectorAll(".fracture-background video[src]:not([data-watched])")) {
				video.dataset.watched = "";
				const clip = video.getAttribute("src").includes("intro") ? "intro" : "loop";
				for (const type of ["playing", "ended"]) video.addEventListener(type, () => log(clip, type));
				const onFrame = (_, { mediaTime }) => { log(clip, "frame", mediaTime); video.requestVideoFrameCallback(onFrame); };
				video.requestVideoFrameCallback(onFrame);
			}
			const intro = window.wallpaper.some(([clip]) => clip === "intro");
			if (intro && !document.querySelector('.fracture-background video[src*="intro"]') && !window.wallpaper.some(([, type]) => type === "removed")) log("intro", "removed");
		}).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
	});
	await page.locator(".rsod").click();

	await page.locator(".desktop-sparks").waitFor({ state: "attached" });
	await page.locator('.fracture-background video[src*="intro"]').waitFor({ state: "detached", timeout: 10000 });
	const events = await page.evaluate(() => window.wallpaper);
	const at = (clip, type) => events.findIndex((entry) => entry[0] === clip && entry[1] === type);
	const introFrames = events.filter(([clip, type]) => clip === "intro" && type === "frame").map((entry) => entry[2]);
	check(introFrames.at(-1) > 0.98, `The intro stopped before its last frame: ${introFrames.at(-1)}`);
	check(at("intro", "ended") < at("loop", "playing") && at("loop", "playing") < at("intro", "removed"), `The intro left before the loop played: ${JSON.stringify(events.filter(([, type]) => type !== "frame"))}`);
	check(events.find(([clip, type]) => clip === "loop" && type === "frame")?.[2] === 0, "The loop did not start from its first frame");

	const loop = page.locator(".fracture-background video");
	const before = await loop.evaluate((video) => video.currentTime);
	await page.waitForTimeout(500);
	check(await loop.evaluate((video, previous) => video.loop && !video.paused && video.currentTime > previous, before), "The loop is not playing");
	check(await page.locator(".fracture-background").evaluate((el) => el.getAttribute("aria-hidden") === "true" && getComputedStyle(el).pointerEvents === "none"), "The wallpaper is exposed to input or assistive technology");
	return "PASS: the screen shatters, and the intro holds its last frame until the loop plays";
}

try {
	browser("open", process.env.FRACTURE_TEST_URL || "http://localhost:3000", "--browser", "chrome");
	console.log(browser("run-code", checkFracture.toString()));
} finally {
	try { browser("close"); } catch { /* Preserve the original test failure. */ }
}
