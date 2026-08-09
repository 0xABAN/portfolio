import { WindowsLogo } from "./WindowsLogo";

export function StartButton() {
	return (
		<button
			type="button"
			className="start-btn chrome-raised"
			aria-label="Start"
		>
			<WindowsLogo className="start-btn__logo" />
			<span className="start-btn__label">Start</span>
		</button>
	);
}
