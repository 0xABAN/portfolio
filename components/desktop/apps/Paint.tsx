import { useEffect, useRef, useState, type RefObject } from "react";
import "./paint.css";

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

type Options = {
	src: string;
	active: boolean;
	tool: ToolId;
	fg: string;
	bg: string;
	coordsEl: RefObject<HTMLElement | null>;
};

function usePaintCanvas(options: Options) {
	const { src } = options;
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const latest = useRef(options);

	useEffect(() => {
		latest.current = options;
	});

	useEffect(() => {
		const canvas = canvasRef.current!;
		const wrap = wrapRef.current!;
		const undo: ImageData[] = [];
		let ctx: CanvasRenderingContext2D | null = null;
		let base: HTMLImageElement | null | undefined;
		let rect = canvas.getBoundingClientRect();
		let stroke: { x: number; y: number; style: FreehandStyle } | null = null;
		let coords = "";

		function initialize() {
			const width = Math.round(wrap.clientWidth);
			const height = Math.round(wrap.clientHeight);
			if (ctx || base === undefined || width < 2 || height < 2) return;
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext("2d")!;
			context.imageSmoothingEnabled = false;
			if (base) {
				context.drawImage(base, 0, 0, width, height);
			} else {
				context.fillStyle = "#ffffff";
				context.fillRect(0, 0, width, height);
			}
			ctx = context;
		}

		function pixel(event: PointerEvent) {
			const clamp = (value: number, size: number) => Math.max(0, Math.min(size - 1, Math.floor(value)));
			return {
				x: clamp(((event.clientX - rect.left) * canvas.width) / rect.width, canvas.width),
				y: clamp(((event.clientY - rect.top) * canvas.height) / rect.height, canvas.height),
			};
		}

		function showCoords(text: string) {
			if (text === coords) return;
			coords = text;
			const el = latest.current.coordsEl.current;
			if (el) el.textContent = text;
		}

		function onPointerDown(event: PointerEvent) {
			if (!ctx || (event.button !== 0 && event.button !== 2)) return;
			const { tool, fg, bg } = latest.current;
			const style = resolveStrokeStyle(tool, fg, bg, event.button === 2);
			if (!style) return;

			event.preventDefault();
			canvas.focus({ preventScroll: true });
			rect = canvas.getBoundingClientRect();
			canvas.setPointerCapture(event.pointerId);
			undo.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
			if (undo.length > UNDO_LIMIT) undo.shift();

			const { x, y } = pixel(event);
			paintSegment(ctx, x, y, x, y, style);
			stroke = { x, y, style };
			showCoords(`${x}, ${y}`);
		}

		function onPointerMove(event: PointerEvent) {
			const { x, y } = pixel(event);
			showCoords(`${x}, ${y}`);
			if (!ctx || !stroke || (x === stroke.x && y === stroke.y)) return;
			paintSegment(ctx, stroke.x, stroke.y, x, y, stroke.style);
			stroke.x = x;
			stroke.y = y;
		}

		function onPointerUp(event: PointerEvent) {
			if (!stroke) return;
			stroke = null;
			if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
		}

		function onKeyDown(event: KeyboardEvent) {
			if (!latest.current.active || !canvas.closest(".win")?.contains(document.activeElement)) return;
			if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.key.toLowerCase() !== "z") return;
			const target = event.target as HTMLElement;
			if (target.isContentEditable || target.matches("input, textarea")) return;
			event.preventDefault();
			const snapshot = undo.pop();
			if (ctx && snapshot && !stroke) ctx.putImageData(snapshot, 0, 0);
		}

		const image = new Image();
		image.decoding = "async";
		image.onload = () => { base = image; initialize(); };
		image.onerror = () => { base = null; initialize(); };
		image.src = src;

		const observer = new ResizeObserver(() => {
			rect = canvas.getBoundingClientRect();
			initialize();
		});
		observer.observe(wrap);

		const listeners = new AbortController();
		const signal = listeners.signal;
		canvas.addEventListener("pointerdown", onPointerDown, { signal });
		canvas.addEventListener("pointermove", onPointerMove, { signal });
		canvas.addEventListener("pointerup", onPointerUp, { signal });
		canvas.addEventListener("pointercancel", onPointerUp, { signal });
		canvas.addEventListener("pointerleave", () => { if (!stroke) showCoords(""); }, { signal });
		canvas.addEventListener("contextmenu", (event) => event.preventDefault(), { signal });
		window.addEventListener("keydown", onKeyDown, { signal });
		window.addEventListener("resize", () => { rect = canvas.getBoundingClientRect(); }, { signal });

		return () => {
			image.onload = image.onerror = null;
			observer.disconnect();
			listeners.abort();
		};
	}, [src]);

	return { canvasRef, wrapRef };
}

export function Paint({ src, active }: { src: string; active: boolean }) {
	const [tool, setTool] = useState<ToolId>("pencil");
	const [fg, setFg] = useState<string>(PALETTE[0]);
	const [bg, setBg] = useState<string>(PALETTE[14]);
	const coordsRef = useRef<HTMLSpanElement>(null);

	const { canvasRef, wrapRef } = usePaintCanvas({ src, active, tool, fg, bg, coordsEl: coordsRef });

	return (
		<div className="paint">
			<div className="paint__menu" role="menubar" aria-label="Paint menu">
				{MENUS.map((m) => (
					<span key={m} className="paint__menu-item" role="menuitem">
						<span className="paint__menu-hot">{m[0]}</span>
						{m.slice(1)}
					</span>
				))}
			</div>

			<div className="paint__main">
				<div className="paint__tools-col">
					<div className="paint__tools" role="toolbar" aria-label="Tools">
						{TOOLS.map((t, i) => {
							const drawable = isDrawable(t.id);
							const selected = tool === t.id;
							return (
								<button
									key={t.id}
									type="button"
									className={`paint__tool${selected ? " paint__tool--selected paint-dither" : ""}`}
									title={t.name}
									aria-label={t.name}
									aria-pressed={selected}
									aria-disabled={!drawable}
									onClick={() => {
										if (drawable) setTool(t.id);
									}}
								>
									<span
										className="paint__tool-icon"
										style={{ ["--icon-index" as string]: i }}
									/>
								</button>
							);
						})}
					</div>
				</div>

				<div ref={wrapRef} className="paint__canvas-wrap paint__sunken">
					<canvas ref={canvasRef} className="paint__canvas" tabIndex={0} aria-label="Paint canvas" />
				</div>
			</div>

			<div className="paint__colors" aria-label="Colors">
				<div className="paint__current paint-dither" aria-hidden>
					<span
						className="paint__swatch paint__swatch--bg paint__sunken"
						style={{ background: bg }}
					/>
					<span
						className="paint__swatch paint__swatch--fg paint__sunken"
						style={{ background: fg }}
					/>
				</div>
				<div className="paint__palette">
					{PALETTE.map((c) => (
						<button
							key={c}
							type="button"
							className="paint__color paint__sunken"
							style={{ background: c }}
							aria-label={c}
							onClick={() => setFg(c)}
							onContextMenu={(e) => {
								e.preventDefault();
								setBg(c);
							}}
						/>
					))}
				</div>
			</div>

			<div className="paint__status" role="status">
				<span className="paint__status-text paint__sunken">
					For Help, click Help Topics on the Help Menu.
				</span>
				<span ref={coordsRef} className="paint__status-coords paint__sunken" />
			</div>
		</div>
	);
}
