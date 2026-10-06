"use client";

import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import "./terminal.css";

const GREETING = "how u doing :)";
const BOT = "ADAM> ";
const YOU = "YOU> ";
const SHELL = "C:\\PORTFOLIO>";
const WINDOWS_VERSION = "Windows 95. [Version 4.00.950]";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
// keep in sync with portfolio_backend.chat.BROKE_MSG
const BROKE_MSG = "sry i'm too broke to afford this rn";

const COPYRIGHT = ["Microsoft(R) Windows 95", "   (C)Copyright Microsoft Corp 1981-1995.", ""];
const COMMANDS = [
	"Available commands:",
	"  ADAM.EXE  Chat with Adam about his work.",
	"  HELP      Show this list.",
	"  CLS       Clear the screen.",
	"  VER       Show the Windows version.",
	"",
];
const HELP = [
	"CLS    Clear the screen; keep the conversation.",
	"CLEAR  Alias for CLS.",
	"HELP   Show this help.",
	"VER    Show the Windows version.",
	"",
	"Up/Down recalls input; Esc clears the entry.",
	"Anything else goes to Adam.",
	"",
];

type ChatMessage = { role: "user" | "assistant"; content: string };
type Line = { id: number; text: string };

let lineId = 0;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Types `text` out, `charMs` per character and `spaceMs` after spaces, rendering every third character. */
async function typewrite(text: string, onTick: (typed: string) => void, alive: () => boolean, charMs: number, spaceMs: number) {
	if (prefersReducedMotion()) {
		onTick(text);
		return;
	}
	let typed = "";
	let pending = 0;
	for (const ch of text) {
		if (!alive()) return;
		typed += ch;
		if (++pending >= 3 || ch === " ") {
			onTick(typed);
			pending = 0;
		}
		await sleep(ch === " " ? spaceMs : charMs);
	}
	if (pending) onTick(typed);
}

