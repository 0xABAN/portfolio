/** Desktop trickle-in after restart. Last item must land at BOOT_MS. */
export const BOOT_MS = 5000;

/** Dev skips RSOD/restart and reveals everything immediately. */
export const SKIP_INTRO = process.env.NODE_ENV === "development";

const WINDOW_IDS = [
	"me",
	"alt",
	"new",
	"terminal",
	"github",
	"sysmsg-0",
	"sysmsg-1",
	"sysmsg-2",
	"sysmsg-3",
	"sysmsg-4",
] as const;

/** Ids match Desktop / Taskbar reveal gates. */
export const BOOT_SCHEDULE: readonly { id: string; at: number }[] = [
	{ id: "tb:start", at: 80 },
	{ id: "tb:github", at: 200 },
	{ id: "tb:linkedin", at: 300 },
	{ id: "tb:twitter", at: 400 },
	{ id: "tb:cd", at: 560 },
	{ id: "tb:tray", at: 690 },
	{ id: "tb:speaker", at: 810 },
	{ id: "tb:views", at: 940 },
	// thorns stay always-on; only branch trickles in
	{ id: "branch", at: 1120 },
	{ id: "hollow-knight", at: 1500 },
	{ id: "silksong", at: 2060 },
	{ id: "persona-3-reload", at: 2250 },
	{ id: "terraria", at: 2440 },
	{ id: "persona-5-royal", at: 2620 },
	{ id: "roblox", at: 2810 },
	{ id: "sunglasses", at: 3000 },
	{ id: "experience", at: 3190 },
	{ id: "recycle-bin", at: 3300 },
	{ id: "me", at: 3440 },
	{ id: "alt", at: 3620 },
	{ id: "new", at: 3810 },
	{ id: "terminal", at: 4000 },
	{ id: "github", at: 4190 },
	{ id: "sysmsg-0", at: 4370 },
	{ id: "sysmsg-1", at: 4500 },
	{ id: "sysmsg-2", at: 4620 },
	{ id: "sysmsg-3", at: 4750 },
	{ id: "sysmsg-4", at: 4870 },
	{ id: "neko", at: BOOT_MS },
];

/** Initial-layout windows gated by the schedule. User-opened windows skip this. */
export const BOOT_WINDOWS: ReadonlySet<string> = new Set(WINDOW_IDS);

if (process.env.NODE_ENV !== "production") {
	const required = [
		"hollow-knight",
		"silksong",
		"terraria",
		"roblox",
		"persona-3-reload",
		"persona-5-royal",
		"sunglasses",
		"experience",
		"recycle-bin",
		"branch",
		...WINDOW_IDS,
		"neko",
	];
	const seen = new Set<string>();
	let max = 0;
	for (const { id, at } of BOOT_SCHEDULE) {
		if (seen.has(id)) throw new Error(`bootReveal: duplicate id ${id}`);
		seen.add(id);
		if (at < 0 || at > BOOT_MS) {
			throw new Error(`bootReveal: ${id} at ${at} outside 0..${BOOT_MS}`);
		}
		max = Math.max(max, at);
	}
	for (const id of required) {
		if (!seen.has(id)) throw new Error(`bootReveal: missing ${id}`);
	}
	if (max !== BOOT_MS) {
		throw new Error(`bootReveal: last reveal at ${max}, expected ${BOOT_MS}`);
	}
}
