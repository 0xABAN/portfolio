"use client";

import {
	type CSSProperties,
	type FormEvent,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import "./terminal.css";

const GREETING = "how u doing :)";
const BOT = "ADAM> ";
const YOU = "YOU> ";
const SHELL = "C:\\PORTFOLIO>";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
// keep in sync with portfolio_backend.chat.BROKE_MSG
const BROKE_MSG = "sry i'm too broke to afford this rn";

const COPYRIGHT = [
	"Microsoft(R) Windows 95",
	"   (C)Copyright Microsoft Corp 1981-1995.",
	"",
] as const;

type ChatMessage = { role: "user" | "assistant"; content: string };
type Line = { id: number; text: string };

let lineId = 0;
const nextId = () => ++lineId;

function sleep(ms: number) {
	return new Promise<void>((r) => setTimeout(r, ms));
}

function prefersReducedMotion() {
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches
	);
}

/** ms between chars; spaces use spaceMs when provided. Batches React ticks. */
async function typewrite(
	text: string,
	onTick: (full: string) => void,
	alive: () => boolean,
	charMs: number,
	spaceMs?: number,
) {
	const instant = prefersReducedMotion();
	if (instant) {
		onTick(text);
		return;
	}
	let out = "";
	const gapSpace = spaceMs ?? charMs;
	// Commit ~every 2–3 chars instead of every keystroke
	const BATCH = 3;
	let sinceFlush = 0;
	for (const ch of text) {
		if (!alive()) return;
		out += ch;
		sinceFlush += 1;
		if (sinceFlush >= BATCH || ch === " ") {
			onTick(out);
			sinceFlush = 0;
		}
		await sleep(ch === " " ? gapSpace : charMs);
	}
	if (sinceFlush) onTick(out);
}

