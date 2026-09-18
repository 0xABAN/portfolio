export type ExplorerFile = {
	id: string;
	name: string;
	icon: string;
	action: "bio" | "experience" | "word";
};

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
		name: "resume.doc",
		icon: "/icons/notepad.svg",
		action: "word",
	},
	{
		id: "experience",
		name: "experience.exe",
		icon: "/icons/exe.png",
		action: "experience",
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
