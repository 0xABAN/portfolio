import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";
import { PLAYLIST, randomTrackIndex, skipUnmapped, trackAt, wrapIndex } from "./playlist";

test("all 17 soundtrack entries have playable sources, artwork and wrapping navigation", () => {
	assert.equal(PLAYLIST.length, 17);
	assert.equal(new Set(PLAYLIST.map((track) => track.src)).size, PLAYLIST.length);

	for (const [index, track] of PLAYLIST.entries()) {
		assert.ok(track.title && track.artist);
		assert.ok(track.src, `${track.title} has no source`);
		assert.equal(new URL(track.src).origin, "https://soundcloud.com");
		if (track.cover.startsWith("/")) {
			assert.ok(existsSync(new URL(`../../../public${track.cover}`, import.meta.url)), `${track.title} artwork is missing`);
		} else {
			assert.equal(new URL(track.cover).protocol, "https:");
		}

		assert.equal(skipUnmapped(index), wrapIndex(index + 1));
		const shuffled = randomTrackIndex(index);
		assert.ok(shuffled >= 0 && shuffled < PLAYLIST.length && shuffled !== index);
	}

	assert.equal(trackAt(-1), PLAYLIST.at(-1));
	assert.equal(trackAt(PLAYLIST.length), PLAYLIST[0]);
});
