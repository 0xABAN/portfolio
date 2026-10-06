import { DESK_ICONS } from "../../files/catalog";

/** Desktop trickle-in after restart. Last item must land at DESKTOP_REVEAL_MS. */
export const DESKTOP_REVEAL_MS = 2100;

const WINDOW_IDS = [
	"me",
	"alt",
	"new",
	"terminal",
	"github",
	"cd-player",
	"sysmsg-0",
	"sysmsg-1",
	"sysmsg-2",
	"sysmsg-3",
	"sysmsg-4",
] as const;

/**
 * Ids match Desktop / Taskbar reveal gates. The wallpaper and its effects are
 * not gated: the screen shatters as soon as the desktop mounts, and the sparks
 * follow it.
 */
export const DESKTOP_REVEAL_SCHEDULE: readonly { id: string; at: number }[] = [
	{ id: "tb:start", at: 40 },
	{ id: "cd-player", at: 230 },
	{ id: "tb:tray", at: 290 },
	{ id: "tb:speaker", at: 340 },
	{ id: "tb:views", at: 390 },
	{ id: "hollow-knight", at: 520 },
	{ id: "silksong", at: 700 },
	{ id: "persona-3-reload", at: 780 },
	{ id: "terraria", at: 860 },
	{ id: "persona-5-royal", at: 940 },
	{ id: "undertale", at: 980 },
	{ id: "roblox", at: 1020 },
	{ id: "cd-player-icon", at: 1100 },
	{ id: "secrets", at: 1120 },
	{ id: "social-github", at: 1140 },
	{ id: "social-linkedin", at: 1170 },
	{ id: "social-twitter", at: 1200 },
	{ id: "recycle-bin", at: 1220 },
	{ id: "me", at: 1380 },
	{ id: "alt", at: 1480 },
	{ id: "new", at: 1580 },
	{ id: "terminal", at: 1680 },
	{ id: "github", at: 1760 },
	{ id: "sysmsg-0", at: 1840 },
	{ id: "sysmsg-1", at: 1900 },
	{ id: "sysmsg-2", at: 1960 },
	{ id: "sysmsg-3", at: 2020 },
	{ id: "sysmsg-4", at: 2060 },
	{ id: "neko", at: DESKTOP_REVEAL_MS },
	// Starts the CD Player's autoplay once everything has landed.
	{ id: "boot-complete", at: DESKTOP_REVEAL_MS },
];

/** Initial-layout windows gated by the schedule. User-opened windows skip this. */
export const DESKTOP_REVEAL_WINDOWS: ReadonlySet<string> = new Set(WINDOW_IDS);

if (process.env.NODE_ENV !== "production") {
	const required = [...DESK_ICONS.map((icon) => icon.id), "recycle-bin", ...WINDOW_IDS, "neko", "boot-complete"];
	const seen = new Set<string>();
	let max = 0;
	for (const { id, at } of DESKTOP_REVEAL_SCHEDULE) {
		if (seen.has(id)) throw new Error(`desktopReveal: duplicate id ${id}`);
		seen.add(id);
		if (at < 0 || at > DESKTOP_REVEAL_MS) {
			throw new Error(`desktopReveal: ${id} at ${at} outside 0..${DESKTOP_REVEAL_MS}`);
		}
		max = Math.max(max, at);
	}
	for (const id of required) {
		if (!seen.has(id)) throw new Error(`desktopReveal: missing ${id}`);
	}
	if (max !== DESKTOP_REVEAL_MS) {
		throw new Error(`desktopReveal: last reveal at ${max}, expected ${DESKTOP_REVEAL_MS}`);
	}
}
