"use client";

import "./experience.css";
import { PspXmb } from "./PspXmb";

export function Experience({ onClose }: { onClose: () => void }) {
	return (
		<div className="psp" aria-label="PSP Projects">
			<div className="psp__screen">
				<PspXmb />
			</div>
			<button
				className="psp__home-button"
				type="button"
				aria-label="Close Experience"
				data-no-window-drag
				onPointerDown={(event) => event.stopPropagation()}
				onClick={onClose}
			/>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className="psp__art" src="/icons/psp.png?v=current" alt="" draggable={false} />
		</div>
	);
}
