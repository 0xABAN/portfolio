import { StartButton } from "./StartButton";

export function Taskbar() {
	return (
		<footer className="taskbar" role="contentinfo" aria-label="Taskbar">
			<div className="taskbar__left">
				<StartButton />
			</div>
			<div className="taskbar__tray chrome-sunken" aria-label="System tray">
				<span className="taskbar__clock">4:20 PM</span>
			</div>
		</footer>
	);
}
