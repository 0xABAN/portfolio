/** Local CD Player queue — files in /public/music */

export type Track = {
	src: string;
	title: string;
	artist: string;
	/** 1:1 cover art under /public/music/covers */
	cover: string;
};

/** id, title, artist — paths derived from id */
const ENTRIES = [
	["fallen-down", "Fallen Down", "Toby Fox"],
	["asgore", "ASGORE", "Toby Fox"],
	["grand-finale", "The Grand Finale", "Yoko Shimomura"],
	["gathers-under-night", "Gathers Under Night...", "Raito"],
	["universal-collapse", "Universal Collapse", "DM DOKURO"],
	["full-moon-full-life", "Full Moon Full Life", "Azumi Takahashi × Lotus Juice"],
	["color-your-night", "Color Your Night", "Azumi Takahashi × Lotus Juice"],
	["its-going-down-now", "It's Going Down Now", "Lotus Juice × Azumi Takahashi"],
	["heartbeat-heartbreak", "Heartbeat, Heartbreak", "Shihoko Hirata"],
	["beneath-the-mask", "Beneath the Mask", "Lyn"],
] as const;

export const PLAYLIST: readonly Track[] = ENTRIES.map(([id, title, artist]) => ({
	src: `/music/${id}.mp3`,
	cover: `/music/covers/${id}.jpg`,
	title,
	artist,
}));

export function trackAt(i: number): Track {
	const n = PLAYLIST.length;
	if (n === 0) throw new Error("playlist is empty");
	const t = PLAYLIST[((i % n) + n) % n];
	if (!t) throw new Error("playlist is empty");
	return t;
}

export function formatElapsed(sec: number) {
	if (!Number.isFinite(sec) || sec < 0) sec = 0;
	const s = Math.floor(sec);
	return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/** Random index; avoids immediate repeat when possible. */
export function randomTrackIndex(except?: number) {
	const n = PLAYLIST.length;
	if (n <= 1) return 0;
	if (except == null || except < 0 || except >= n) {
		return Math.floor(Math.random() * n);
	}
	const i = Math.floor(Math.random() * (n - 1));
	return i >= except ? i + 1 : i;
}
