"use client";

import { memo, useEffect, useRef, useState } from "react";
import { runFracture } from "./controller";
import "./fracture.css";

/**
 * Procedural WebGL wallpaper; the screen breaks as soon as it mounts.
 * `onReadyAction` follows whether the fracture is on screen: true after its
 * first frame, false again if the WebGL context is lost or fails.
 */
export const FractureBackground = memo(function FractureBackground({ onReadyAction }: { onReadyAction: (ready: boolean) => void }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const [ready, setReady] = useState(false);

	useEffect(() => onReadyAction(ready), [ready, onReadyAction]);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;

		// The controller supplies the canvas, so its shaders can compile before this mounts.
		const controller = runFracture(root, setReady);
		return () => controller.destroy();
	}, []);

	return (
		<div className="fracture-viewport">
			<div ref={rootRef} className={ready ? "fracture-background fracture-background--ready" : "fracture-background"} aria-hidden="true" />
		</div>
	);
});
