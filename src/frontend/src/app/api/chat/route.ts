import { NextResponse } from "next/server";
import { checkChatTime } from "@/lib/chat/gate";
import { ChatInputError, FAILURE_REPLIES, MessageTooLongError, parseMessages } from "@/lib/chat/messages";
import { streamReply } from "@/lib/chat/model";
import { sseEvent } from "@/lib/chat/sse";

export const maxDuration = 300;

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

	let open = true;
	const stream = new ReadableStream<Uint8Array>({
		async start(controller) {
			const send = (chunk: Uint8Array) => {
				if (open) controller.enqueue(chunk);
			};

			try {
				for await (const text of streamReply(messages, req.signal)) {
					send(sseEvent("token", { content: text }));
				}
				send(sseEvent("done", {}));
			} catch (error) {
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
