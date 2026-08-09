import type { CSSProperties, ReactNode } from "react";
import { TitleBar } from "./TitleBar";
import "./window.css";

type Props = {
	title: string;
	icon?: ReactNode;
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	onClose?: () => void;
	children?: ReactNode;
};

export function Window({
	title,
	icon,
	x = 80,
	y = 64,
	width = 420,
	height = 280,
	onClose,
	children,
}: Props) {
	const style = {
		"--win-x": `${x}px`,
		"--win-y": `${y}px`,
		"--win-w": `${width}px`,
		"--win-h": `${height}px`,
	} as CSSProperties;

	return (
		<section className="win" style={style} aria-label={title}>
			<TitleBar title={title} icon={icon} onClose={onClose} />
			<div className="win__client">{children}</div>
		</section>
	);
}
