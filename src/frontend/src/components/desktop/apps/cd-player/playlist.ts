/**
 * The CD Player shuffles this SoundCloud playlist. Its tracks, titles and
 * artwork all come from SoundCloud: edit the playlist there to change the music.
 */
export const PLAYLIST_URL = "https://soundcloud.com/0x-aban/sets/portfolio";

/** The fields the player reads from a SoundCloud Widget sound object. */
export type ScSound = {
	id: number;
	/** Missing until the widget has described the sound, a moment after READY. */
	title?: string;
	user?: { username?: string };
	artwork_url?: string | null;
};

/** What the CD Player shows for a track, as SoundCloud names it. */
export type Track = {
	title: string;
	/** The uploader's name. */
	artist: string;
	/** Null when the upload has no artwork. */
	cover: string | null;
};

export function toTrack(sound: ScSound & { title: string }): Track {
	return {
		title: sound.title,
		artist: sound.user?.username ?? "",
		cover: sound.artwork_url ? coverUrl(sound.artwork_url) : null,
	};
}

/** The widget reports 100px "large" artwork; SoundCloud serves the same image at 500px. */
export function coverUrl(artworkUrl: string) {
	return artworkUrl.replace(/-large(\.\w+)$/, "-t500x500$1");
}

/** A round of the playlist in random order, and the track playing in it. */
export type Shuffle = { order: number[]; position: number };

/**
 * Every track of the playlist once, in random order, so the whole playlist
 * plays before any track repeats. `notFirst` keeps the track that just ended
 * from opening the next round when there is another.
 */
export function shuffledOrder(count: number, notFirst?: number): number[] {
	if (count <= 0) throw new Error("playlist is empty");

	// Fisher–Yates.
	const order = Array.from({ length: count }, (_, i) => i);
	for (let i = count - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[order[i], order[j]] = [order[j], order[i]];
	}

	if (count > 1 && order[0] === notFirst) {
		const j = 1 + Math.floor(Math.random() * (count - 1));
		[order[0], order[j]] = [order[j], order[0]];
	}
	return order;
}

/**
 * Moves one track through the round. Going past the last track deals a new
 * round; going back from the first wraps to the end of the current one.
 */
export function stepShuffle({ order, position }: Shuffle, direction: 1 | -1): Shuffle {
	const next = position + direction;
	if (next >= order.length) return { order: shuffledOrder(order.length, order[position]), position: 0 };
	if (next < 0) return { order, position: order.length - 1 };
	return { order, position: next };
}

export function formatElapsed(sec: number) {
	if (!Number.isFinite(sec) || sec < 0) sec = 0;
	const s = Math.floor(sec);
	return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
