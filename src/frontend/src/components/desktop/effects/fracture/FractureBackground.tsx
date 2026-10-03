"use client";

import { memo, useEffect, useRef, useState } from "react";
import { runFracture, type FractureController } from "./controller";
import "./fracture.css";

/** Procedural WebGL wallpaper; `active` breaks the screen once the desktop has revealed. */
export const FractureBackground = memo(function FractureBackground({ active }: { active: boolean }) {
	const rootRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const controllerRef = useRef<FractureController | null>(null);
	const activeRef = useRef(active);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		activeRef.current = active;
		controllerRef.current?.setActive(active);
	}, [active]);

	useEffect(() => {
		const root = rootRef.current;
		const canvas = canvasRef.current;
		if (!root || !canvas) return;

		const controller = runFracture(root, canvas, setReady);
		controller.setActive(activeRef.current);
		controllerRef.current = controller;
		return () => {
			controller.destroy();
			controllerRef.current = null;
		};
	}, []);

	return (
		<div className="fracture-viewport">
			<div ref={rootRef} className={ready ? "fracture-background fracture-background--ready" : "fracture-background"} aria-hidden="true">
				<canvas ref={canvasRef} className="fracture-canvas" />
			</div>
		</div>
	);
});
