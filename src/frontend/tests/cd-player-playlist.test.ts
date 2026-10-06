import assert from "node:assert/strict";
import { test } from "node:test";
import { coverUrl, formatElapsed, PLAYLIST_URL, shuffledOrder, stepShuffle, toTrack, type Shuffle } from "@/components/desktop/apps/cd-player/playlist";

test("the player reads the portfolio playlist on SoundCloud", () => {
	assert.equal(new URL(PLAYLIST_URL).origin, "https://soundcloud.com");
	assert.match(new URL(PLAYLIST_URL).pathname, /^\/[^/]+\/sets\/[^/]+$/);
});

test("a shuffled round holds every track once, in varying order", () => {
	const firsts = new Set<number>();
	for (let i = 0; i < 500; i++) {
		const order = shuffledOrder(5);
		assert.deepEqual([...order].sort(), [0, 1, 2, 3, 4]);
		firsts.add(order[0]);
	}
	assert.deepEqual([...firsts].sort(), [0, 1, 2, 3, 4]);
	assert.deepEqual(shuffledOrder(1, 0), [0]);
	assert.throws(() => shuffledOrder(0), /empty/);
});

test("the whole playlist plays before any track repeats", () => {
	let shuffle: Shuffle = { order: shuffledOrder(18), position: 0 };
	for (let round = 0; round < 50; round++) {
		const played = [shuffle.order[shuffle.position]];
		for (let i = 1; i < 18; i++) {
			shuffle = stepShuffle(shuffle, 1);
			played.push(shuffle.order[shuffle.position]);
		}
		assert.equal(new Set(played).size, 18);

		// The next round never opens with the track that just ended.
		shuffle = stepShuffle(shuffle, 1);
		assert.equal(shuffle.position, 0);
		assert.notEqual(shuffle.order[0], played.at(-1));
	}
});

test("previous steps back through the round and wraps to its end", () => {
	const shuffle: Shuffle = { order: [2, 0, 1], position: 1 };
	assert.deepEqual(stepShuffle(shuffle, -1), { order: [2, 0, 1], position: 0 });
	assert.deepEqual(stepShuffle({ ...shuffle, position: 0 }, -1), { order: [2, 0, 1], position: 2 });
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
