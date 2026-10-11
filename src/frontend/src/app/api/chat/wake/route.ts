import { NextResponse } from "next/server";
import { chargeChatTime } from "@/lib/chat/gate";
import { FAILURE_REPLIES } from "@/lib/chat/messages";
import { wakeModel } from "@/lib/chat/model";

/** The model's GPU takes about 90 s to start from zero, so allow the plan's full 300 s. */
export const maxDuration = 300;

/**
 * Wakes Adam's model when the terminal opens and answers once it's ready, so the terminal
 * greets visitors only when Adam can reply. It counts toward the visitor's daily chat time
 * like a message, so reopening the terminal can't keep the GPU running for free.
 */
export async function POST(req: Request) {
	const refusal = await chargeChatTime(req);
	if (refusal) return refusal;

	try {
		await wakeModel(req.signal);
	} catch (error) {
		// A visitor who leaves cancels the request; only other failures are worth logging.
		if (!req.signal.aborted) console.error("chat: waking the model failed:", error);
		return NextResponse.json({ detail: FAILURE_REPLIES.broken }, { status: 502 });
	}
	return new Response(null, { status: 204 });
}
