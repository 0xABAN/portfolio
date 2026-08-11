"use client";

import { useRef, type PointerEvent } from "react";
import type { Track } from "./playlist";
import "./window/window.css";
import "./cd-player.css";

type Props = {
	track: Track;
	playing: boolean;
	left: number;
	top: number;
	bottom: number;
	docked: boolean;
	volume: number;
	onTogglePlayAction: () => void;
	onPrevAction: () => void;
	onNextAction: () => void;
	onVolumeAction: (v: number) => void;
	onStopAction: () => void;
	onMoveAction: (left: number, top: number) => void;
	onDragStartAction?: () => void;
	onDragEndAction?: () => void;
};

function Field({
	label,
	value,
	onPrev,
	onNext,
}: {
	label: string;
	value: string;
	onPrev: () => void;
	onNext: () => void;
}) {
	return (
		<div className="cd-pop__field">
			<span className="cd-pop__label">{label}</span>
			<div className="cd-pop__combo">
				<div className="cd-pop__combo-face chrome-sunken" title={value}>
					{value}
				</div>
				<div className="cd-pop__spin">
					<button
						type="button"
						className="cd-pop__spin-btn chrome-raised"
						aria-label="Previous track"
						onClick={onPrev}
					>
						<span className="cd-pop__spin-ico cd-pop__spin-ico--up" />
					</button>
					<button
						type="button"
						className="cd-pop__spin-btn chrome-raised"
						aria-label="Next track"
						onClick={onNext}
					>
						<span className="cd-pop__spin-ico cd-pop__spin-ico--down" />
					</button>
				</div>
			</div>
		</div>
	);
}

export function CdPlayerPop({
	track,
	playing,
	left,
	top,
	bottom,
	docked,
	volume,
	onTogglePlayAction,
	onPrevAction,
	onNextAction,
	onVolumeAction,
	onStopAction,
	onMoveAction,
	onDragStartAction,
	onDragEndAction,
}: Props) {
	const rootRef = useRef<HTMLDivElement>(null);
	const drag = useRef<{
		px: number;
		py: number;
		ol: number;
		ot: number;
	} | null>(null);

	function onTitleDown(e: PointerEvent<HTMLElement>) {
		e.currentTarget.setPointerCapture(e.pointerId);
		const el = rootRef.current;
		const ol = el?.offsetLeft ?? left;
		const ot = el?.offsetTop ?? top;
		drag.current = { px: e.clientX, py: e.clientY, ol, ot };
		if (el) {
			el.style.bottom = "auto";
			el.style.left = `${ol}px`;
			el.style.top = `${ot}px`;
		}
		onDragStartAction?.();
	}

	function onTitleMove(e: PointerEvent<HTMLElement>) {
		const d = drag.current;
		const el = rootRef.current;
		if (!d || !el) return;
		el.style.left = `${d.ol + (e.clientX - d.px)}px`;
		el.style.top = `${d.ot + (e.clientY - d.py)}px`;
	}

	function onTitleUp(e: PointerEvent<HTMLElement>) {
		const d = drag.current;
		if (!d) return;
		drag.current = null;
		if (e.currentTarget.hasPointerCapture(e.pointerId)) {
			e.currentTarget.releasePointerCapture(e.pointerId);
		}
		const el = rootRef.current;
		onMoveAction(
			el?.offsetLeft ?? d.ol + (e.clientX - d.px),
			el?.offsetTop ?? d.ot + (e.clientY - d.py),
		);
		onDragEndAction?.();
	}

	const transport: [string, () => void, string][] = [
		["Previous track", onPrevAction, "prev"],
		["Next track", onNextAction, "next"],
		[playing ? "Pause" : "Play", onTogglePlayAction, playing ? "pause" : "play"],
		["Stop", onStopAction, "stop"],
	];

	return (
		<div
			ref={rootRef}
			className="cd-pop win"
			role="dialog"
			aria-label="CD Player"
			style={
				docked ? { left, bottom, top: "auto" } : { left, top, bottom: "auto" }
			}
		>
			<header
				className="win-titlebar"
				onPointerDown={onTitleDown}
				onPointerMove={onTitleMove}
				onPointerUp={onTitleUp}
				onPointerCancel={onTitleUp}
			>
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					className="win-titlebar__icon"
					src="/icons/cd.png"
					alt=""
					width={16}
					height={16}
					draggable={false}
				/>
				<span className="win-titlebar__text">CD Player</span>
			</header>

			<div className="cd-pop__body">
				<div className="cd-pop__row">
					<div className="cd-pop__art chrome-sunken" aria-hidden>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={track.cover} alt="" draggable={false} />
					</div>

					<div className="cd-pop__fields">
						<Field
							label="Artist:"
							value={track.artist}
							onPrev={onPrevAction}
							onNext={onNextAction}
						/>
						<Field
							label="Track:"
							value={track.title}
							onPrev={onPrevAction}
							onNext={onNextAction}
						/>

						<div
							className="cd-pop__transport"
							role="toolbar"
							aria-label="Playback"
						>
							{transport.map(([label, onClick, glyph], i) => (
								<button
									key={i}
									type="button"
									className="cd-pop__tbtn chrome-raised"
									aria-label={label}
									onClick={onClick}
								>
									<span className={`cd-pop__glyph cd-pop__glyph--${glyph}`} />
								</button>
							))}
						</div>

						<label className="cd-pop__vol">
							<span className="cd-pop__vol-label">Volume:</span>
							<input
								className="cd-pop__trackbar"
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={volume}
								aria-label="Volume"
								onChange={(e) => onVolumeAction(Number(e.target.value))}
							/>
						</label>
					</div>
				</div>
			</div>
		</div>
	);
}
