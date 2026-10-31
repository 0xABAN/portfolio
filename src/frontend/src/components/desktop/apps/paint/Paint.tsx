"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { MENUS, PALETTE, TOOLS, UNDO_LIMIT, isDrawable, paintSegment, resolveStrokeStyle, type FreehandStyle, type ToolId } from "./paintModel";
import "./paint.css";

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
