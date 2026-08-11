"use client";

import {
	type FormEvent,
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import "./terminal.css";

const GREETING = "how u doing 😎";
const BOT = "> adam bot: ";
const YOU = "> you: ";
const SHELL = "C:\\PORTFOLIO>";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";
// keep in sync with portfolio_backend.chat.BROKE_MSG
const BROKE_MSG = "sry i'm too broke to afford this rn";

const COPYRIGHT = [
	"Microsoft(R) Windows 98",
	"   (C)Copyright Microsoft Corp 1981-1998.",
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
	const [history, setHistory] = useState<ChatMessage[]>([]);
	const bodyRef = useRef<HTMLPreElement>(null);
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

	// terminal is the only text field — keep it focused so typing never needs a click
	useEffect(() => {
		if (busy) return;

		const focusInput = () => {
			inputRef.current?.focus({ preventScroll: true });
		};
		focusInput();

		const isOtherField = (t: EventTarget | null) => {
			if (!(t instanceof HTMLElement) || t === inputRef.current) return false;
			return (
				t.tagName === "INPUT" ||
				t.tagName === "TEXTAREA" ||
				t.tagName === "SELECT" ||
				t.isContentEditable
			);
		};

		const onKeyDown = (e: globalThis.KeyboardEvent) => {
			if (isOtherField(e.target)) return;
			if (e.metaKey || e.ctrlKey || e.altKey) return;
			const el = inputRef.current;
			if (!el) return;
			if (document.activeElement === el) return;

			// first keystroke while unfocused would otherwise be lost
			if (e.key.length === 1 && !e.isComposing) {
				e.preventDefault();
				setInput((v) => v + e.key);
				focusInput();
				return;
			}
			if (e.key === "Backspace") {
				e.preventDefault();
				setInput((v) => v.slice(0, -1));
				focusInput();
				return;
			}
			if (e.key === "Enter") {
				e.preventDefault();
				focusInput();
				el.form?.requestSubmit();
				return;
			}
			focusInput();
		};

		const onPointerUp = () => {
			queueMicrotask(focusInput);
		};

		window.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("pointerup", onPointerUp, true);
		return () => {
			window.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("pointerup", onPointerUp, true);
		};
	}, [busy]);

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
		setHistory([]);
		setInput("");
		setLines([]);

		// cold open — blank CRT / shell coming up (~2x faster than first pass)
		await pause(350);

		// BIOS-ish copyright dump (line-by-line, not instant)
		for (const text of COPYRIGHT) {
			if (!alive()) return;
			setLines((prev) => [...prev, { id: nextId(), text }]);
			await pause(text ? 210 : 140);
		}

		// shell ready, cursor sits a beat before anyone types
		const cmdId = nextId();
		setLines((prev) => [...prev, { id: cmdId, text: SHELL }]);
		await pause(450);

		// human-speed command entry
		await typewrite(
			"adam",
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
		setLines((prev) => [...prev, { id: nextId(), text: "" }]);
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
		setLines((prev) => [...prev, { id: nextId(), text: "" }]);
		setBusy(false);
		inputRef.current?.focus();
	}, [setLineText]);

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
			inputRef.current?.focus();
		}
	};

	const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			e.preventDefault();
			void submit();
		}
	};

	return (
		<div className="term">
			<div className="term__menu" aria-hidden>
				<span>File</span>
				<span>Edit</span>
				<span>Search</span>
				<span>Help</span>
			</div>
			<pre
				className="term__body"
				ref={bodyRef}
				onClick={() => inputRef.current?.focus()}
				onKeyDown={() => inputRef.current?.focus()}
			>
				{lines.map((line) => (
					<span
						key={line.id}
						className={`term__line${line.text ? "" : " term__line--blank"}`}
					>
						{line.text || "\u00a0"}
					</span>
				))}
				{/* only one live prompt — hide while boot/program output runs */}
				{!busy && (
					<form className="term__input-row" onSubmit={submit}>
						<span className="term__prompt">{YOU}</span>
						<span className="term__echo">{input}</span>
						<span className="term__cursor" aria-hidden />
						<input
							ref={inputRef}
							className="term__input"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={onKeyDown}
							spellCheck={false}
							autoComplete="off"
							aria-label="Terminal input"
						/>
					</form>
				)}
			</pre>
		</div>
	);
}
