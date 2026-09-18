const RESUME =
	"https://raw.githubusercontent.com/0xABAN/jobs/main/src/resume/default/Adam_Torres_Encarnacion_Resume.tex";

/** Live GitHub source for the Word window. */
export async function GET() {
	const upstream = await fetch(RESUME, { next: { revalidate: 60 } });
	if (!upstream.ok) {
		return new Response("Resume unavailable", { status: 502 });
	}
	return new Response(await upstream.text(), {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
			"Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
		},
	});
}
