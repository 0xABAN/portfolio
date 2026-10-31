export const TOOLS = [
	{ id: "free-form-select", name: "Free-Form Select" },
	{ id: "select", name: "Select" },
	{ id: "eraser", name: "Eraser" },
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

export type DrawableTool = Extract<ToolId, "pencil" | "brush" | "eraser">;

export function isDrawable(tool: ToolId): tool is DrawableTool {
	return tool === "pencil" || tool === "brush" || tool === "eraser";
}

export const PALETTE = [
	"rgb(0,0,0)", "rgb(128,128,128)", "rgb(128,0,0)", "rgb(128,128,0)", "rgb(0,128,0)", "rgb(0,128,128)", "rgb(0,0,128)", "rgb(128,0,128)", "rgb(128,128,64)", "rgb(0,64,64)", "rgb(0,128,255)", "rgb(0,64,128)", "rgb(64,0,255)", "rgb(128,64,0)",
	"rgb(255,255,255)", "rgb(192,192,192)", "rgb(255,0,0)", "rgb(255,255,0)", "rgb(0,255,0)", "rgb(0,255,255)", "rgb(0,0,255)", "rgb(255,0,255)", "rgb(255,255,128)", "rgb(0,255,128)", "rgb(128,255,255)", "rgb(128,128,255)", "rgb(255,0,128)", "rgb(255,128,64)",
] as const;

export const MENUS = ["File", "Edit", "View", "Image", "Colors", "Help"] as const;

export const UNDO_LIMIT = 20;

export function bresenhamLine(x1: number, y1: number, x2: number, y2: number, callback: (x: number, y: number) => void, dense = false): void {
	x1 = ~~x1;
	x2 = ~~x2;
	y1 = ~~y1;
	y2 = ~~y2;

	const dx = Math.abs(x2 - x1);
	const dy = Math.abs(y2 - y1);
	const sx = x1 < x2 ? 1 : -1;
	const sy = y1 < y2 ? 1 : -1;
	let err = dx - dy;

	for (;;) {
		callback(x1, y1);
		if (x1 === x2 && y1 === y2) break;
		const e2 = err * 2;
		if (e2 > -dy) {
			err -= dy;
			x1 += sx;
		}
		if (dense) callback(x1, y1);
		if (e2 < dx) {
			err += dx;
			y1 += sy;
		}
	}
}

const BRUSH_SIZE = 4;
const ERASER_SIZE = 6;

export type FreehandStyle = { tool: DrawableTool; color: string };

export function resolveStrokeStyle(tool: ToolId, fg: string, bg: string, reverse: boolean): FreehandStyle | null {
	if (!isDrawable(tool)) return null;
	return { tool, color: reverse || tool === "eraser" ? bg : fg };
}

function stamp(ctx: CanvasRenderingContext2D, x: number, y: number, { tool, color }: FreehandStyle) {
	ctx.fillStyle = color;
	if (tool === "pencil") {
		ctx.fillRect(x, y, 1, 1);
	} else if (tool === "eraser") {
		ctx.fillRect(Math.ceil(x - ERASER_SIZE / 2), Math.ceil(y - ERASER_SIZE / 2), ERASER_SIZE, ERASER_SIZE);
	} else {
		ctx.beginPath();
		ctx.arc(x + 0.5, y + 0.5, BRUSH_SIZE / 2, 0, Math.PI * 2);
		ctx.fill();
	}
}

export function paintSegment(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, style: FreehandStyle) {
	bresenhamLine(x0, y0, x1, y1, (x, y) => stamp(ctx, x, y, style), style.tool === "brush");
}
