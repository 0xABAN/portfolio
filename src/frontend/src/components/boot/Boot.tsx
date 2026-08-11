"use client";

import { useCallback, useState } from "react";
import { Desktop } from "../desktop/Desktop";
import { Restarting } from "./Restarting";
import { Rsod } from "./Rsod";

type Phase = "rsod" | "restarting" | "desktop";

export function Boot() {
	const [phase, setPhase] = useState<Phase>("rsod");
	const toRestart = useCallback(() => setPhase("restarting"), []);
	const toDesktop = useCallback(() => setPhase("desktop"), []);

	if (phase === "rsod") return <Rsod onContinueAction={toRestart} />;
	if (phase === "restarting") return <Restarting onDoneAction={toDesktop} />;
	return <Desktop />;
}
