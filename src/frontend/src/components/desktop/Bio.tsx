import "./bio.css";

const SECTIONS = [
	{
		h: "origins:",
		p: "hey, i'm adam. puerto-rican born, dominican bred, and usa based. fun fact, i have an identical twin. we both live in pennsylvania.",
	},
	{
		h: "interests:",
		p: "i'm interested in software engineering, ai, and the intersection between the two. i also like to watch tv shows (shout out to aot & got), listen to music, and hang out with my friends (sometimes).",
	},
	{
		h: "highlights:",
		p: "i've won 3 hackathons: first at yhacks (yale), first at hackprinceton, and second solo at nexhacks (bytedance).",
	},
	{
		h: "career:",
		p: "i've interned at companies like amazon and ibm. at penn state, i've held leadership positions at nittany ai, nittany data labs, and the claude builder club.",
	},
] as const;

export function Bio() {
	return (
		<div className="bio" aria-label="bio">
			{SECTIONS.map((s) => (
				<section key={s.h} className="bio__section">
					<h2 className="bio__h">{s.h}</h2>
					<p className="bio__p">{s.p}</p>
				</section>
			))}
		</div>
	);
}
