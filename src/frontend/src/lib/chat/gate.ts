import "server-only";
import { NextResponse } from "next/server";
import { allowChat } from "@/lib/chat/limits";
import { FAILURE_REPLIES } from "@/lib/chat/messages";
import { redis } from "@/lib/redis";

/**
 * Counts a request toward the visitor's daily chat time. Returns the response refusing it,
 * or null if the visitor still has time.
 */
export async function chargeChatTime(req: Request): Promise<NextResponse | null> {
	const store = redis();
	if (!store) {
		console.error("chat: Upstash isn't configured, so the chat time limit can't be checked");
		return NextResponse.json({ detail: FAILURE_REPLIES.broken }, { status: 503 });
	}

	const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
	if (!(await allowChat(store, ip))) {
		return NextResponse.json({ detail: FAILURE_REPLIES.outOfTime }, { status: 429 });
	}
	return null;
}
