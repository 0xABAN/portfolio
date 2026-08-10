export type ExplorerFile =
	| { id: string; name: string; icon: string; action: "bio" }
	| { id: string; name: string; icon: string; action: "href"; href: string };

export const EXPLORER_PATH = "C:\\😎";

export const EXPLORER_FILES: readonly ExplorerFile[] = [
	{
		id: "bio",
		name: "bio.txt",
		icon: "/icons/notepad.svg",
		action: "bio",
	},
	{
		id: "resume",
		name: "Resume_001.pdf",
		icon: "/icons/pdf.png",
		action: "href",
		href: "/Resume_001.pdf",
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
