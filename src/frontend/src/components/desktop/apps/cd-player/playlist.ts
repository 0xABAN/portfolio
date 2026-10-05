/**
 * The CD Player plays this SoundCloud playlist. Its tracks, order, titles and
 * artwork all come from SoundCloud: edit the playlist there to change the music.
 */
export const PLAYLIST_URL = "https://soundcloud.com/0x-aban/sets/portfolio";

/** The fields the player reads from a SoundCloud Widget sound object. */
export type ScSound = {
	id: number;
	/** Missing until SoundCloud has described the sound; see `getCurrentSound`. */
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

export function wrapIndex(i: number, count: number): number {
	if (count <= 0) throw new Error("playlist is empty");
	return ((i % count) + count) % count;
}

/** A random track, other than `except` when the playlist has another one. */
export function randomTrackIndex(count: number, except?: number) {
	if (count <= 0) throw new Error("playlist is empty");
	if (count === 1 || except === undefined) return Math.floor(Math.random() * count);

	// Pick among the others, then step over `except`.
	const pick = Math.floor(Math.random() * (count - 1));
	return pick >= except ? pick + 1 : pick;
}

/**
 * A random track to start on, among those SoundCloud has already described.
 * The widget ignores a skip to a sound it has not loaded yet: it selects the
 * sound but never plays it, which would leave the player silent.
 */
export function randomStartIndex(sounds: ScSound[]) {
	const described = sounds.flatMap((sound, i) => (sound.title ? [i] : []));
	if (!described.length) throw new Error("no track is described yet");
	return described[Math.floor(Math.random() * described.length)];
}

export function formatElapsed(sec: number) {
	if (!Number.isFinite(sec) || sec < 0) sec = 0;
	const s = Math.floor(sec);
	return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}
