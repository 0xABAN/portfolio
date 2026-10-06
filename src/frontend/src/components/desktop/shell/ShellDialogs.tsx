"use client";

import { useEffect, useId, useRef } from "react";
import { useShell } from "../files/ShellProvider";

/** The shell's modal message: a notice with OK, or a question with Yes and No. */
export function ShellDialogs() {
	const shell = useShell();
	const dialog = shell.dialog;
	return dialog && <MessageDialog {...dialog} onClose={shell.closeDialog} />;
}

function MessageDialog({ title, message, accept, onClose }: { title: string; message: string; accept?: () => void; onClose: () => void }) {
	const ref = useRef<HTMLDialogElement>(null);
	const titleId = useId();

	useEffect(() => {
		const dialog = ref.current!;
		const previous = document.activeElement as HTMLElement | null;
		const surface = previous?.closest<HTMLElement>("[data-shell-surface]");
		dialog.showModal();
		return () => {
			dialog.close();
			// React removes the dialog before passive cleanup; native focus restoration
			// alone would leave keyboard users on <body> after Cancel.
			const target = previous?.isConnected ? previous : surface?.querySelector<HTMLElement>("[data-shell-item]");
			target?.focus({ preventScroll: true });
		};
	}, []);

	return <dialog ref={ref} className="shell-dialog chrome-raised" aria-labelledby={titleId} data-shell-surface=""
		onCancel={(event) => { event.preventDefault(); onClose(); }}>
		<header className="win-titlebar"><span id={titleId} className="win-titlebar__text">{title}</span>
			<button type="button" className="win-min win-close chrome-raised" aria-label={`Close ${title}`} onClick={onClose}>×</button>
		</header>
		<div className="shell-dialog__message"><span className="shell-dialog__symbol" aria-hidden="true">{accept ? "?" : "!"}</span><p>{message}</p></div>
		<div className="shell-dialog__buttons">
			{accept && <button type="button" className="chrome-raised" onClick={accept}>Yes</button>}
			<button type="button" className="chrome-raised" autoFocus onClick={onClose}>{accept ? "No" : "OK"}</button>
		</div>
	</dialog>;
}
