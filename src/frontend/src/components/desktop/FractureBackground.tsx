"use client";

import { memo, Fragment, useEffect, useRef, useState } from "react";
import { FRACTURE_DETAILS, FRACTURE_PIECES, type FractureSprite } from "./fractureAssets";
import { spriteFalloff } from "./fractureInteraction";
import { installFractureRenderer } from "./fractureRenderer";

// Match xMidYMid slice: large windows need denser artwork even on a 1× display.
function spriteSizes(sprite: FractureSprite) {
	const width = sprite.width;
	return `max(${width / 16}vw, calc(${width / 10}dvh - ${width * 0.036}px))`;
}

/** Flatten alpha onto white before sibling darken blending selects the strongest coverage. */
function Sprite({ sprite, piece, growth = false, edge = false }: { sprite: FractureSprite; piece?: string; growth?: boolean; edge?: boolean }) {
	return (
		<div className={`fracture-sprite${growth ? " fracture-growth" : ""}${piece ? "" : " fracture-details"}`}
			data-piece={growth ? undefined : piece} data-growth={growth ? piece : undefined}
			style={{ width: sprite.width, height: sprite.height }}>
			{/* Baked decorative assets must bypass image re-encoding. */}
			{/* eslint-disable-next-line @next/next/no-img-element */}
			<img src={sprite.src} srcSet={sprite.srcSet} sizes={spriteSizes(sprite)}
				width={sprite.width} height={sprite.height} alt="" draggable={false} decoding="async"
				style={{ maskImage: edge || growth ? undefined : spriteFalloff(sprite) }}/>
		</div>
	);
}

export const FractureBackground = memo(function FractureBackground({ active }: { active: boolean }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const layerRef = useRef<HTMLDivElement>(null);
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
		if (!root || !layer) return;
		let disposed = false;
		// Decode during boot. Keep the original detailed SVG if any asset cannot load.
		const images = [...root.querySelectorAll<HTMLImageElement>(".fracture-sprite img, .fracture-texture")];
		Promise.all(images.map((image) => image.decode())).then(() => {
			if (disposed) return;
			const controller = installFractureRenderer(root, layer);
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
						<Fragment key={piece.id}>
							<Sprite sprite={piece} piece={piece.id} edge={piece.edge} growth/>
							<Sprite sprite={piece} piece={piece.id} edge={piece.edge}/>
						</Fragment>
					))}
					<Sprite sprite={FRACTURE_DETAILS}/>
				</div>
				{/* eslint-enable @next/next/no-img-element */}
			</div>
		</div>
	);
});
