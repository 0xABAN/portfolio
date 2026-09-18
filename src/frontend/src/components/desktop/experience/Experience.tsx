"use client";

import "./experience.css";

export function Experience() {
	return (
		<div className="psp" aria-label="PSP Projects">
			<div className="psp__screen" aria-hidden="true" />
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className="psp__art" src="/icons/psp.png" alt="" draggable={false} />
		</div>
	);
}
