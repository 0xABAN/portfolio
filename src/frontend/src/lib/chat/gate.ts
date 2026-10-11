import "server-only";
import { NextResponse } from "next/server";
import { allowChat, type ChatRequest } from "@/lib/chat/limits";
import { FAILURE_REPLIES } from "@/lib/chat/messages";
import { redis } from "@/lib/redis";

/**
 * Checks a request against the visitor's daily chat time, spending some if it's a message.
 * Returns the response refusing it, or null if the visitor still has time.
 */
export async function checkChatTime(req: Request, request: ChatRequest): Promise<NextResponse | null> {
	const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

	const store = redis();
	if (!store) {
		console.error("chat: Upstash isn't configured, so the chat time limit can't be checked");
		return NextResponse.json({ detail: FAILURE_REPLIES.broken }, { status: 503 });
	}

	if (!(await allowChat(store, ip, request))) {
		return NextResponse.json({ detail: FAILURE_REPLIES.outOfTime }, { status: 429 });
	}
	return null;
}
