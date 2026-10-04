"use client";

import { memo, useEffect, useRef, useState } from "react";
import { runFracture, type FractureRendering } from "./controller";
import "./fracture.css";

export type { FractureRendering };

/**
 * Procedural WebGL wallpaper; the screen breaks as soon as it mounts.
 * `onRenderingAction` follows how the fracture is on screen: "none" until its
 * first frame and again if the WebGL context is lost or fails, otherwise
 * whether it animates or this device is too slow and it holds still.
 */
export const FractureBackground = memo(function FractureBackground({ onRenderingAction }: { onRenderingAction: (rendering: FractureRendering) => void }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [rendering, setRendering] = useState<FractureRendering>("none");

	useEffect(() => onRenderingAction(rendering), [rendering, onRenderingAction]);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;

		// The controller supplies the canvas, so its shaders can compile before this mounts.
		const controller = runFracture(root, setRendering);
		return () => controller.destroy();
	}, []);

	const ready = rendering !== "none";
	return (
		<div className="fracture-viewport">
			<div ref={rootRef} className={ready ? "fracture-background fracture-background--ready" : "fracture-background"} aria-hidden="true" />
		</div>
	);
});
