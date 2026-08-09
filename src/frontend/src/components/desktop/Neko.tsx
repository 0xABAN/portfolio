"use client";

import { useEffect, useRef } from "react";
import { runNeko } from "./nekoLogic";
import "./neko.css";

const SHEET = "/neko.png";

export function Neko() {
	const elRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = elRef.current;
		if (!el) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			el.hidden = true;
			return;
		}
		return runNeko(el, SHEET);
	}, []);

	return <div ref={elRef} className="neko" aria-hidden />;
}
