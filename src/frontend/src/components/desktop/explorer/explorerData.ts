export type ExplorerFile =
	| { id: string; name: string; icon: string; action: "bio" }
	| { id: string; name: string; icon: string; action: "href"; href: string };

export const EXPLORER_PATH = "C:\\secrets";

export const EXPLORER_FILES: readonly ExplorerFile[] = [
	{
		id: "bio",
		name: "bio.txt",
		icon: "/icons/notepad.svg",
		action: "bio",
	},
	{
		id: "resume",
		name: "resume.pdf",
		icon: "/icons/pdf.png",
		action: "href",
		href: "https://github.com/0xABAN/resume",
	},
] as const;

export const EXPLORER_MENUS = [
	"File",
	"Edit",
	"View",
	"Favorites",
	"Tools",
	"Help",
] as const;

export const EXPLORER_TOOLBAR = [
	"Back",
	"Forward",
	"Up",
	"Cut",
	"Copy",
	"Paste",
	"Undo",
	"Delete",
	"Properties",
	"Views",
] as const;
