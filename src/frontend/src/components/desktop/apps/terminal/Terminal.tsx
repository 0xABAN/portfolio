"use client";

import { type FormEvent, type KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { type ChatMessage, FAILURE_REPLIES } from "@/lib/chat/messages";
import "./terminal.css";

const GREETING = "come chat with me :)";
/** Adam's first line arrives this long after everything before it, like a message coming in. */
const GREETING_DELAY_MS = 1000;
const BOT = "ADAM> ";
const YOU = "YOU> ";
const SHELL = "C:\\PORTFOLIO>";
const WINDOWS_VERSION = "Windows 95. [Version 4.00.950]";

// Adam's model sleeps when idle and takes about 90 s to wake up; meanwhile he naps on screen.
const ASLEEP = "(-_-) ";
const AWAKE = "(o_o)";
/** Each frame of the z's drifting away from his face. */
const SNORE = ["z  ", "zZ ", "zZz", " Zz", "  z", "   "];
const SNORE_MS = 350;
/** A reply that hasn't started by now is waiting on the model to wake up. */
const ASLEEP_AFTER_MS = 3000;

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

/** Part of a line drawn in its own color. */
type Segment = { text: string; tone?: "snore" | "time" };
/** A line of output. `segments`, when set, color the parts of `text`. */
type Line = { id: number; text: string; segments?: Segment[] };

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

/** How long since `since`, as minutes and seconds: "0:41". */
function elapsed(since: number) {
	const seconds = Math.floor((Date.now() - since) / 1000);
	return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A failed reply; its message is what Adam says about it, one of FAILURE_REPLIES or the server's own. */
class ChatFailure extends Error {}

/** What Adam says about a refused request: the route's `detail`, or a generic line for responses without one, like platform error pages. */
async function refusalReply(res: Response) {
	const detail = await res.json().then((body: { detail?: string }) => body.detail, () => undefined);
	return detail || FAILURE_REPLIES.broken;
}

/** Wakes Adam's model. Resolves once he can reply, or with what he says instead (out of time, broken, unreachable). */
async function wakeAdam(): Promise<string | null> {
	try {
		const res = await fetch("/api/chat/wake", { method: "POST" });
		return res.ok ? null : await refusalReply(res);
	} catch {
		return FAILURE_REPLIES.unreachable;
	}
}

/** Streams Adam's reply from the chat API's server-sent events, one token at a time. */
async function streamChat(messages: ChatMessage[], onToken: (token: string) => void) {
	const unreachable = () => {
		throw new ChatFailure(FAILURE_REPLIES.unreachable);
	};

	const res = await fetch("/api/chat", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ messages }),
	}).catch(unreachable);
	if (!res.ok) throw new ChatFailure(await refusalReply(res));
	if (!res.body) throw new ChatFailure(FAILURE_REPLIES.broken);

	const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = "";
	let event = "message";
	for (;;) {
		const { done, value } = await reader.read().catch(unreachable);
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
			else if (event === "error") throw new ChatFailure(data.detail || FAILURE_REPLIES.broken);
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
		setLines((prev) => prev.map((line) => (line.id === id ? { id, text } : line)));
	}, []);

	const setLineSegments = useCallback((id: number, segments: Segment[]) => {
		const text = segments.map((segment) => segment.text).join("");
		setLines((prev) => prev.map((line) => (line.id === id ? { id, text, segments } : line)));
	}, []);

	const removeLine = useCallback((id: number) => {
		setLines((prev) => prev.filter((line) => line.id !== id));
	}, []);

	/**
	 * Shows Adam asleep on line `faceId`, with how long he's been waking up (since `since`) on a
	 * line under it. Returns the function that stops the nap and removes that line.
	 */
	const showAsleep = useCallback((faceId: number, since: number) => {
		const statusId = append("");
		let frame = 0;
		const draw = () => {
			const snore = prefersReducedMotion() ? "zZz" : SNORE[frame++ % SNORE.length];
			setLineSegments(faceId, [{ text: BOT + ASLEEP }, { text: snore, tone: "snore" }]);
			setLineSegments(statusId, [
				{ text: `${" ".repeat(BOT.length)}asleep, waking him up · ` },
				{ text: elapsed(since), tone: "time" },
			]);
		};
		draw();
		const timer = setInterval(draw, SNORE_MS);

		return () => {
			clearInterval(timer);
			removeLine(statusId);
		};
	}, [append, setLineSegments, removeLine]);

	// The opening script: a DOS banner, a typed HELP and ADAM.EXE, then Adam's greeting once he's awake.
	useEffect(() => {
		let alive = true;
		let stopNap: (() => void) | undefined;
		const pause = (ms: number) => (prefersReducedMotion() ? Promise.resolve() : sleep(ms));

		// Start waking the model now, so it boots during the intro instead of after it.
		const wakeStarted = Date.now();
		let wakeSettled = false;
		const wakeup = wakeAdam().finally(() => { wakeSettled = true; });

		// The two shell commands are a demonstration, not messages sent to Adam.
		async function typeCommand(command: string) {
			const id = append(SHELL);
			await pause(225);
			await typewrite(command, (typed) => { if (alive) setLineText(id, SHELL + typed); }, () => alive, 40, 55);
			await pause(110);
		}

		void (async () => {
			// Cold open: the DOS session starts before the chat program.
			await pause(175);
			for (const text of COPYRIGHT) {
				if (!alive) return;
				append(text);
				await pause(text ? 105 : 70);
			}
			if (!alive) return;
			await typeCommand("help");
			if (!alive) return;
			COMMANDS.forEach(append);
			await pause(250);
			if (!alive) return;
			await typeCommand("ADAM.EXE");
			if (!alive) return;
			append("");
			// The program starts without output. A second later Adam answers, or naps until his model is up.
			await pause(GREETING_DELAY_MS);
			if (!alive) return;
			let face: number | undefined;
			if (!wakeSettled) {
				face = append(BOT);
				stopNap = showAsleep(face, wakeStarted);
			}
			const failure = await wakeup;
			if (!alive) return;
			stopNap?.();
			stopNap = undefined;

			if (failure) {
				if (face === undefined) append(BOT + failure);
				else setLineText(face, BOT + failure);
			} else {
				if (face !== undefined) {
					// He wakes up, then greets a second later.
					setLineText(face, BOT + AWAKE);
					await pause(GREETING_DELAY_MS);
					if (!alive) return;
				}
				append(BOT + GREETING);
				setHistory([{ role: "assistant", content: GREETING }]);
			}
			await pause(175);
			if (!alive) return;
			append("");
			setBusy(false);
			setBooted(true);
		})();
		return () => {
			alive = false;
			stopNap?.();
		};
	}, [append, setLineText, showAsleep]);

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

		// No first word by now means the model is waking up from zero, so Adam naps until it does.
		const sent = Date.now();
		let stopNap: (() => void) | undefined;
		const napping = setTimeout(() => { stopNap = showAsleep(replyId, sent); }, ASLEEP_AFTER_MS);
		const endNap = () => {
			clearTimeout(napping);
			stopNap?.();
			stopNap = undefined;
		};

		try {
			await streamChat(conversation, (token) => {
				endNap();
				reply += token;
				setLineText(replyId, BOT + reply);
			});
			if (!reply.trim()) throw new ChatFailure(FAILURE_REPLIES.silent);
			setHistory([...conversation, { role: "assistant", content: reply }]);
		} catch (error) {
			endNap();
			// Failed turns stay out of the history, so the model never sees these lines.
			if (!(error instanceof ChatFailure)) console.error(error);
			setLineText(replyId, BOT + (error instanceof ChatFailure ? error.message : FAILURE_REPLIES.broken));
		} finally {
			endNap();
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
					<span key={line.id} className={line.text ? "term__line" : "term__line term__line--blank"}>
						{line.segments?.map((segment, i) => (
							<span key={i} className={segment.tone && `term__${segment.tone}`}>{segment.text}</span>
						)) ?? (line.text || "\u00a0")}
					</span>
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
