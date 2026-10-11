import "server-only";
import type { ChatMessage } from "@/lib/chat/messages";
import { completionText } from "@/lib/chat/sse";

/** Longest reply in tokens. Adam's texts are short, and the cap ends a rare repetition loop early. */
const MAX_REPLY_TOKENS = 256;

type ModelMessage = { role: "system" | ChatMessage["role"]; content: string };

/**
 * Streams Adam's reply from the fine-tuned model: vLLM's OpenAI-compatible API on Modal,
 * behind a Modal proxy token (see serving/app.py in the adam repo).
 */
export async function* streamReply(messages: ModelMessage[], signal: AbortSignal): AsyncGenerator<string> {
	const url = process.env.MODAL_URL;
	const token = process.env.MODAL_PROXY_TOKEN;
	if (!url || !token) {
		throw new Error("the chat model isn't configured");
	}

	const response = await fetch(`${url.replace(/\/+$/, "")}/v1/chat/completions`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
		body: JSON.stringify({ model: "adam", messages, stream: true, max_tokens: MAX_REPLY_TOKENS }),
		signal,
	});
	if (!response.ok || !response.body) {
		throw new Error(`model error ${response.status}: ${(await response.text()).slice(0, 200)}`);
	}

	yield* completionText(response.body);
}
