/** Desktop trickle-in after restart. Last item must land at BOOT_MS. */
export const BOOT_MS = 2100;

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
	{ id: "tb:start", at: 40 },
	{ id: "tb:github", at: 90 },
	{ id: "tb:linkedin", at: 130 },
	{ id: "tb:twitter", at: 170 },
	{ id: "tb:cd", at: 230 },
	{ id: "tb:tray", at: 290 },
	{ id: "tb:speaker", at: 340 },
	{ id: "tb:views", at: 390 },
	{ id: "hollow-knight", at: 520 },
	{ id: "silksong", at: 700 },
	{ id: "persona-3-reload", at: 780 },
	{ id: "terraria", at: 860 },
	{ id: "persona-5-royal", at: 940 },
	{ id: "roblox", at: 1020 },
	{ id: "secrets", at: 1120 },
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
		"secrets",
		"recycle-bin",
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