/** Streams Adam's reply from the chat API's server-sent events, one token at a time. */
async function streamChat(messages: ChatMessage[], onToken: (token: string) => void) {
	const res = await fetch(`${API_URL}/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ messages }),
	});
	if (!res.ok) {
		const detail = await res.json().then((body: { detail?: string }) => body.detail, () => undefined);
		throw new Error(detail || res.statusText || `HTTP ${res.status}`);
	}
	if (!res.body) throw new Error("no response body");

	const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = "";
	let event = "message";
	for (;;) {
		const { done, value } = await reader.read();
		if (done) return;
		const lines = (buffer + value).split("\n");
		buffer = lines.pop() ?? "";
		for (const raw of lines) {
			const line = raw.replace(/\r$/, "");
			if (line.startsWith("event:")) {
				event = line.slice(6).trim();
				continue;
			}
			if (!line.startsWith("data:")) continue;
			let data: { content?: string; detail?: string };
			try {
				data = JSON.parse(line.slice(5));
			} catch {
				continue;
			}
			if (event === "token" && data.content) onToken(data.content);
			else if (event === "error") throw new Error(data.detail || "stream error");
			event = "message";
		}
	}
}

export function Terminal() {
	const [lines, setLines] = useState<Line[]>([]);
	const [input, setInput] = useState("");
	const [busy, setBusy] = useState(true);
	const [booted, setBooted] = useState(false);
	const [history, setHistory] = useState<ChatMessage[]>([]);
	const [clipboardStatus, setClipboardStatus] = useState("");
	const bodyRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	// Shell recall is independent of the conversation sent to the chat API.
	const submittedInput = useRef<string[]>([]);
	const recallIndex = useRef<number | null>(null);
	const draft = useRef("");

	useEffect(() => {
		const el = bodyRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [lines, input, busy]);

	/** Adds a line and returns its id, so typewriters can keep updating it. */
	const append = useCallback((text: string) => {
		const id = ++lineId;
		setLines((prev) => [...prev, { id, text }]);
		return id;
	}, []);

	const setLineText = useCallback((id: number, text: string) => {
		setLines((prev) => prev.map((line) => (line.id === id ? { ...line, text } : line)));
	}, []);

	// The opening script: a DOS banner, a typed HELP and ADAM.EXE, then Adam's greeting.
	useEffect(() => {
		let alive = true;
		const pause = (ms: number) => (prefersReducedMotion() ? Promise.resolve() : sleep(ms));

		// The two shell commands are a demonstration, not messages sent to Adam.
		async function typeCommand(command: string) {
			const id = append(SHELL);
			await pause(450);
			await typewrite(command, (typed) => { if (alive) setLineText(id, SHELL + typed); }, () => alive, 80, 110);
			await pause(220);
		}

		void (async () => {
			// Cold open: the DOS session starts before the chat program.
			await pause(350);
			for (const text of COPYRIGHT) {
				if (!alive) return;
				append(text);
				await pause(text ? 210 : 140);
			}
			if (!alive) return;
			await typeCommand("help");
			if (!alive) return;
			COMMANDS.forEach(append);
			await pause(500);
			if (!alive) return;
			await typeCommand("ADAM.EXE");
			if (!alive) return;
			append("");
			// The program starts without output, then Adam starts talking.
			await pause(970);
			if (!alive) return;
			const greeting = append(BOT);
			await pause(190);
			await typewrite(GREETING, (typed) => { if (alive) setLineText(greeting, BOT + typed); }, () => alive, 40, 60);
			if (!alive) return;
			await pause(175);
			setHistory([{ role: "assistant", content: GREETING }]);
			append("");
			setBusy(false);
			setBooted(true);
		})();
		return () => { alive = false; };
	}, [append, setLineText]);

	function editInput(value: string) {
		recallIndex.current = null;
		setInput(value);
		setClipboardStatus("");
	}

	/** Runs a shell command; returns false for anything meant for Adam. */
	function runLocal(command: string) {
		const name = command.toLowerCase();
		if (name === "clear" || name === "cls") setLines([]);
		else if (name === "help") HELP.forEach(append);
		else if (name === "ver") [WINDOWS_VERSION, ""].forEach(append);
		else return false;
		return true;
	}

	async function submit(event?: FormEvent) {
		event?.preventDefault();
		const text = input.trim();
		if (busy || !text) return;

		submittedInput.current.push(text);
		append(`${YOU}${text}`);
		editInput("");
		if (runLocal(text)) return;

		const conversation: ChatMessage[] = [...history, { role: "user", content: text }];
		setBusy(true);
		let reply = "";
		const replyId = append(BOT + "...");
		try {
			await streamChat(conversation, (token) => {
				reply += token;
				setLineText(replyId, BOT + reply);
			});
			if (!reply.trim()) throw new Error("No reply received. Please try again.");
			setHistory([...conversation, { role: "assistant", content: reply }]);
		} catch (error) {
			const message = error instanceof Error ? error.message : "request failed";
			const broke = message === BROKE_MSG || /too broke|rate limit|quota|credit|billing/i.test(message);
			setLineText(replyId, broke ? `${BOT}${BROKE_MSG}` : `error: ${message}`);
		} finally {
			append("");
			setBusy(false);
		}
	}

	function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
		if (busy || event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
		if (event.key === "Enter") {
			event.preventDefault();
			void submit();
		} else if (event.key === "Escape") {
			event.preventDefault();
			editInput("");
		} else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
			event.preventDefault();
			const entries = submittedInput.current;
			if (!entries.length) return;

			// Keep the unfinished entry so Down past the newest command restores it.
			const current = recallIndex.current ?? entries.length;
			if (recallIndex.current === null) draft.current = input;
			const next = Math.max(0, Math.min(entries.length, current + (event.key === "ArrowUp" ? -1 : 1)));
			recallIndex.current = next === entries.length ? null : next;
			setInput(next === entries.length ? draft.current : entries[next]);
		}
	}

	/** Copies selected output, else the selected input, else the whole transcript. */
	async function copy() {
		const field = inputRef.current;
		const selectedInput = field?.value.slice(field.selectionStart ?? 0, field.selectionEnd ?? 0);
		const selection = window.getSelection();
		const selectedOutput = selection && bodyRef.current?.contains(selection.anchorNode)
			&& bodyRef.current.contains(selection.focusNode) ? selection.toString() : "";
		const transcript = [...lines.map((line) => line.text), busy ? "" : YOU + input].join("\n");

		try {
			await navigator.clipboard.writeText(selectedOutput || selectedInput || transcript);
			setClipboardStatus("Copied.");
		} catch {
			setClipboardStatus("Clipboard unavailable. Select text and use your copy shortcut.");
		}
	}

	async function paste() {
		const field = inputRef.current;
		if (!field || busy) return;

		try {
			const text = await navigator.clipboard.readText();
			// A clipboard permission prompt can outlive this particular input row.
			if (field !== inputRef.current || field.readOnly) return;
			field.setRangeText(text.replace(/[\r\n]+/g, " "), field.selectionStart ?? 0, field.selectionEnd ?? 0, "end");
			editInput(field.value);
			field.focus({ preventScroll: true });
		} catch {
			setClipboardStatus("Clipboard unavailable. Use your paste shortcut in the prompt.");
		}
	}

	return (
		<div className="term">
			<div className="term__toolbar" role="group" aria-label="MS-DOS controls">
				<span className="term__font-size">8 x 16</span>
				<span className="term__separator" aria-hidden="true" />
				<button type="button" className="term__tool" aria-label="Copy" title="Copy selection or transcript"
					onPointerDown={(event) => event.preventDefault()} onClick={() => void copy()}>
					<svg viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
						<path fill="#fff" stroke="#000" d="M1.5 1.5h8v10h-8zM5.5 4.5h8v10h-8z" />
						<path stroke="currentColor" d="M7 7.5h5M7 9.5h5M7 11.5h4" />
					</svg>
				</button>
				<button type="button" className="term__tool" aria-label="Paste" title="Paste into the prompt" disabled={busy}
					onPointerDown={(event) => event.preventDefault()} onClick={() => void paste()}>
					<svg viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
						<path fill="#808000" stroke="#000" d="M2.5 2.5h10v12h-10z" />
						<path fill="#c0c0c0" stroke="#000" d="M5.5.5h4v3h-4z" />
						<path fill="#fff" stroke="#000" d="M6.5 6.5h8v9h-8z" />
						<path stroke="currentColor" d="M8 9.5h5M8 11.5h5M8 13.5h3" />
					</svg>
				</button>
				<a className="term__tool" href="/fonts/ibm-vga-LICENSE.txt" target="_blank" rel="noreferrer"
					aria-label="DOS font credits" title="DOS font credits">?</a>
			</div>
			<div className="term__status" role="status">{clipboardStatus}</div>
			<div className="term__body" ref={bodyRef} onClick={() => { if (window.getSelection()?.isCollapsed) inputRef.current?.focus(); }}>
				{lines.map((line) => (
					<span key={line.id} className={line.text ? "term__line" : "term__line term__line--blank"}>{line.text || "\u00a0"}</span>
				))}
				{/* Keep the field mounted during replies: native focus and selection survive. */}
				{booted && (
					<form className="term__input-row" onSubmit={submit} aria-busy={busy} data-empty={!input}>
						<span className="term__prompt" aria-hidden="true">{YOU}</span>
						<input
							ref={inputRef}
							className="term__input"
							readOnly={busy}
							tabIndex={busy ? -1 : 0}
							value={input}
							onChange={(event) => editInput(event.target.value)}
							onKeyDown={onKeyDown}
							spellCheck={false}
							autoComplete="off"
							autoCapitalize="off"
							aria-label="Terminal input"
						/>
					</form>
				)}
			</div>
		</div>
	);
}
