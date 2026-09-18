"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MenuButton, menuShortcut, type MenuCommand } from "../recycle-bin/ShellControls";
import { useShell } from "../recycle-bin/ShellProvider";
import { resumeToPage } from "./resumeTex";
import "./word.css";

// Sprite order follows the supplied Word 95 reference, at its native 16px size.
const ICONS = [
	"new", "open", "save", "print", "preview", "spelling", "cut", "copy", "paste", "paint",
	"undo", "redo", "autotext", "book", "table", "draw-table", "columns", "drawing", "paragraph", "tip", "help",
	"bold", "italic", "underline", "highlight", "left", "center", "right", "justify", "numbering", "bullets", "outdent", "indent", "borders", "document",
] as const;
type Icon = typeof ICONS[number];
const MENUS = ["File", "Edit", "View", "Insert", "Format", "Tools", "Table", "Window", "Help"] as const;

function WordIcon({ name }: { name: Icon }) {
	return <span className="word__glyph" aria-hidden="true" style={{ backgroundPositionX: -16 * ICONS.indexOf(name) }} />;
}

function Tool({ icon, label, onClick }: { icon: Icon; label: string; onClick?: () => void }) {
	return <button type="button" className="word__tool chrome-raised" aria-label={label}
		title={onClick ? label : `${label} — read-only document`} disabled={!onClick} onClick={onClick}>
		<WordIcon name={icon} />
	</button>;
}

function readOnlyCommands(...labels: string[]): MenuCommand[] {
	return labels.map((label) => ({ label, disabled: true, action: () => {} }));
}

