import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Desktop } from "../desktop/Desktop";
import { prefetchFracture } from "../desktop/effects";
import "./boot.css";

type Phase = "unsupported" | "rsod" | "restarting" | "desktop";

const BOOT_LOG = String.raw`Award Modular BIOS v4.51PG, An Energy Star Ally
Copyright (C) 1984-95, Award Software, Inc.

PENTIUM-S CPU at 133MHz
Memory Test: 65536K OK

Award Plug and Play BIOS Extension v1.0A
Copyright (C) 1995, Award Software, Inc.
  Detecting HDD Primary Master ...... QUANTUM FIREBALL1280A
  Detecting HDD Primary Slave ....... None
  Detecting HDD Secondary Master .... ATAPI CD-ROM DRIVE
  Detecting HDD Secondary Slave ..... None

ATAPI CD-ROM: CD-ROM DRIVE
PCI device listing ...
  Bus 0  Device 7   Vendor 8086  Device 7010  IDE Controller         IRQ 14
  Bus 0  Device 7   Vendor 8086  Device 7020  Serial Bus Controller  IRQ 11
  Bus 0  Device 17  Vendor 5333  Device 8811  Display Controller     IRQ NA
  Bus 0  Device 19  Vendor 1274  Device 5000  Multimedia Device      IRQ 5
Verifying DMI Pool Data ........
Update Success

Starting MS-DOS...
HIMEM is testing extended memory...done.
C:\>C:\DOS\SMARTDRV.EXE /X
MSCDEX Version 2.25
Copyright (C) Microsoft Corp. 1986-1995. All rights reserved.
  Drive D: = Driver MSCD001 unit 0
Loading device driver C:\WINDOWS\HIMEM.SYS
Loading device driver C:\WINDOWS\IFSHLP.SYS
Loading device driver C:\WINDOWS\SETVER.EXE
Loading C:\WINDOWS\COMMAND\MOUSE.COM
Mouse driver installed
Loading C:\WINDOWS\SYSTEM\VMM32.VXD
Loading C:\WINDOWS\SYSTEM\VXD\IOS.VXD
Loading C:\WINDOWS\SYSTEM\VXD\VFAT.VXD
Loading C:\WINDOWS\SYSTEM\VXD\CDFS.VXD
Loading C:\WINDOWS\SYSTEM\VXD\VREDIR.VXD
Loading C:\WINDOWS\SYSTEM\VXD\VNETSUP.VXD
Loading C:\WINDOWS\SYSTEM\VXD\VCOMM.VXD
Loading C:\WINDOWS\SYSTEM\VXD\VSHARE.VXD
Loading C:\WINDOWS\SYSTEM\KRNL386.EXE
Loading C:\WINDOWS\SYSTEM\GDI.EXE
Loading C:\WINDOWS\SYSTEM\USER.EXE
Loading C:\WINDOWS\SYSTEM\MMSYSTEM.DLL
Loading C:\WINDOWS\SYSTEM\SHELL32.DLL
Loading C:\WINDOWS\SYSTEM\COMMCTRL.DLL
Loading C:\WINDOWS\FONTS\FIXEDSYS.FON
Loading C:\WINDOWS\SYSTEM\KERNEL32.DLL
Loading C:\WINDOWS\SYSTEM\ADVAPI32.DLL
Loading C:\WINDOWS\SYSTEM\WINMM.DLL
Loading C:\WINDOWS\SYSTEM\MSACM32.DLL
Loading C:\WINDOWS\SYSTEM\DDRAW.DLL
Loading C:\WINDOWS\SYSTEM\DSOUND.DLL
Loading C:\WINDOWS\SYSTEM\MPR.DLL
Loading C:\WINDOWS\SYSTEM\WSOCK32.DLL
Loading C:\WINDOWS\SYSTEM\RNAAPP.EXE
Loading C:\WINDOWS\SYSTEM\SYSTRAY.EXE
Loading C:\WINDOWS\SYSTEM\MSGSRV32.EXE
Loading C:\WINDOWS\SYSTEM\MMTASK.TSK
Initializing display adapter ... S3 Trio64V+ (1024x768, 256 colors)
Initializing sound card ... Creative AudioPCI (ES1370)
Initializing network ... Dial-Up Adapter
Restoring desktop settings ...
Loading C:\WINDOWS\EXPLORER.EXE`.split("\n");
const LAST_LINE = "Starting Windows 95...";

const LINE_TONES: [RegExp, string][] = [
	[/^Copyright/, "dim"],
	[/(OK|done\.|Success|installed)$/, "ok"],
	[/^(Award|PENTIUM|Starting)/, "title"],
	[/^\s+(Detecting|Bus|Drive)|^Initializing/, "info"],
	[/^C:\\>/, "command"],
];

function lineClassName(line: string) {
	const tone = LINE_TONES.find(([pattern]) => pattern.test(line))?.[1];
	return tone ? `restarting__line restarting__line--${tone}` : "restarting__line";
}
const RESTART_MS = 900;
const RSOD_MS = 1000;

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
		const timer = window.setTimeout(onContinue, RSOD_MS);
		window.addEventListener("keydown", onContinue);

		return () => {
			window.clearTimeout(timer);
			window.removeEventListener("keydown", onContinue);
		};
	}, [onContinue]);

	return (
		<button type="button" className="rsod" onClick={onContinue}>
			<StopScreen
				body={<>
					A fatal exception 0E has occurred at 0028:C002AD13 in VXD VFAT(01) +<br />
					0000A3D7. The current application will be terminated.
				</>}
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
	const ref = useRef<HTMLDivElement>(null);
	const [lines, setLines] = useState<string[]>([]);
	const [count, setCount] = useState(0);

	useLayoutEffect(() => {
		const style = getComputedStyle(ref.current!);
		const height = ref.current!.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
		const rows = Math.floor(height / parseFloat(style.lineHeight));

		setLines([...BOOT_LOG.slice(0, Math.max(0, rows - 1)), LAST_LINE]);
	}, []);

	useEffect(() => {
		if (!lines.length) return;

		const step = RESTART_MS / (lines.length + 1);
		const showLine = (i: number) => window.setTimeout(() => setCount(i + 1), step * (i + 1));

		const timers = [
			...lines.map((_, i) => showLine(i)),
			window.setTimeout(onDone, RESTART_MS),
		];

		return () => timers.forEach(window.clearTimeout);
	}, [lines, onDone]);

	return (
		<div ref={ref} className="restarting" role="status" aria-live="polite" aria-label="Restarting">
			{lines.slice(0, count).map((line, i) => (
				<p key={i} className={lineClassName(line)}>{line || "\u00a0"}</p>
			))}
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

		const images: string[] = JSON.parse(process.env.PUBLIC_IMAGES!);
		preloads ??= images.map((src) => Object.assign(new Image(), { src }));
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
