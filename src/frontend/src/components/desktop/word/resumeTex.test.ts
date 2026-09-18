import assert from "node:assert/strict";
import { test } from "node:test";
import { inlineTex, resumeToPage } from "./resumeTex";

test("resumeToPage renders jake-template commands", () => {
	const tex = String.raw`
\begin{document}
\begin{center}
\textbf{\Huge Adam}\\
\href{mailto:a@b}{Email}
\end{center}
\section{\textbf{WORK EXPERIENCE}}
\resumeSubheading{Amazon}{2026}{Intern}{Remote}
\resumeItem{Did \textbf{things} for \$1}
\end{document}
`;
	const html = resumeToPage(tex);
	assert.match(html, /Adam/);
	assert.match(html, /WORK EXPERIENCE/);
	assert.match(html, /Amazon/);
	assert.match(html, /<b>things<\/b>/);
	assert.match(html, /\$1/);
});

test("inlineTex preserves contact icons while translating boxes and math", () => {
	const contact = String.raw`University Park, PA $|$ \href{mailto:a@b}{\underline{Email \faEnvelope}} $|$ \href{https://advm.dev/}{\underline{Portfolio \raisebox{-0.0625em}{\resizebox{0.875em}{0.875em}{$\blacktriangle$}}}}`;
	const html = inlineTex(contact);
	assert.match(html, /University Park, PA \|/);
	assert.match(html, /word__inline-icon--envelope/);
	assert.match(html, /Portfolio ▲/);
	assert.doesNotMatch(html, /0\.0625em|faEnvelope|raisebox|textless/);
});

test("plain item blocks retain every technical-skills row and escaped punctuation", () => {
	const html = resumeToPage(String.raw`\begin{document}
\section{TECHNICAL SKILLS}
\begin{itemize}[label={}]
\small{\item{
\textbf{Programming Languages:}{ Python, C\#, C++} \\
\textbf{Frameworks:}{ PyTorch, React} \\
\textbf{Developer Tools:}{ Git, Vim/Neovim} \\
\textbf{Databases:}{ PostgreSQL, Redis} \\
\textbf{Cloud/Infra:}{ AWS, Docker, CI/CD}
}}
\end{itemize}
\section{PROJECTS}
\resumeProjectHeading{\href{https://example.com}{\faGithub\ Agent-Driven Vision Annotation}}{2026}
\resumeItem{Draw \& navigate \{an open canvas\}; latency \textless{}300 ms.}
\end{document}`);
	for (const label of ["Programming Languages:", "Frameworks:", "Developer Tools:", "Databases:", "Cloud/Infra:"]) {
		assert.ok(html.includes(label), `${label} was omitted`);
	}
	assert.match(html, /C#/);
	assert.equal((html.match(/<br\/>/g) ?? []).length, 4);
	assert.match(html, /word__inline-icon--github/);
	assert.match(html, /2026/);
	assert.match(html, /Draw &amp; navigate \{an open canvas\}; latency &lt;300 ms/);
	assert.doesNotMatch(html, /\\|faGithub/);
});

test("all supported brand icons render without swallowing neighboring text", () => {
	const html = inlineTex(String.raw`Email \faEnvelope | LinkedIn \faLinkedin | GitHub \faGithub\ Project`);
	for (const icon of ["envelope", "linkedin", "github"]) assert.match(html, new RegExp(`word__inline-icon--${icon}`));
	assert.match(html, / Project$/);
	assert.doesNotMatch(html, /\\/);
});

test("remote resume text cannot inject markup or executable links", () => {
	assert.match(inlineTex("<img src=x onerror=alert(1)>"), /&lt;img/);
	assert.doesNotMatch(inlineTex(String.raw`\href{javascript:alert(1)}{Click me}`), /<a/);
	const safe = inlineTex(String.raw`\href{https://example.com/?q="quoted"&x=1}{Safe}`);
	assert.match(safe, /&quot;quoted&quot;&amp;x=1/);
});
