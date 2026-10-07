"use client";

import { useEffect, useRef, useState } from "react";
import "./experience.css";
import { CATEGORIES, PspXmb } from "./PspXmb";

const CONSOLE_ART = "/icons/psp.png?v=current";

/** Every image the PSP can show: the console, each category's artwork and every thumbnail. */
const IMAGES = [CONSOLE_ART, ...CATEGORIES.flatMap((category) => [category.artwork, ...category.items.map((item) => item.src)])]
	.filter((src): src is string => Boolean(src));

let preloads: HTMLImageElement[] | null = null;

/**
 * Starts downloading the PSP's images, so it can appear soon after it opens.
 * Call it when a launch begins; the launch's wait then covers the download.
 */
export function preloadExperience() {
	preloads ??= IMAGES.map((src) => Object.assign(new Image(), { src }));
}

export function Experience({ onClose }: { onClose: () => void }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [ready, setReady] = useState(false);

	// The console and its screen appear together, once every image on them is decoded.
	// If one fails, neither appears: never show half a PSP.
	useEffect(() => {
		let disposed = false;
		const images = [...rootRef.current!.querySelectorAll("img")];
		Promise.all(images.map((image) => image.decode())).then(() => {
			if (!disposed) setReady(true);
		}, () => {});
		return () => { disposed = true; };
	}, []);

	// Hidden rather than unmounted, so the images keep loading and the layout stays put.
	const hidden = ready ? undefined : { visibility: "hidden" as const };
	return (
		<div ref={rootRef} className="psp" aria-label="PSP Projects">
			<div className="psp__screen" style={hidden} inert={!ready}>
				<PspXmb ready={ready} />
			</div>
			{/* Invisible over the artwork's HOME button, so it closes the PSP even if the artwork fails. */}
			<button
				className="psp__home-button"
				type="button"
				aria-label="Close Experience"
				data-no-window-drag
				onPointerDown={(event) => event.stopPropagation()}
				onClick={onClose}
			/>
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img className="psp__art" src={CONSOLE_ART} alt="" draggable={false} style={hidden} />
		</div>
	);
}
