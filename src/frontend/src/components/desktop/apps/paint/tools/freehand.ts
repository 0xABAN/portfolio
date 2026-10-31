import { isDrawable, type DrawableTool, type ToolId } from "../paintModel";
import { bresenhamLine } from "./bresenham";

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
