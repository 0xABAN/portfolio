export const PLAYLIST_URL = "https://soundcloud.com/0x-aban/sets/portfolio";

export type ScSound = {
	id: number;
	title?: string;
	user?: { username?: string };
	artwork_url?: string | null;
};

export type Track = {
	title: string;
	artist: string;
	cover: string | null;
};

export function toTrack(sound: ScSound & { title: string }): Track {
	return {
		title: sound.title,
		artist: sound.user?.username ?? "",
		cover: sound.artwork_url ? coverUrl(sound.artwork_url) : null,
	};
}

export function coverUrl(artworkUrl: string) {
	return artworkUrl.replace(/-large(\.\w+)$/, "-t500x500$1");
}

export type Shuffle = { order: number[]; position: number };

export function shuffledOrder(count: number, notFirst?: number): number[] {
	if (count <= 0) throw new Error("playlist is empty");

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
