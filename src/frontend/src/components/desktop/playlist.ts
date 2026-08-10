/** Local “Spotify” queue — files in /public/music */

export type Track = {
	src: string;
	title: string;
	artist: string;
};

export const PLAYLIST: readonly Track[] = [
	{
		src: "/music/fallen-down.mp3",
		title: "Fallen Down",
		artist: "Toby Fox",
	},
	{
		src: "/music/asgore.mp3",
		title: "ASGORE",
		artist: "Toby Fox",
	},
	{
		src: "/music/grand-finale.mp3",
		title: "The Grand Finale",
		artist: "Yoko Shimomura",
	},
	{
		src: "/music/gathers-under-night.mp3",
		title: "Gathers Under Night...",
		artist: "Raito",
	},
	{
		src: "/music/universal-collapse.mp3",
		title: "Universal Collapse",
		artist: "DM DOKURO",
	},
	{
		src: "/music/full-moon-full-life.mp3",
		title: "Full Moon Full Life",
		artist: "Azumi Takahashi × Lotus Juice",
	},
	{
		src: "/music/color-your-night.mp3",
		title: "Color Your Night",
		artist: "Azumi Takahashi × Lotus Juice",
	},
	{
		src: "/music/its-going-down-now.mp3",
		title: "It's Going Down Now",
		artist: "Lotus Juice × Azumi Takahashi",
	},
	{
		src: "/music/heartbeat-heartbreak.mp3",
		title: "Heartbeat, Heartbreak",
		artist: "Shihoko Hirata",
	},
	{
		src: "/music/beneath-the-mask.mp3",
		title: "Beneath the Mask",
		artist: "Lyn",
	},
] as const;

export function trackAt(i: number): Track {
	const n = PLAYLIST.length;
	if (n === 0) {
		throw new Error("playlist is empty");
	}
	const idx = ((i % n) + n) % n;
	const t = PLAYLIST[idx];
	if (!t) throw new Error("playlist is empty");
	return t;
}

export function formatElapsed(sec: number) {
	if (!Number.isFinite(sec) || sec < 0) sec = 0;
	const s = Math.floor(sec);
	const m = Math.floor(s / 60);
	const r = s % 60;
	return `${m}:${r.toString().padStart(2, "0")}`;
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
