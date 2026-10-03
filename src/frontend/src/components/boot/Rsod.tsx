"use client";

import { useCallback, useEffect, useRef } from "react";
import "./rsod.css";

/** A real stop screen: no button semantics or continue/restart handlers. */
export function MobileUnsupported() {
	return (
		<main className="rsod" aria-label="Mobile device not supported">
			<div className="rsod__inner">
				<span className="rsod__badge">Windows</span>
				<p className="rsod__body">
					A compatibility error has occurred. This website is not compatible
					with mobile devices.
				</p>
				<ul className="rsod__list">
					<li>Open this page on a desktop or laptop computer.</li>
				</ul>
				<p className="rsod__prompt">Session terminated.</p>
			</div>
		</main>
	);
}

type Props = {
	onContinueAction: () => void;
};

export function Rsod({ onContinueAction }: Props) {
	const done = useRef(false);
	const go = useCallback(() => {
		if (done.current) return;
		done.current = true;
		onContinueAction();
	}, [onContinueAction]);

	useEffect(() => {
		window.addEventListener("keydown", go);
		return () => window.removeEventListener("keydown", go);
	}, [go]);

	return (
		<button type="button" className="rsod" onClick={go}>
			<div className="rsod__inner">
				<span className="rsod__badge">Windows</span>
				<p className="rsod__body">
					A fatal exception 0E has occurred at 0028:C002AD13 in VXD VFAT(01) +
					<br />
					0000A3D7. The current application will be terminated.
				</p>
				<ul className="rsod__list">
					<li>Press any key to terminate the current application.</li>
					<li>
						Press CTRL+ALT+DEL again to restart your computer. You will
						<br />
						lose any unsaved information in all applications.
					</li>
				</ul>
				<p className="rsod__prompt">Press any key to continue</p>
			</div>
		</button>
	);
}
