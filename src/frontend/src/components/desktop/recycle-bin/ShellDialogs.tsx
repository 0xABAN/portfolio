"use client";

import { useState } from "react";
import { binBytes, DRIVE_BYTES, SYSTEM_BYTES, ancestorsOf, entryRoot, itemOf, nodeBytes, originalLocation, subtree, type BinSettings } from "./recycleBinState";
import { BIN_ICON, DESKTOP_PATH, formatBytes } from "./shellCatalog";
import { ShellDialogFrame } from "./ShellControls";
import { useShell, type ShellSnapshot } from "./ShellProvider";

function BinProperties({ snapshot }: { snapshot: ShellSnapshot }) {
	const shell = useShell();
	const [base, setBase] = useState(snapshot);
	const [draft, setDraft] = useState<BinSettings>(snapshot.state.settings);
	const [tab, setTab] = useState<"global" | "drive">("global");
	const enabled = tab === "global" ? !draft.independent : draft.independent;
	const effective = tab === "drive" && !draft.independent ? draft.global : draft[tab];
	const dirty = JSON.stringify(draft) !== JSON.stringify(base.state.settings);
	function updateDrive(update: Partial<BinSettings["global"]>) {
		setDraft({ ...draft, [tab]: { ...draft[tab], ...update } });
	}
	async function apply(close: boolean) {
		if (!dirty) { if (close) shell.closeDialog(); return; }
		if (await shell.commit({ ...base.state, settings: draft }, base)) {
			setBase(shell.getSnapshot());
			if (close) shell.closeDialog();
		}
	}
	return <ShellDialogFrame title="Recycle Bin Properties" onClose={shell.closeDialog}>
		<div className="shell-properties">
			<div className="shell-tabs" role="tablist" aria-label="Drives" onKeyDown={(event) => {
				if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
				event.preventDefault();
				const next = tab === "global" ? "drive" : "global";
				setTab(next);
				event.currentTarget.querySelector<HTMLButtonElement>(`[data-tab="${next}"]`)?.focus();
			}}>
				{(["global", "drive"] as const).map((key) => <button key={key} id={`bin-tab-${key}`} type="button" data-tab={key} role="tab" aria-selected={tab === key} aria-controls="bin-settings-panel" tabIndex={tab === key ? 0 : -1} onClick={() => setTab(key)}>{key === "global" ? "Global" : "(C:)"}</button>)}
			</div>
			<div id="bin-settings-panel" role="tabpanel" aria-labelledby={`bin-tab-${tab}`} className="shell-properties__panel">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img src={BIN_ICON.full} alt="" width={32} height={32} />
				{tab === "global" ? <fieldset className="shell-properties__mode"><legend className="shell-sr-only">Drive configuration</legend>
					<label><input type="radio" name="bin-mode" checked={draft.independent} onChange={() => setDraft({ ...draft, independent: true })} /> Configure drives independently</label>
					<label><input type="radio" name="bin-mode" checked={!draft.independent} onChange={() => setDraft({ ...draft, independent: false })} /> Use one setting for all drives</label>
				</fieldset> : <dl className="shell-details">
					<dt>Disk space:</dt><dd>{formatBytes(DRIVE_BYTES)}</dd>
					<dt>Free space:</dt><dd>{formatBytes(DRIVE_BYTES - SYSTEM_BYTES - nodeBytes(base.state.nodes) - binBytes(base.state))}</dd>
				</dl>}
				<fieldset disabled={!enabled} className="shell-properties__drive"><legend className="shell-sr-only">Recycle Bin settings</legend>
					<label><input type="checkbox" checked={effective.bypass} onChange={(event) => updateDrive({ bypass: event.target.checked })} /> Do not move files to the Recycle Bin. Remove files immediately on delete.</label>
					<label className="shell-properties__size" htmlFor="bin-size">Maximum size of Recycle Bin: {effective.percent}%</label>
					<input id="bin-size" type="range" min={0} max={100} step={1} disabled={effective.bypass} value={effective.percent} onChange={(event) => updateDrive({ percent: Number(event.target.value) })} />
					<div className="shell-properties__scale"><span>0%</span><span>100%</span></div>
					<p>{formatBytes(Math.floor(DRIVE_BYTES * effective.percent / 100))} reserved on C:</p>
				</fieldset>
				{tab === "global" && <label><input type="checkbox" checked={draft.confirm} onChange={(event) => setDraft({ ...draft, confirm: event.target.checked })} /> Display delete confirmation dialog</label>}
				<p className="shell-properties__note">C: is a simulated 32 MB drive. Sizes do not describe your device. Lower limits take effect when another item is recycled.</p>
			</div>
		</div>
		<div className="shell-dialog__buttons">
			<button type="button" className="chrome-raised" disabled={shell.saving} onClick={() => void apply(true)}>OK</button>
			<button type="button" className="chrome-raised" disabled={shell.saving} onClick={shell.closeDialog}>Cancel</button>
			<button type="button" className="chrome-raised" disabled={!dirty || shell.saving} onClick={() => void apply(false)}>Apply</button>
		</div>
	</ShellDialogFrame>;
}

