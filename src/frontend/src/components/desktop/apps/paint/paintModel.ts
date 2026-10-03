/** Classic MS Paint tool order (Win95–XP) — icons from jspaint classic sprite */
export const TOOLS = [
	{ id: "free-form-select", name: "Free-Form Select" },
	{ id: "select", name: "Select" },
	{ id: "eraser", name: "Eraser/Color Eraser" },
	{ id: "fill", name: "Fill With Color" },
	{ id: "pick-color", name: "Pick Color" },
	{ id: "magnifier", name: "Magnifier" },
	{ id: "pencil", name: "Pencil" },
	{ id: "brush", name: "Brush" },
	{ id: "airbrush", name: "Airbrush" },
	{ id: "text", name: "Text" },
	{ id: "line", name: "Line" },
	{ id: "curve", name: "Curve" },
	{ id: "rectangle", name: "Rectangle" },
	{ id: "polygon", name: "Polygon" },
	{ id: "ellipse", name: "Ellipse" },
	{ id: "rounded-rectangle", name: "Rounded Rectangle" },
] as const;

export type ToolId = (typeof TOOLS)[number]["id"];

/** Phase 1 drawable tools */
export const DRAWABLE_TOOLS = new Set<ToolId>(["pencil", "brush", "eraser"]);

/** jspaint color-data.js default palette — 2×14 */
export const PALETTE = [
	"rgb(0,0,0)",
	"rgb(128,128,128)",
	"rgb(128,0,0)",
	"rgb(128,128,0)",
	"rgb(0,128,0)",
	"rgb(0,128,128)",
	"rgb(0,0,128)",
	"rgb(128,0,128)",
	"rgb(128,128,64)",
	"rgb(0,64,64)",
	"rgb(0,128,255)",
	"rgb(0,64,128)",
	"rgb(64,0,255)",
	"rgb(128,64,0)",
	"rgb(255,255,255)",
	"rgb(192,192,192)",
	"rgb(255,0,0)",
	"rgb(255,255,0)",
	"rgb(0,255,0)",
	"rgb(0,255,255)",
	"rgb(0,0,255)",
	"rgb(255,0,255)",
	"rgb(255,255,128)",
	"rgb(0,255,128)",
	"rgb(128,255,255)",
	"rgb(128,128,255)",
	"rgb(255,0,128)",
	"rgb(255,128,64)",
] as const;

export const MENUS = [
	"File",
	"Edit",
	"View",
	"Image",
	"Colors",
	"Help",
] as const;

/** jspaint circular brush sizes ascending; eraser subset of [4,6,8,10] */
export const BRUSH_SIZES = [1, 4, 7] as const;
export const ERASER_SIZES = [4, 6, 8] as const;
export const DEFAULT_SIZE_INDEX = 1;
export const UNDO_LIMIT = 20;

export type SizeIndex = 0 | 1 | 2;
export type Coords = { x: number; y: number };

export const SIZE_DOT = ["sm", "md", "lg"] as const;
