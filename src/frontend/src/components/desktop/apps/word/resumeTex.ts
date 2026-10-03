/** ponytail: supports this resume template; use a TeX renderer for arbitrary documents. */

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

		const wrapped =
			command(source, "textbf", i) ??
			command(source, "emph", i) ??
			command(source, "textit", i) ??
			command(source, "underline", i);
		if (wrapped != null) {
			const tag = source.startsWith("\\textbf", i) ? "b" : source.startsWith("\\underline", i) ? "u" : "i";
			const at = skipSpace(source, wrapped);
			const [inner, next] = takeBrace(source, at);
			out += `<${tag}>${inlineTex(inner)}</${tag}>`;
			i = next;
			continue;
		}

		const color = command(source, "textcolor", i);
		if (color != null) {
			let at = skipSpace(source, color);
			[, at] = takeBrace(source, at);
			at = skipSpace(source, at);
			const [inner, next] = takeBrace(source, at);
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

		const raise = command(source, "raisebox", i);
		if (raise != null) {
			let at = skipSpace(source, raise);
			[, at] = takeBrace(source, at);
			at = skipSpace(source, at);
			const [inner, next] = takeBrace(source, at);
			out += inlineTex(inner);
			i = next;
			continue;
		}

		const resize = command(source, "resizebox", i);
		if (resize != null) {
			let at = skipSpace(source, resize);
			[, at] = takeBrace(source, at);
			at = skipSpace(source, at);
			[, at] = takeBrace(source, at);
			at = skipSpace(source, at);
			const [inner, next] = takeBrace(source, at);
			out += inlineTex(inner);
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
