import { NextResponse } from "next/server";
import { checkChatTime } from "@/lib/chat/gate";
import { FAILURE_REPLIES } from "@/lib/chat/messages";
import { wakeModel } from "@/lib/chat/model";

const CHECK_MS = 20_000;

export const maxDuration = 30;

export async function POST(req: Request) {
	const refusal = await checkChatTime(req, "wake");
	if (refusal) return refusal;

	const timeout = AbortSignal.timeout(CHECK_MS);
	try {
		await wakeModel(AbortSignal.any([req.signal, timeout]));
	} catch (error) {
		if (timeout.aborted) return new Response(null, { status: 202 });
		if (!req.signal.aborted) console.error("chat: waking the model failed:", error);
		return NextResponse.json({ detail: FAILURE_REPLIES.broken }, { status: 502 });
	}
	return new Response(null, { status: 204 });
}
