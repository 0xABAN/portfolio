"use client";

import { useCallback, useEffect, useState } from "react";
import { Desktop } from "../desktop/Desktop";
import { prefetchFracture } from "../desktop/effects/fracture/FractureBackground";
import { Restarting } from "./Restarting";
import { MobileUnsupported, Rsod } from "./Rsod";

type Phase = "unsupported" | "rsod" | "restarting" | "desktop";

let preloads: HTMLImageElement[] | undefined;

function blockTabNavigation(event: globalThis.KeyboardEvent) {
	if (event.key !== "Tab") return;
	event.preventDefault();
	event.stopPropagation();
}

export function Boot() {
	const [phase, setPhase] = useState<Phase>(() => {
		const { userAgent, maxTouchPoints } = navigator;
		const mobile = /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk/i.test(userAgent)
			|| (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
		return mobile ? "unsupported" : "rsod";
	});

	useEffect(() => {
		if (phase !== "rsod") return;
		prefetchFracture();
		preloads ??= JSON.parse(process.env.PUBLIC_IMAGES!).map((src: string) => Object.assign(new Image(), { src }));
	}, [phase]);

	useEffect(() => {
		window.addEventListener("keydown", blockTabNavigation, true);
		return () => window.removeEventListener("keydown", blockTabNavigation, true);
	}, []);
	const toRestart = useCallback(() => setPhase("restarting"), []);
	const toDesktop = useCallback(() => setPhase("desktop"), []);

	if (phase === "unsupported") return <MobileUnsupported />;
	if (phase === "rsod") return <Rsod onContinueAction={toRestart} />;
	if (phase === "restarting") return <Restarting onDoneAction={toDesktop} />;
	return <Desktop />;
}