async function streamChat(
	messages: ChatMessage[],
	onToken: (t: string) => void,
): Promise<void> {
	const res = await fetch(`${API_URL}/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ messages }),
	});
	if (!res.ok) {
		let detail = res.statusText;
		try {
			const j = (await res.json()) as { detail?: string };
			if (j.detail) detail = j.detail;
		} catch {
			/* ignore */
		}
		throw new Error(detail || `HTTP ${res.status}`);
	}
	if (!res.body) throw new Error("no response body");

	const reader = res.body.getReader();
	const decoder = new TextDecoder();
	let buf = "";
	let event = "message";

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		buf += decoder.decode(value, { stream: true });
		const parts = buf.split("\n");
		buf = parts.pop() ?? "";

		for (const raw of parts) {
			const line = raw.replace(/\r$/, "");
			if (!line) continue;
			if (line.startsWith("event:")) {
				event = line.slice(6).trim();
				continue;
			}
			if (!line.startsWith("data:")) continue;
			const data = line.slice(5).trim();
			let parsed: { content?: string; detail?: string };
			try {
				parsed = JSON.parse(data) as typeof parsed;
			} catch {
				continue;
			}
			if (event === "token" && parsed.content) onToken(parsed.content);
			else if (event === "error") {
				throw new Error(parsed.detail || "stream error");
			}
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
	const [fontSize, setFontSize] = useState(16);
	const [clipboardStatus, setClipboardStatus] = useState("");
	const bodyRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const aliveRef = useRef(true);
	const runGen = useRef(0);

	useEffect(() => {
		aliveRef.current = true;
		return () => {
			aliveRef.current = false;
		};
	}, []);

	useEffect(() => {
		const el = bodyRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [lines, input, busy]);

	const setLineText = useCallback((id: number, text: string) => {
		setLines((prev) => prev.map((l) => (l.id === id ? { ...l, text } : l)));
	}, []);

	const append = useCallback((text: string) => {
		setLines((prev) => [...prev, { id: nextId(), text }]);
	}, []);

	const playBoot = useCallback(async () => {
		const gen = ++runGen.current;
		const alive = () => runGen.current === gen && aliveRef.current;
		const pause = async (ms: number) => {
			if (prefersReducedMotion()) return;
			await sleep(ms);
		};

		await sleep(0);
		if (!alive()) return;

		setBusy(true);
		setBooted(false);
		setHistory([]);
		setInput("");
		setLines([]);

		// Cold open: the DOS session starts before the chat program.
		await pause(350);

		// Shell startup banner, not a BIOS or simulated operating-system boot.
		for (const text of COPYRIGHT) {
			if (!alive()) return;
			append(text);
			await pause(text ? 210 : 140);
		}

		// shell ready, cursor sits a beat before anyone types
		const cmdId = nextId();
		setLines((prev) => [...prev, { id: cmdId, text: SHELL }]);
		await pause(450);

		// human-speed command entry
		await typewrite(
			"ADAM.EXE",
			(full) => {
				if (!alive()) return;
				setLineText(cmdId, SHELL + full);
			},
			alive,
			80,
			110,
		);
		if (!alive()) return;

		// Enter — disk spin / PE load
		await pause(220);
		append("");
		await pause(550);
		// program init (no output yet)
		await pause(420);

		// adam starts talking
		const greetId = nextId();
		setLines((prev) => [...prev, { id: greetId, text: BOT }]);
		await pause(190);
		await typewrite(
			GREETING,
			(full) => {
				if (!alive()) return;
				setLineText(greetId, BOT + full);
			},
			alive,
			40,
			60,
		);
		if (!alive()) return;

		await pause(175);
		setHistory([{ role: "assistant", content: GREETING }]);
		append("");
		setBusy(false);
		setBooted(true);
	}, [append, setLineText]);

	useEffect(() => {
		const t = window.setTimeout(() => {
			void playBoot();
		}, 0);
		return () => {
			window.clearTimeout(t);
			runGen.current += 1;
		};
	}, [playBoot]);

	const runLocal = (cmd: string): boolean => {
		const c = cmd.trim().toLowerCase();
		if (c === "clear" || c === "cls") {
			void playBoot();
			return true;
		}
		if (c === "help") {
			append("commands: help, clear");
			append("anything else goes to adam");
			append("");
			return true;
		}
		return false;
	};

	const submit = async (e?: FormEvent) => {
		e?.preventDefault();
		const text = input.trim();
		if (busy || !text) return;

		append(`${YOU}${text}`);
		setInput("");
		if (runLocal(text)) return;

		const userMsg: ChatMessage = { role: "user", content: text };
		const nextHistory = [...history, userMsg];
		setBusy(true);

		let assistant = "";
		const assistId = nextId();
		setLines((prev) => [...prev, { id: assistId, text: BOT }]);

		try {
			await streamChat(nextHistory, (tok) => {
				assistant += tok;
				setLineText(assistId, BOT + assistant);
			});
			setHistory([...nextHistory, { role: "assistant", content: assistant }]);
			append("");
		} catch (err) {
			const msg = err instanceof Error ? err.message : "request failed";
			const broke =
				msg === BROKE_MSG ||
				/too broke|rate limit|quota|credit|billing/i.test(msg);
			setLineText(assistId, broke ? `${BOT}${BROKE_MSG}` : `error: ${msg}`);
			append("");
		} finally {
			setBusy(false);
		}
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.nativeEvent.isComposing) return;
		if (e.key === "Enter") {
			e.preventDefault();
			void submit();
		}
	};

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
			setInput(field.value);
			field.focus({ preventScroll: true });
			setClipboardStatus("");
		} catch {
			setClipboardStatus("Clipboard unavailable. Use your paste shortcut in the prompt.");
		}
	}

	return (
		<div className="term" style={{ "--term-font-size": `${fontSize}px` } as CSSProperties}>
			<div className="term__toolbar" role="group" aria-label="MS-DOS controls">
				<select aria-label="Terminal font size" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))}>
					<option value={16}>8 x 16</option>
					<option value={32}>16 x 32</option>
				</select>
				<span className="term__separator" aria-hidden="true" />
				<button type="button" className="term__tool" aria-label="Copy" title="Copy selection or transcript"
					onPointerDown={(event) => event.preventDefault()} onClick={() => void copy()}>
					<svg viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
						<path fill="#fff" stroke="#000" d="M1.5 1.5h8v10h-8zM5.5 4.5h8v10h-8z" />
						<path stroke="#000080" d="M7 7.5h5M7 9.5h5M7 11.5h4" />
					</svg>
				</button>
				<button type="button" className="term__tool" aria-label="Paste" title="Paste into the prompt" disabled={busy}
					onPointerDown={(event) => event.preventDefault()} onClick={() => void paste()}>
					<svg viewBox="0 0 16 16" aria-hidden="true" shapeRendering="crispEdges">
						<path fill="#808000" stroke="#000" d="M2.5 2.5h10v12h-10z" />
						<path fill="#c0c0c0" stroke="#000" d="M5.5.5h4v3h-4z" />
						<path fill="#fff" stroke="#000" d="M6.5 6.5h8v9h-8z" />
						<path stroke="#000080" d="M8 9.5h5M8 11.5h5M8 13.5h3" />
					</svg>
				</button>
				<a className="term__tool" href="/fonts/ibm-vga-LICENSE.txt" target="_blank" rel="noreferrer"
					aria-label="DOS font credits" title="DOS font credits">?</a>
			</div>
			<div className="term__status" role="status">{clipboardStatus}</div>
			<div
				className="term__body"
				ref={bodyRef}
				onClick={() => {
					if (window.getSelection()?.isCollapsed) inputRef.current?.focus();
				}}
			>
				{lines.map((line) => (
					<span
						key={line.id}
						className={`term__line${line.text ? "" : " term__line--blank"}`}
					>
						{line.text || "\u00a0"}
					</span>
				))}
				{/* Keep the field mounted during replies: native focus and selection survive. */}
				{booted && (
					<form className="term__input-row" onSubmit={submit} aria-busy={busy}>
						<span className="term__prompt" aria-hidden="true">{YOU}</span>
						<input
							ref={inputRef}
							className="term__input"
							readOnly={busy}
							value={input}
							onChange={(e) => setInput(e.target.value)}
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
