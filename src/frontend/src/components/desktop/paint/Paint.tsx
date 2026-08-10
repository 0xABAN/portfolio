"use client";

import { useState } from "react";
import {
	DEFAULT_SIZE_INDEX,
	DRAWABLE_TOOLS,
	MENUS,
	PALETTE,
	SIZE_DOT,
	TOOLS,
	type Coords,
	type SizeIndex,
	type ToolId,
} from "./paintModel";
import { usePaintCanvas } from "./usePaintCanvas";
import "./paint.css";

type Props = {
	src: string;
};

export function Paint({ src }: Props) {
	const [tool, setTool] = useState<ToolId>("pencil");
	const [fg, setFg] = useState<string>(PALETTE[0]);
	const [bg, setBg] = useState<string>(PALETTE[14]);
	const [sizeIndex, setSizeIndex] = useState<SizeIndex>(DEFAULT_SIZE_INDEX);
	const [coords, setCoords] = useState<Coords | null>(null);

	const { canvasRef, wrapRef } = usePaintCanvas({
		src,
		tool,
		fg,
		bg,
		sizeIndex,
		onCoordsAction: setCoords,
	});

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
							const drawable = DRAWABLE_TOOLS.has(t.id);
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
					<div className="paint__tool-options" role="group" aria-label="Size">
						{SIZE_DOT.map((cls, idx) => (
							<button
								key={cls}
								type="button"
								className={`paint__pen-dot paint__pen-dot--${cls}${sizeIndex === idx ? " paint__pen-dot--on" : ""}`}
								aria-label={`Size ${idx + 1}`}
								aria-pressed={sizeIndex === idx}
								onClick={() => setSizeIndex(idx as SizeIndex)}
							/>
						))}
					</div>
				</div>

				<div ref={wrapRef} className="paint__canvas-wrap paint__sunken">
					<canvas ref={canvasRef} className="paint__canvas" />
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
				<span className="paint__status-coords paint__sunken">
					{coords ? `${coords.x}, ${coords.y}` : ""}
				</span>
			</div>
		</div>
	);
}
