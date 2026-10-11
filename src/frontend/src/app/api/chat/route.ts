import { NextResponse } from "next/server";
import { allowChat } from "@/lib/chat/limits";
import { BROKE_MSG, ChatInputError, parseMessages } from "@/lib/chat/messages";
import { streamReply } from "@/lib/chat/model";
import { systemPrompt } from "@/lib/chat/persona";
import { sseEvent } from "@/lib/chat/sse";
import { redis } from "@/lib/redis";

/** The model's GPU takes about 90 s to start from zero, so allow the plan's full 300 s. */
export const maxDuration = 300;

/** Streams Adam's reply as "token" events, then "done", or "error" if the model fails. */
export async function POST(req: Request) {
	let messages;
	try {
		const body = (await req.json()) as { messages?: unknown } | null;
		messages = parseMessages(body?.messages);
	} catch (error) {
		if (error instanceof ChatInputError || error instanceof SyntaxError) {
			return NextResponse.json({ detail: error.message }, { status: 400 });
		}
		throw error;
	}

	const store = redis();
	if (!store) {
		return NextResponse.json({ detail: "the chat time limit isn't configured" }, { status: 503 });
	}

	const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	if (!(await allowChat(store, ip))) {
		return NextResponse.json({ detail: BROKE_MSG }, { status: 429 });
	}

	const conversation = [{ role: "system" as const, content: systemPrompt() }, ...messages];

	// Writes stop once the visitor disconnects; req.signal then cancels the model request too.
	let open = true;
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (chunk: Uint8Array) => {
				if (open) controller.enqueue(chunk);
			};

			try {
				for await (const text of streamReply(conversation, req.signal)) {
					send(sseEvent("token", { content: text }));
				}
				send(sseEvent("done", {}));
			} catch (error) {
				send(sseEvent("error", { detail: error instanceof Error ? error.message : "chat failed" }));
			} finally {
				if (open) controller.close();
			}
		},
		cancel() {
			open = false;
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"X-Accel-Buffering": "no",
		},
	});
}
