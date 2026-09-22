"use client";

import { useCallback, useEffect, useState } from "react";
import { Desktop } from "../desktop/Desktop";
import { Restarting } from "./Restarting";
import { Rsod } from "./Rsod";

type Phase = "rsod" | "restarting" | "desktop";

function blockTabNavigation(event: globalThis.KeyboardEvent) {
	if (event.key !== "Tab") return;
	event.preventDefault();
	event.stopPropagation();
}

export function Boot() {
	const [phase, setPhase] = useState<Phase>("rsod");

	useEffect(() => {
		window.addEventListener("keydown", blockTabNavigation, true);
		return () => window.removeEventListener("keydown", blockTabNavigation, true);
	}, []);
	const toRestart = useCallback(() => setPhase("restarting"), []);
	const toDesktop = useCallback(() => setPhase("desktop"), []);

	if (phase === "rsod") return <Rsod onContinueAction={toRestart} />;
	if (phase === "restarting") return <Restarting onDoneAction={toDesktop} />;
	return <Desktop />;
}
