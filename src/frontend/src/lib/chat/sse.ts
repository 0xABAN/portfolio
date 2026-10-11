/** Server-sent events: reading the model's OpenAI-style stream, and writing the terminal's events. */

const encoder = new TextEncoder();

/** One event in the stream the terminal reads: "token", "done", or "error". */
export function sseEvent(event: string, data: object): Uint8Array {
	return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

/** Yields the text of each chunk in an OpenAI-compatible chat completion stream. */
export async function* completionText(body: ReadableStream<Uint8Array<ArrayBuffer>>): AsyncGenerator<string> {
	const reader = body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = "";

	for (;;) {
		const { done, value } = await reader.read();
		if (done) return;

		// A network chunk can end mid-line, so keep the unfinished line for the next read.
		const lines = (buffer + value).split("\n");
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			if (!line.startsWith("data:")) continue;
			const data = line.slice(5).trim();
			if (data === "[DONE]") return;

			const chunk = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
			const text = chunk.choices?.[0]?.delta?.content;
			if (text) yield text;
		}
	}
}
