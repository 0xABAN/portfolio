/** Renders only the LaTeX this resume template uses; arbitrary documents need a real TeX renderer. */

function escapeHtml(text: string) {
	return text.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

function takeBrace(source: string, at: number): [string, number] {
	if (source[at] !== "{") return ["", at];
	let depth = 0;
	for (let i = at; i < source.length; i++) {
		// Escaped braces are document text, not argument boundaries.
		if (source[i] === "\\" && /[{}\\]/.test(source[i + 1] ?? "")) { i++; continue; }
		if (source[i] === "{") depth++;
		else if (source[i] === "}") {
			depth--;
			if (depth === 0) return [source.slice(at + 1, i), i + 1];
		}
	}
	return [source.slice(at + 1), source.length];
}

function skipSpace(source: string, at: number) {
	while (at < source.length && /\s/.test(source[at]!)) at++;
	return at;
}

function command(source: string, name: string, at: number) {
	const token = "\\" + name;
	if (!source.startsWith(token, at)) return null;
	const after = at + token.length;
	if (source[after] && /[a-zA-Z]/.test(source[after]!)) return null;
	return after;
}

/** Formatting commands and the HTML tag for their argument. */
const STYLE_TAGS: Record<string, string> = { textbf: "b", emph: "i", textit: "i", underline: "u" };

/** Layout commands shown as their last argument, after skipping this many leading ones. */
const SKIPPED_ARGS: Record<string, number> = { textcolor: 1, raisebox: 1, resizebox: 2 };

/** The first of `names` that starts at `at`, with the index just after it. */
function commandOf(source: string, names: Record<string, unknown>, at: number) {
	for (const name of Object.keys(names)) {
		const after = command(source, name, at);
		if (after != null) return { name, after };
	}
	return null;
}

function skipOptional(source: string, at: number) {
	at = skipSpace(source, at);
	if (source[at] !== "[") return at;
	const end = source.indexOf("]", at);
	return end < 0 ? source.length : end + 1;
}

export function inlineTex(source: string): string {
	let out = "";
	let i = 0;
	while (i < source.length) {
		if (source[i] === "$") {
			const end = source.indexOf("$", i + 1);
			if (end < 0) {
				i++;
				continue;
			}
			const math = source.slice(i + 1, end);
			out += math === "|" ? "|" : math.includes("sim") ? "~" : math.includes("blacktriangle") ? "▲" : "";
			i = end + 1;
			continue;
		}

		const style = commandOf(source, STYLE_TAGS, i);
		if (style) {
			const tag = STYLE_TAGS[style.name];
			const [inner, next] = takeBrace(source, skipSpace(source, style.after));
			out += `<${tag}>${inlineTex(inner)}</${tag}>`;
			i = next;
			continue;
		}

		const layout = commandOf(source, SKIPPED_ARGS, i);
		if (layout) {
			let at = layout.after;
			for (let skipped = 0; skipped < SKIPPED_ARGS[layout.name]; skipped++) {
				at = takeBrace(source, skipSpace(source, at))[1];
			}
			const [inner, next] = takeBrace(source, skipSpace(source, at));
			out += inlineTex(inner);
			i = next;
			continue;
		}

		const href = command(source, "href", i);
		if (href != null) {
			let at = skipSpace(source, href);
			const [url, afterUrl] = takeBrace(source, at);
			at = skipSpace(source, afterUrl);
			const [label, next] = takeBrace(source, at);
			const destination = url.trim().replace(/\\([&#_%])/g, "$1");
			// This HTML comes from a remote source: escape attributes and allow only links.
			out += /^(https?:\/\/|mailto:)/i.test(destination)
				? `<a href="${escapeHtml(destination)}" target="_blank" rel="noopener noreferrer">${inlineTex(label)}</a>`
				: inlineTex(label);
			i = next;
			continue;
		}

		const icon = ["Github", "Linkedin", "Envelope"].find((name) => command(source, `fa${name}`, i) != null);
		if (icon) {
			out += `<span class="word__inline-icon word__inline-icon--${icon.toLowerCase()}" aria-hidden="true"></span>`;
			i += icon.length + 3;
			continue;
		}

		if (source.startsWith("\\textless{}", i)) {
			out += "&lt;";
			i += 11;
			continue;
		}
		const escaped = source[i] === "\\" ? source[i + 1] : undefined;
		if (escaped && "#$%&_{} ".includes(escaped)) {
			out += escapeHtml(escaped);
			i += 2;
			continue;
		}
		if (source.startsWith("\\\\", i)) {
			out += "<br/>";
			i += 2;
			continue;
		}

		const oneArg = command(source, "vspace", i) ?? command(source, "hspace", i);
		if (oneArg != null) {
			i = takeBrace(source, skipSpace(source, oneArg))[1];
			continue;
		}

		if (source[i] === "{" || source[i] === "}") {
			i++;
			continue;
		}
		if (source[i] === "\\" && /[a-zA-Z]/.test(source[i + 1] ?? "")) {
			i++;
			while (i < source.length && /[a-zA-Z]/.test(source[i]!)) i++;
			if (source[i] === "*") i++;
			i = skipOptional(source, i);
			continue;
		}
		out += escapeHtml(source[i]!);
		i++;
	}
	return out.replace(/\s+/g, " ").trim();
}

export function resumeToPage(tex: string): string {
	const body = tex.split("\\begin{document}")[1]?.split("\\end{document}")[0] ?? "";
	const clean = body.replace(/(^|[^\\])%.*/gm, "$1");
	let html = "";
	let i = 0;
	let items: string[] = [];

	function flushItems() {
		if (!items.length) return;
		html += `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
		items = [];
	}

	const center = clean.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/);
	if (center) {
		const lines = center[1]!.split("\\\\").map((line) => inlineTex(line));
		html += `<h1 class="word__name">${lines[0] ?? ""}</h1>`;
		html += `<p class="word__contact">${lines.slice(1).join(" ")}</p>`;
		i = (center.index ?? 0) + center[0].length;
	}

	while (i < clean.length) {
		const sectionAt = command(clean, "section", i);
		if (sectionAt != null) {
			flushItems();
			const at = skipSpace(clean, skipOptional(clean, sectionAt));
			const [title, next] = takeBrace(clean, at);
			html += `<h2 class="word__h">${inlineTex(title)}</h2>`;
			i = next;
			continue;
		}

		const sub = command(clean, "resumeSubheading", i);
		if (sub != null) {
			flushItems();
			let at = skipSpace(clean, sub);
			const args: string[] = [];
			for (let n = 0; n < 4; n++) {
				at = skipSpace(clean, at);
				const [arg, next] = takeBrace(clean, at);
				args.push(inlineTex(arg));
				at = next;
			}
			html += `<div class="word__job"><span>${args[0]}</span><span>${args[1]}</span></div>`;
			html += `<div class="word__role"><span>${args[2]}</span><span>${args[3]}</span></div>`;
			i = at;
			continue;
		}

		const project = command(clean, "resumeProjectHeading", i);
		if (project != null) {
			flushItems();
			let at = skipSpace(clean, project);
			const [left, afterLeft] = takeBrace(clean, at);
			at = skipSpace(clean, afterLeft);
			const [right, afterRight] = takeBrace(clean, at);
			html += `<div class="word__job"><span>${inlineTex(left)}</span><span>${inlineTex(right)}</span></div>`;
			i = afterRight;
			continue;
		}

		// Technical Skills uses a plain \item{...}, rather than \resumeItem{...}.
		const plainItem = command(clean, "item", i);
		if (plainItem != null) {
			flushItems();
			const at = skipSpace(clean, skipOptional(clean, plainItem));
			if (clean[at] === "{") {
				const [arg, next] = takeBrace(clean, at);
				html += `<p class="word__paragraph">${inlineTex(arg)}</p>`;
				i = next;
				continue;
			}
		}

		const item = command(clean, "resumeItem", i);
		if (item != null) {
			const at = skipSpace(clean, item);
			const [arg, next] = takeBrace(clean, at);
			items.push(inlineTex(arg));
			i = next;
			continue;
		}

		i++;
	}
	flushItems();
	return html;
}
