import "server-only";
import type { ChatMessage } from "@/lib/chat/messages";
import { completionText } from "@/lib/chat/sse";

const MAX_REPLY_TOKENS = 256;

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
