"use client";

import { useCallback, useEffect, useState } from "react";
import { Desktop } from "../desktop/Desktop";
import { Restarting } from "./Restarting";
import { MobileUnsupported, Rsod } from "./Rsod";

type Phase = "unsupported" | "rsod" | "restarting" | "desktop";

function blockTabNavigation(event: globalThis.KeyboardEvent) {
	if (event.key !== "Tab") return;
	event.preventDefault();
	event.stopPropagation();
}

export function Boot() {
	const [phase, setPhase] = useState<Phase>(() => {
		// Boot is client-only. This is a best-effort device gate, not a width limit.
		const { userAgent, maxTouchPoints } = navigator;
		const mobile = /Android|iPhone|iPad|iPod|Mobile|Tablet|Silk/i.test(userAgent)
			// Desktop-mode iPads identify as Macs but still expose multitouch.
			|| (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
		return mobile ? "unsupported" : "rsod";
	});

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
