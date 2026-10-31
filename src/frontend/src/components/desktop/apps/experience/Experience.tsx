"use client";

import { useEffect, useRef, useState } from "react";
import "./experience.css";
import { PspXmb } from "./PspXmb";

const CONSOLE_ART = "/icons/psp.png";

export function Experience({ onClose }: { onClose: () => void }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let disposed = false;
		const images = [...rootRef.current!.querySelectorAll("img")];
		Promise.all(images.map((image) => image.decode())).then(() => {
			if (!disposed) setReady(true);
		}, () => {});
		return () => { disposed = true; };
	}, []);

	const hidden = ready ? undefined : { visibility: "hidden" as const };
	return (
		<div ref={rootRef} className="psp" aria-label="PSP Projects" data-ready={ready || undefined}>
			<div className="psp__screen" style={hidden} inert={!ready}>
				<PspXmb ready={ready} />
			</div>
			<button
				className="psp__quit-button"
				type="button"
				aria-label="Close Experience"
				data-no-window-drag
				onPointerDown={(event) => event.stopPropagation()}
				onClick={onClose}
			/>
			<img className="psp__art" src={CONSOLE_ART} alt="" draggable={false} style={hidden} />
		</div>
	);
}
