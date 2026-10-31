"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Desktop } from "../desktop/Desktop";
import { prefetchFracture } from "../desktop/effects";
import "./boot.css";

type Phase = "unsupported" | "rsod" | "restarting" | "desktop";

const RESTART_LINES = ["ATAPI CD-ROM: CD-ROM DRIVE", "Memory Test: 65536K OK", "", "Starting Windows 95..."];
const RESTART_MS = 900;

let preloads: HTMLImageElement[] | undefined;

function blockTabNavigation(event: globalThis.KeyboardEvent) {
	if (event.key !== "Tab") return;
	event.preventDefault();
	event.stopPropagation();
}

function StopScreen({ body, items, prompt }: { body: ReactNode; items: ReactNode[]; prompt: string }) {
	return (
		<div className="rsod__inner">
			<span className="rsod__badge">Windows</span>
			<p className="rsod__body">{body}</p>
			<ul className="rsod__list">
				{items.map((item, i) => <li key={i}>{item}</li>)}
			</ul>
			<p className="rsod__prompt">{prompt}</p>
		</div>
	);
}

function Rsod({ onContinue }: { onContinue: () => void }) {
	useEffect(() => {
		window.addEventListener("keydown", onContinue);
		return () => window.removeEventListener("keydown", onContinue);
	}, [onContinue]);

	return (
		<button type="button" className="rsod" onClick={onContinue}>
			<StopScreen
				body={<>A fatal exception 0E has occurred at 0028:C002AD13 in VXD VFAT(01) +<br />0000A3D7. The current application will be terminated.</>}
				items={[
					"Press any key to terminate the current application.",
					<>Press CTRL+ALT+DEL again to restart your computer. You will<br />lose any unsaved information in all applications.</>,
				]}
				prompt="Press any key to continue"
			/>
		</button>
	);
}

function Restarting({ onDone }: { onDone: () => void }) {
	const [count, setCount] = useState(0);

	useEffect(() => {
		const step = RESTART_MS / (RESTART_LINES.length + 1);
		const timers = [
			...RESTART_LINES.map((_, i) => window.setTimeout(() => setCount(i + 1), step * (i + 1))),
			window.setTimeout(onDone, RESTART_MS),
		];
		return () => timers.forEach(window.clearTimeout);
	}, [onDone]);

	return (
		<div className="restarting" role="status" aria-live="polite" aria-label="Restarting">
			{RESTART_LINES.slice(0, count).map((line, i) => <p key={i} className="restarting__line">{line || "\u00a0"}</p>)}
		</div>
	);
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

	if (phase === "unsupported") {
		return (
			<main className="rsod" aria-label="Mobile device not supported">
				<StopScreen
					body="A compatibility error has occurred. This website is not compatible with mobile devices."
					items={["Open this page on a desktop or laptop computer."]}
					prompt="Session terminated."
				/>
			</main>
		);
	}
	if (phase === "rsod") return <Rsod onContinue={toRestart} />;
	if (phase === "restarting") return <Restarting onDone={toDesktop} />;
	return <Desktop />;
}
