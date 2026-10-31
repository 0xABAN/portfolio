import "server-only";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { allowChat, completionText, FAILURE_REPLIES, type ChatMessage, type ChatRequest } from "@/lib/chat";

const MAX_REPLY_TOKENS = 256;

export function redis(): Redis | null {
	const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
	const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
	if (!url?.startsWith("https") || !token || token.includes("SENSITIVE")) {
		return null;
	}
	return new Redis({ url, token });
}

export function clientIp(req: Request): string {
	return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

export async function checkChatTime(req: Request, request: ChatRequest): Promise<NextResponse | null> {
	const ip = clientIp(req);
	if ((process.env.CHAT_UNLIMITED_IPS ?? "").split(",").some((entry) => entry.trim() === ip)) return null;

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

function modelRequest(path: string, init: RequestInit): Promise<Response> {
	const url = process.env.MODAL_URL;
	const token = process.env.MODAL_PROXY_TOKEN;
	if (!url || !token) {
		throw new Error("the chat model isn't configured");
	}

	return fetch(`${url.replace(/\/+$/, "")}${path}`, {
		...init,
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
	});
}

export async function wakeModel(signal: AbortSignal): Promise<void> {
	const response = await modelRequest("/health", { signal });
	if (!response.ok) {
		throw new Error(`model health check failed with ${response.status}`);
	}
}

export async function* streamReply(messages: ChatMessage[], signal: AbortSignal): AsyncGenerator<string> {
	const response = await modelRequest("/v1/chat/completions", {
		method: "POST",
		body: JSON.stringify({ model: "adam", messages, stream: true, max_tokens: MAX_REPLY_TOKENS }),
		signal,
	});
	if (!response.ok || !response.body) {
		throw new Error(`model error ${response.status}: ${(await response.text()).slice(0, 200)}`);
	}

	yield* completionText(response.body);
}
