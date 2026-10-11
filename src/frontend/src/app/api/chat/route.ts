import { NextResponse } from "next/server";
import { checkChatTime } from "@/lib/chat/gate";
import { ChatInputError, FAILURE_REPLIES, MessageTooLongError, parseMessages } from "@/lib/chat/messages";
import { streamReply } from "@/lib/chat/model";
import { systemPrompt } from "@/lib/chat/persona";
import { sseEvent } from "@/lib/chat/sse";

/** The model's GPU takes about 90 s to start from zero, so allow the plan's full 300 s. */
export const maxDuration = 300;

/**
 * Streams Adam's reply as "token" events, then "done", or "error" if the model fails. Every
 * failure's `detail` is one of FAILURE_REPLIES, which the terminal shows as Adam's reply.
 */
export async function POST(req: Request) {
	let messages;
	try {
		const body = (await req.json()) as { messages?: unknown } | null;
		messages = parseMessages(body?.messages);
	} catch (error) {
		if (error instanceof MessageTooLongError) {
			return NextResponse.json({ detail: FAILURE_REPLIES.tooLong }, { status: 400 });
		}
		if (error instanceof ChatInputError || error instanceof SyntaxError) {
			return NextResponse.json({ detail: FAILURE_REPLIES.malformed }, { status: 400 });
		}
		throw error;
	}

	const refusal = await checkChatTime(req, "message");
	if (refusal) return refusal;

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
				// A visitor who leaves cancels the model request; only other failures are worth logging.
				if (!req.signal.aborted) console.error("chat: the model's reply failed:", error);
				send(sseEvent("error", { detail: FAILURE_REPLIES.broken }));
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
