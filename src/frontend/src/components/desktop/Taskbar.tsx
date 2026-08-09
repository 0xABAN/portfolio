import { StartButton } from "./StartButton";
import { GITHUB_URL, GITHUB_USER } from "./windows";

const LINKS = [
	{
		id: "github",
		label: "GitHub",
		href: GITHUB_URL,
		icon: "/icons/github.svg",
	},
	{
		id: "x",
		label: "X",
		href: `https://x.com/${GITHUB_USER}`,
		icon: "/icons/x.svg",
	},
	{
		id: "spotify",
		label: "Spotify",
		href: "https://open.spotify.com/user/31bqqior62rs6m4rewpadlcws2oa",
		icon: "/icons/spotify.svg",
	},
] as const;

function openExternal(href: string) {
	window.open(href, "_blank", "noopener,noreferrer");
}

export function Taskbar() {
	return (
		<footer className="taskbar" role="contentinfo" aria-label="Taskbar">
			<div className="taskbar__left">
				<StartButton />
				<div className="taskbar__tasks">
					{LINKS.map((link) => (
						<button
							key={link.id}
							type="button"
							className="task-btn chrome-raised"
							title={link.label}
							onClick={() => openExternal(link.href)}
						>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								className="task-btn__icon"
								src={link.icon}
								alt=""
								width={16}
								height={16}
								draggable={false}
							/>
							<span className="task-btn__label">{link.label}</span>
						</button>
					))}
				</div>
			</div>
			<div className="taskbar__tray chrome-sunken" aria-label="System tray">
				<span className="taskbar__clock">4:20 PM</span>
			</div>
		</footer>
	);
}
