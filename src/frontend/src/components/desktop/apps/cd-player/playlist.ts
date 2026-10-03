/** CD Player queue — SoundCloud permalinks, plus unmapped placeholders. */

export type Track = {
	/** SoundCloud permalink; null means no playable source. */
	src: string | null;
	title: string;
	artist: string;
	cover: string;
};

const UNDERTALE_COVER = "/music/covers/fallen-down.jpg";
const P3R_COVER = "/music/covers/full-moon-full-life.jpg";
const P4_COVER = "/music/covers/heartbeat-heartbreak.jpg";

/** Spotify playlist 0GYdCEARGMLwJ2LD1oTv6Z order. */
export const PLAYLIST: readonly Track[] = [
	{
		src: "https://soundcloud.com/tman2bard/under-night-in-birth-ost-gathers-under-nightcharacter-select-theme",
		title: "Gathers Under Night...",
		artist: "Raito",
		cover: "/music/covers/gathers-under-night.jpg",
	},
	{
		src: "https://soundcloud.com/fawfulhasfury/the-grand-finale-mario-luigi-bowsers-inside-story",
		title: "The Grand Finale",
		artist: "Yoko Shimomura",
		cover: "/music/covers/grand-finale.jpg",
	},
	{
		src: "https://soundcloud.com/chrischristodouloumusic/con-lentitud-poderosa",
		title: "…con lentitud poderosa",
		artist: "Chris Christodoulou",
		cover: "https://i.scdn.co/image/ab67616d000048516697f4b4355ca2590ad808be",
	},
	{
		src: "https://soundcloud.com/toby-radiation-fox/004-fallen-down",
		title: "Fallen Down",
		artist: "Toby Fox",
		cover: UNDERTALE_COVER,
	},
	{
		src: "https://soundcloud.com/toby-radiation-fox/077-asgore",
		title: "ASGORE",
		artist: "Toby Fox",
		cover: "/music/covers/asgore.jpg",
	},
	{
		src: "https://soundcloud.com/browain1/beneath-the-mask",
		title: "Beneath the Mask",
		artist: "Lyn",
		cover: "/music/covers/beneath-the-mask.jpg",
	},
	{
		src: "https://soundcloud.com/paola-anahi-garcia/persona-4-heartbeat-heartbreak",
		title: "Heartbeat, Heartbreak",
		artist: "Shihoko Hirata",
		cover: P4_COVER,
	},
	{
		src: "https://soundcloud.com/persona3ost/color-your-night-persona-3-reload-ost",
		title: "Color Your Night",
		artist: "Lotus Juice × Azumi Takahashi",
		cover: "/music/covers/color-your-night.jpg",
	},
	{
		src: "https://soundcloud.com/persona3ost/full-moon-full-life-persona-3-reload-ost",
		title: "Full Moon Full Life",
		artist: "Azumi Takahashi × Lotus Juice",
		cover: P3R_COVER,
	},
	{
		src: "https://soundcloud.com/persona3ost/its-going-down-now-persona-3-reload-ost",
		title: "It's Going Down Now",
		artist: "Lotus Juice × Azumi Takahashi",
		cover: "/music/covers/its-going-down-now.jpg",
	},
	{
		src: "https://soundcloud.com/dm-dokuro/universal-collapse-ingame-version",
		title: "Universal Collapse",
		artist: "DM DOKURO",
		cover: "/music/covers/universal-collapse.jpg",
	},
	{
		src: "https://soundcloud.com/persona3ost/memories-of-you-kimi-no-kioku-reload-persona-3-reload-ost",
		title: "Memories of You -Reload-",
		artist: "Azumi Takahashi",
		cover: P3R_COVER,
	},
	{
		src: "https://soundcloud.com/toby-radiation-fox/017-snowy",
		title: "Snowy",
		artist: "Toby Fox",
		cover: UNDERTALE_COVER,
	},
	{
		src: "https://soundcloud.com/toby-radiation-fox/097-but-the-earth-refused-to",
		title: "But The Earth Refused To Die",
		artist: "Toby Fox",
		cover: UNDERTALE_COVER,
	},
	{
		src: "https://soundcloud.com/toby-radiation-fox/081-an-ending",
		title: "An Ending",
		artist: "Toby Fox",
		cover: UNDERTALE_COVER,
	},
	{
		src: "https://soundcloud.com/p3dancinginmoonlight/a-way-of-life-deep-inside-my",
		title: "A way of Life - Deep inside my mind Remix",
		artist: "藤田真由美",
		cover: P3R_COVER,
	},
	{
		src: "https://soundcloud.com/user-22127002/persona-4-ost-42-heaven",
		title: "Heaven",
		artist: "Shihoko Hirata",
		cover: P4_COVER,
	},
];

export function wrapIndex(i: number): number {
	const n = PLAYLIST.length;
	if (n === 0) throw new Error("playlist is empty");
	return ((i % n) + n) % n;
}

export function trackAt(i: number): Track {
	const t = PLAYLIST[wrapIndex(i)];
	if (!t) throw new Error("playlist is empty");
	return t;
}

export function formatElapsed(sec: number) {
	if (!Number.isFinite(sec) || sec < 0) sec = 0;
	const s = Math.floor(sec);
	return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

function playableIndexes(): number[] {
	return PLAYLIST.flatMap((track, i) => (track.src ? [i] : []));
}

/** Next mapped track, wrapping. */
export function skipUnmapped(from: number): number {
	const n = PLAYLIST.length;
	for (let step = 1; step <= n; step++) {
		const i = wrapIndex(from + step);
		if (PLAYLIST[i]?.src) return i;
	}
	return wrapIndex(from);
}

/** Random mapped index; avoids immediate repeat when possible. */
export function randomTrackIndex(except?: number) {
	const playable = playableIndexes();
	const pool = playable.filter((i) => i !== except);
	const pick = pool.length ? pool : playable;
	if (pick.length === 0) return 0;
	return pick[Math.floor(Math.random() * pick.length)] ?? 0;
}
