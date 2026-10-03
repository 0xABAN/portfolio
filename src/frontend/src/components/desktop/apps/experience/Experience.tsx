"use client";

import { useEffect, useRef, useState } from "react";
import "./experience.css";
import { PspXmb } from "./PspXmb";

export function Experience({ onClose }: { onClose: () => void }) {
	const artRef = useRef<HTMLImageElement>(null);
	const [artReady, setArtReady] = useState(false);

	useEffect(() => {
		let disposed = false;
		artRef.current?.decode().then(() => {
			if (!disposed) setArtReady(true);
		}).catch(() => { /* Never expose the screen without its console artwork. */ });
		return () => { disposed = true; };
	}, []);

	return (
		<div className="psp" aria-label="PSP Projects">
			{/* Keep assets preloading and layout stable while the console decodes. */}
			<div className="psp__screen" style={{ visibility: artReady ? undefined : "hidden" }} inert={!artReady}>
				<PspXmb ready={artReady} />
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
			<img ref={artRef} className="psp__art" src="/icons/psp.png?v=current" alt="" draggable={false} />
		</div>
	);
}