export function ShellDialogs() {
	const shell = useShell();
	const dialog = shell.dialog;
	if (!dialog) return null;
	if (dialog.kind === "settings") return <BinProperties snapshot={dialog.snapshot} />;
	if (dialog.kind === "message") return <ShellDialogFrame title={dialog.title} onClose={shell.closeDialog}>
		<div className="shell-dialog__message"><span className="shell-dialog__symbol" aria-hidden="true">{dialog.accept ? "?" : "!"}</span><p>{dialog.message}</p></div>
		<div className="shell-dialog__buttons">
			{dialog.accept && <button type="button" className="chrome-raised" disabled={shell.saving} onClick={dialog.accept}>Yes</button>}
			<button type="button" className="chrome-raised" autoFocus onClick={shell.closeDialog}>{dialog.accept ? "No" : "OK"}</button>
		</div>
	</ShellDialogFrame>;

	const entries = dialog.state.entries.filter((entry) => dialog.entries?.includes(entry.id));
	const nodes = dialog.state.nodes.filter((node) => dialog.nodes?.includes(node.id));
	const root = entries.length ? entryRoot(entries[0]) : nodes[0];
	if (!root) return null;
	const count = entries.length || nodes.length;
	const item = itemOf(root);
	const bytes = entries.length ? entries.reduce((sum, entry) => sum + nodeBytes(entry.nodes), 0) : nodeBytes([...new Map(nodes.flatMap((node) => subtree(dialog.state.nodes, node.id)).map((node) => [node.id, node])).values()]);
	const location = entries.length ? originalLocation(entries[0]) : [DESKTOP_PATH, ...ancestorsOf(dialog.state.nodes, root).map((node) => itemOf(node).name)].join("\\");
	return <ShellDialogFrame title={`${count === 1 ? item.name : `${count} items`} Properties`} onClose={shell.closeDialog}>
		<div className="shell-properties">
			<div className="shell-tabs"><span>General</span></div>
			<div className="shell-properties__panel">
				<div className="shell-properties__heading">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={item.icon} alt="" width={32} height={32} /><strong>{count === 1 ? item.name : `${count} items`}</strong>
				</div>
				<dl className="shell-details">
					<dt>Type:</dt><dd>{count === 1 ? item.type : "Multiple items"}</dd>
					<dt>{entries.length ? "Original location:" : "Location:"}</dt><dd>{count === 1 ? location : "Multiple locations"}</dd>
					<dt>Size:</dt><dd>{formatBytes(bytes)} ({bytes.toLocaleString("en-US")} bytes)</dd>
					{entries.length === 1 && <><dt>Deleted:</dt><dd>{new Date(entries[0].deletedAt).toLocaleString()}</dd></>}
					{count === 1 && item.kind === "shortcut" && <><dt>Target:</dt><dd>{item.href ?? item.open}</dd></>}
				</dl>
			</div>
		</div>
		<div className="shell-dialog__buttons">
			{entries.length > 0 && <button type="button" className="chrome-raised" onClick={() => { shell.closeDialog(); shell.restore(entries.map((entry) => entry.id)); }}>Restore</button>}
			<button type="button" className="chrome-raised" autoFocus onClick={shell.closeDialog}>OK</button>
		</div>
	</ShellDialogFrame>;
}
