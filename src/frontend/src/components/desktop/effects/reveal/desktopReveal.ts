/** When the desktop has finished trickling in after the restart; the last items land here. */
export const DESKTOP_REVEAL_MS = 2100;

/**
 * The desktop's trickle-in after the restart, in ms. Items not listed show at
 * once, so a missing entry can never hide one. The wallpaper is not listed:
 * the screen shatters as soon as the desktop mounts, and the sparks follow it.
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
