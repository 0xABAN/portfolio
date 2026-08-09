import type { ReactNode } from "react";
import { WindowControls } from "./WindowControls";

type Props = {
	title: string;
	icon?: ReactNode;
	onClose?: () => void;
};

export function TitleBar({ title, icon, onClose }: Props) {
	return (
		<header className="win-titlebar">
			<div className="win-titlebar__label">
				{icon ? <span className="win-titlebar__icon">{icon}</span> : null}
				<span className="win-titlebar__text">{title}</span>
			</div>
			<WindowControls onClose={onClose} />
		</header>
	);
}
