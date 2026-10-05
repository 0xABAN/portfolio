import assert from "node:assert/strict";
import { test } from "node:test";
import { coverUrl, formatElapsed, PLAYLIST_URL, randomStartIndex, randomTrackIndex, toTrack, wrapIndex } from "@/components/desktop/apps/cd-player/playlist";

test("the player reads the portfolio playlist on SoundCloud", () => {
	assert.equal(new URL(PLAYLIST_URL).origin, "https://soundcloud.com");
	assert.match(new URL(PLAYLIST_URL).pathname, /^\/[^/]+\/sets\/[^/]+$/);
});

test("track navigation wraps around both ends of the playlist", () => {
	assert.equal(wrapIndex(-1, 6), 5);
	assert.equal(wrapIndex(6, 6), 0);
	assert.equal(wrapIndex(13, 6), 1);
	assert.throws(() => wrapIndex(0, 0), /empty/);
});

test("shuffle never repeats the track that just ended when there is another", () => {
	for (let i = 0; i < 500; i++) {
		const next = randomTrackIndex(3, 1);
		assert.ok(next === 0 || next === 2, `picked ${next}`);
	}
	assert.equal(randomTrackIndex(1, 0), 0);

	const first = new Set(Array.from({ length: 500 }, () => randomTrackIndex(4)));
	assert.deepEqual([...first].sort(), [0, 1, 2, 3]);
});

test("the first track is one SoundCloud has already described", () => {
	// The widget describes only the first few sounds of a playlist up front.
	const sounds = [{ id: 1, title: "One" }, { id: 2 }, { id: 3, title: "Three" }, { id: 4 }];
	const first = new Set(Array.from({ length: 500 }, () => randomStartIndex(sounds)));
	assert.deepEqual([...first].sort(), [0, 2]);
	assert.throws(() => randomStartIndex([{ id: 1 }]), /described/);
});

test("tracks show SoundCloud's title, uploader and 500px artwork", () => {
	const track = toTrack({
		id: 1,
		title: "004 - Fallen Down",
		user: { username: "Toby Fox" },
		artwork_url: "https://i1.sndcdn.com/artworks-YqTAIj8lOP4RBrEd-Lu0YuA-large.jpg",
	});
	assert.deepEqual(track, {
		title: "004 - Fallen Down",
		artist: "Toby Fox",
		cover: "https://i1.sndcdn.com/artworks-YqTAIj8lOP4RBrEd-Lu0YuA-t500x500.jpg",
	});
	assert.equal(toTrack({ id: 2, title: "No art", artwork_url: null }).cover, null);
	assert.equal(coverUrl("https://i1.sndcdn.com/artworks-abc-large.png"), "https://i1.sndcdn.com/artworks-abc-t500x500.png");
});

test("elapsed time reads as minutes and seconds", () => {
	assert.equal(formatElapsed(0), "0:00");
	assert.equal(formatElapsed(65.9), "1:05");
	assert.equal(formatElapsed(-3), "0:00");
});