export function Word({ onCloseAction, onMinimizeAction }: { onCloseAction: () => void; onMinimizeAction: () => void }) {
	const shell = useShell();
	const [source, setSource] = useState("");
	const [error, setError] = useState(false);
	const [zoom, setZoom] = useState(100);
	const [status, setStatus] = useState({ page: 1, total: 1 });
	const scroll = useRef<HTMLDivElement>(null);
	const document = useRef<HTMLElement>(null);
	const html = useMemo(() => resumeToPage(source), [source]);

	useEffect(() => {
		const controller = new AbortController();
		fetch("/api/resume", { signal: controller.signal })
			.then((res) => {
				if (!res.ok) throw new Error(String(res.status));
				return res.text();
			})
			.then((tex) => {
				if (!tex.includes("\\begin{document}")) throw new Error("Invalid resume source");
				setSource(tex);
			})
			.catch(() => { if (!controller.signal.aborted) setError(true); });
		return () => controller.abort();
	}, []);

	const updateStatus = useCallback(() => {
		if (!scroll.current || !document.current) return;
		const total = Math.max(1, Math.ceil(document.current.scrollHeight / 1056));
		const page = Math.min(total, 1 + Math.floor(scroll.current.scrollTop / (1056 * zoom / 100)));
		setStatus((old) => old.page === page && old.total === total ? old : { page, total });
	}, [zoom]);

	useEffect(() => {
		const element = document.current;
		if (!element) return;
		const observer = new ResizeObserver(updateStatus);
		observer.observe(element);
		return () => observer.disconnect();
	}, [updateStatus]);

	function saveSource() {
		const url = URL.createObjectURL(new Blob([source], { type: "text/plain;charset=utf-8" }));
		const link = window.document.createElement("a");
		link.href = url;
		link.download = "Adam_Torres_Encarnacion_Resume.tex";
		link.click();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	}

	const focusDocument = useCallback(() => document.current?.focus(), []);
	const openSource = () => window.open("/api/resume", "_blank", "noopener,noreferrer");
	const help = () => shell.notice("This read-only resume is loaded from its live GitHub source. Use the zoom box to change its size, Open to view the source, or Save to download the original LaTeX. Editing commands are unavailable.", "Microsoft Word");
	const menus: Record<string, MenuCommand[]> = {
		File: [{ label: "Open Source…", action: openSource }, { label: "Save Source As…", disabled: !source, action: saveSource }, "separator", { label: "Close", action: onCloseAction }],
		Edit: readOnlyCommands("Undo", "Cut", "Copy", "Paste"),
		View: [50, 75, 100, 125, 150, 200].map((value) => ({ label: `${value}%`, checked: zoom === value, radio: true, action: () => setZoom(value) })),
		Insert: readOnlyCommands("Break…", "Page Numbers…", "Picture…"),
		Format: readOnlyCommands("Font…", "Paragraph…", "Style…"),
		Tools: readOnlyCommands("Spelling…", "Thesaurus…"),
		Table: readOnlyCommands("Insert Table…", "Select Table"),
		Window: [{ label: "resume.doc", checked: true, radio: true, action: focusDocument }],
		Help: [{ label: "About Microsoft Word", action: help }],
	};

	return <div className="word" aria-label="resume.doc" data-shell-surface="" onKeyDown={menuShortcut}>
		<div className="word__menu" role="menubar" aria-label="Word menus">
			<WordIcon name="document" />
			{MENUS.map((label) => <MenuButton key={label} label={label} commands={menus[label]} />)}
			<div className="word__document-controls">
				<button type="button" className="chrome-raised word__document-min" aria-label="Minimize document" onClick={onMinimizeAction} />
				<button type="button" className="chrome-raised word__document-restore" aria-label="Restore document" title="Document is maximized within Word" disabled />
				<button type="button" className="chrome-raised" aria-label="Close document" onClick={onCloseAction}>×</button>
			</div>
		</div>
		<div className="word__toolbar" role="toolbar" aria-label="Standard">
			<Tool icon="new" label="New" /><Tool icon="open" label="Open resume source" onClick={openSource} /><Tool icon="save" label="Save resume source" onClick={source ? saveSource : undefined} />
			<span className="word__separator" />
			<Tool icon="print" label="Print" /><Tool icon="preview" label="Print Preview" /><Tool icon="spelling" label="Spelling" />
			<span className="word__separator" />
			<Tool icon="cut" label="Cut" /><Tool icon="copy" label="Copy" /><Tool icon="paste" label="Paste" /><Tool icon="paint" label="Format Painter" />
			<span className="word__separator" />
			<Tool icon="undo" label="Undo" /><Tool icon="redo" label="Redo" />
			<span className="word__separator" />
			<Tool icon="autotext" label="AutoText" /><Tool icon="book" label="AutoFormat" /><Tool icon="table" label="Insert Table" /><Tool icon="draw-table" label="Spreadsheet" />
			<Tool icon="columns" label="Columns" /><Tool icon="drawing" label="Drawing" /><Tool icon="paragraph" label="Show Paragraph Marks" />
			<select className="word__zoom" aria-label="Zoom" value={zoom} onChange={(event) => setZoom(Number(event.target.value))}>
				{[50, 75, 100, 125, 150, 200].map((value) => <option key={value} value={value}>{value}%</option>)}
			</select>
			<Tool icon="tip" label="Tip of the Day" onClick={help} /><Tool icon="help" label="Help" onClick={help} />
		</div>
		<div className="word__toolbar word__formatting" role="toolbar" aria-label="Formatting">
			<select aria-label="Style" disabled value="Normal"><option>Normal</option></select>
			<select className="word__font" aria-label="Font" disabled value="Times New Roman"><option>Times New Roman</option></select>
			<select className="word__font-size" aria-label="Font size" disabled value="12"><option>12</option></select>
			<Tool icon="bold" label="Bold" /><Tool icon="italic" label="Italic" /><Tool icon="underline" label="Underline" /><Tool icon="highlight" label="Highlight" />
			<span className="word__separator" />
			<Tool icon="left" label="Align Left" /><Tool icon="center" label="Center" /><Tool icon="right" label="Align Right" /><Tool icon="justify" label="Justify" />
			<span className="word__separator" />
			<Tool icon="numbering" label="Numbering" /><Tool icon="bullets" label="Bullets" /><Tool icon="outdent" label="Decrease Indent" /><Tool icon="indent" label="Increase Indent" /><Tool icon="borders" label="Borders" />
		</div>
		<div className="word__ruler-row" aria-hidden="true">
			<span className="word__tab-stop">∟</span>
			<div className="word__ruler"><span className="word__indent word__indent--left" />{[1, 2, 3, 4, 5, 6, 7].map((inch) => <span className="word__inch" key={inch} style={{ left: `${inch * 96}px` }}>{inch}</span>)}<span className="word__indent word__indent--right" /></div>
		</div>
		<div ref={scroll} className="word__scroll" onScroll={updateStatus} aria-busy={!source && !error}>
			<article ref={document} className="word__page" aria-label="Resume document" data-window-focus="" tabIndex={0} style={{ zoom: zoom / 100 }}>
				{source ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <p className="word__contact" role="status">{error ? "Could not load resume from GitHub. Close and reopen this window to retry." : "Opening resume.doc…"}</p>}
			</article>
		</div>
		<div className="word__status" role="status" aria-label={`Page ${status.page} of ${status.total}. Read-only document.`}>
			<span className="word__status-section">Page {status.page}<span>Sec 1</span><span>{status.page}/{status.total}</span></span>
			<span className="word__status-section">At 1″<span>Ln 1</span><span>Col 1</span></span>
			<span className="word__indicators" aria-hidden="true">{["REC", "MRK", "EXT", "OVR", "WPH"].map((label) => <span key={label}>{label}</span>)}</span>
			<span className="word__read-only">Read Only</span><span className="word__size-grip" aria-hidden="true" />
		</div>
	</div>;
}
