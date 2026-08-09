import "./terminal.css";

const LINES = [
	"Microsoft(R) Windows 98",
	"   (C)Copyright Microsoft Corp 1981-1998.",
	"",
	"C:\\PORTFOLIO>pi",
	"",
	"pi coding agent  ·  session ready",
	"model: local  ·  cwd: C:\\PORTFOLIO",
	"",
	"> _",
] as const;

export function Terminal() {
	return (
		<div className="term">
			<div className="term__menu" aria-hidden>
				<span>File</span>
				<span>Edit</span>
				<span>Search</span>
				<span>Help</span>
			</div>
			<pre className="term__body">
				{LINES.map((line, i) => (
					<span key={i} className="term__line">
						{line.endsWith("_") ? (
							<>
								{line.slice(0, -1)}
								<span className="term__cursor" aria-hidden />
							</>
						) : (
							line || " "
						)}
					</span>
				))}
			</pre>
		</div>
	);
}
