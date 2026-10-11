import { NextResponse } from "next/server";
import { checkChatTime } from "@/lib/chat/gate";
import { FAILURE_REPLIES } from "@/lib/chat/messages";
import { wakeModel } from "@/lib/chat/model";

/**
 * Each check waits on the model at most this long, then reports that Adam is still waking up.
 * A cold start takes 1.5–2.5 minutes, and a request that stays silent that long can die on the
 * way back to the visitor without either side noticing, so the terminal checks repeatedly.
 */
const CHECK_MS = 20_000;

export const maxDuration = 30;

/**
 * Wakes Adam's model and answers 204 once it's ready, or 202 if it's still starting, in which
 * case the terminal checks again. The pending check is what keeps Modal booting the GPU. Waking
 * costs no chat time, but a visitor who is out of time can't wake the model.
 */
export async function POST(req: Request) {
	const refusal = await checkChatTime(req, "wake");
	if (refusal) return refusal;

	const timeout = AbortSignal.timeout(CHECK_MS);
	try {
		await wakeModel(AbortSignal.any([req.signal, timeout]));
	} catch (error) {
		if (timeout.aborted) return new Response(null, { status: 202 });
		// A visitor who leaves cancels the request; only other failures are worth logging.
		if (!req.signal.aborted) console.error("chat: waking the model failed:", error);
		return NextResponse.json({ detail: FAILURE_REPLIES.broken }, { status: 502 });
	}
	return new Response(null, { status: 204 });
}
