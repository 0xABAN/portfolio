import type { Metadata } from "next";

export const metadata: Metadata = {
	title: "Privacy policy · resume",
};

/** Privacy policy for "resume", the Google OAuth app behind Adam's job-application tool. */
export default function PrivacyPolicy() {
	return (
		<main
			style={{
				minHeight: "100vh",
				background: "#fff",
				padding: "3rem 1.5rem",
			}}
		>
			<article style={{ maxWidth: "40rem", margin: "0 auto", display: "grid", gap: "1rem" }}>
				<h1 style={{ fontSize: "1.75rem", fontWeight: 700 }}>Privacy policy</h1>
				<p>Effective October 4, 2026.</p>
				<p>
					&ldquo;resume&rdquo; is a personal tool Adam Torres Encarnacion uses to manage his own job
					applications. It reads his Gmail (read-only) to find application confirmations and
					verification codes, and it edits a Google Sheet he owns to track applications.
				</p>
				<p>
					The data stays on his computer, is used only for this purpose, and is never shared or
					sold.
				</p>
				<p>
					Contact: <a href="mailto:admr0805@gmail.com">admr0805@gmail.com</a>
				</p>
			</article>
		</main>
	);
}
