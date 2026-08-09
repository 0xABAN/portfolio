import { Taskbar } from "./Taskbar";
import { Window } from "./window/Window";
import "./desktop.css";

export function Desktop() {
	return (
		<div className="desktop">
			<Window title="new age" />
			<Taskbar />
		</div>
	);
}
