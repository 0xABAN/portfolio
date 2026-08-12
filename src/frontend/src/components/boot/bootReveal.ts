/** Desktop trickle-in after restart. Last item must land at BOOT_MS. */
export const BOOT_MS = 3800;

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
	{ id: "tb:start", at: 60 },
	{ id: "tb:github", at: 150 },
	{ id: "tb:linkedin", at: 230 },
	{ id: "tb:twitter", at: 300 },
	{ id: "tb:cd", at: 420 },
	{ id: "tb:tray", at: 520 },
	{ id: "tb:speaker", at: 610 },
	{ id: "tb:views", at: 710 },
	// thorns stay always-on; only branch trickles in
	{ id: "branch", at: 850 },
	{ id: "hollow-knight", at: 1140 },
	{ id: "silksong", at: 1560 },
	{ id: "persona-3-reload", at: 1710 },
	{ id: "terraria", at: 1850 },
	{ id: "persona-5-royal", at: 1990 },
	{ id: "roblox", at: 2130 },
	{ id: "self", at: 2280 },
	{ id: "experience", at: 2420 },
	{ id: "recycle-bin", at: 2510 },
	{ id: "me", at: 2610 },
	{ id: "alt", at: 2750 },
	{ id: "new", at: 2900 },
	{ id: "terminal", at: 3040 },
	{ id: "github", at: 3180 },
	{ id: "sysmsg-0", at: 3320 },
	{ id: "sysmsg-1", at: 3420 },
	{ id: "sysmsg-2", at: 3510 },
	{ id: "sysmsg-3", at: 3610 },
	{ id: "sysmsg-4", at: 3700 },
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
		"self",
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
