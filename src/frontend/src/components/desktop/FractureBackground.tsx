"use client";

import { useEffect, useRef, useState } from "react";
import { FRACTURE_DETAILS, FRACTURE_PIECES, type FractureSprite } from "./fractureAssets";
import { installFractureRenderer } from "./fractureRenderer";

// Match xMidYMid slice: large windows need denser artwork even on a 1× display.
function spriteSizes(sprite: FractureSprite) {
	const width = sprite.width;
	return `max(${width / 16}vw, calc(${width / 10}dvh - ${width * 0.036}px))`;
}

export function FractureBackground({ active }: { active: boolean }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const layerRef = useRef<HTMLDivElement>(null);
	const overlayRef = useRef<SVGSVGElement>(null);
	const controllerRef = useRef<ReturnType<typeof installFractureRenderer> | null>(null);
	const activeRef = useRef(active);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		activeRef.current = active;
		controllerRef.current?.setActive(active);
	}, [active]);

	useEffect(() => {
		const root = rootRef.current;
		const layer = layerRef.current;
		const overlay = overlayRef.current;
		if (!root || !layer || !overlay) return;
		let disposed = false;
		// Decode during boot. Keep the original detailed SVG if any asset cannot load.
		const images = [...root.querySelectorAll<HTMLImageElement>(".fracture-sprite, .fracture-texture")];
		Promise.all(images.map((image) => image.decode())).then(() => {
			if (disposed) return;
			const controller = installFractureRenderer(root, layer, overlay);
			controllerRef.current = controller;
			controller.setActive(activeRef.current);
			setReady(true);
		}).catch(() => { /* Static artwork remains visible without an animation dependency. */ });
		return () => {
			disposed = true;
			controllerRef.current?.destroy();
			controllerRef.current = null;
		};
	}, []);

	return (
		<div className="fracture-viewport">
			<div ref={rootRef} className={`fracture-background${ready ? " fracture-background--ready" : ""}`} aria-hidden="true">
				{/* These pre-rendered decorative assets must bypass image re-encoding. */}
				{/* eslint-disable @next/next/no-img-element */}
				<img className="fracture-fallback" src="/fracture/artwork.svg" alt="" draggable={false}/>
				<img className="fracture-texture" src="/fracture/texture.svg" alt="" draggable={false}/>
				<div ref={layerRef} className="fracture-layer">
					{FRACTURE_PIECES.map((piece) => (
						<img key={piece.id} className="fracture-sprite" data-piece={piece.id}
							src={piece.src} srcSet={piece.srcSet} sizes={spriteSizes(piece)} width={piece.width} height={piece.height}
							alt="" draggable={false} decoding="async"/>
					))}
					<img className="fracture-sprite fracture-details" src={FRACTURE_DETAILS.src} srcSet={FRACTURE_DETAILS.srcSet}
						sizes={spriteSizes(FRACTURE_DETAILS)} width={FRACTURE_DETAILS.width} height={FRACTURE_DETAILS.height} alt="" draggable={false} decoding="async"/>
				</div>
				{/* eslint-enable @next/next/no-img-element */}
				<svg ref={overlayRef} className="fracture-overlay" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" focusable="false">
					<defs>
						<radialGradient id="falloff">
							<stop offset="0" stopColor="white"/>
							<stop offset=".08" stopColor="white"/>
							<stop offset=".48" stopColor="white" stopOpacity=".9"/>
							<stop offset=".82" stopColor="white" stopOpacity=".5"/>
							<stop offset="1" stopColor="white" stopOpacity="0"/>
						</radialGradient>
						<mask id="screen" maskUnits="userSpaceOnUse" x="0" y="0" width="1600" height="1000">
							<ellipse cx="800" cy="500" rx="950" ry="660" fill="url(#falloff)"/>
						</mask>
					</defs>
				</svg>
			</div>
		</div>
	);
}
