/** Chat messages as the terminal sends them and the chat route checks them. Shared by both, so it stays free of server-only code. */

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Shown for rate limits; the terminal also matches it to keep the reply in character. */
export const BROKE_MSG = "sry i'm too broke to afford this rn";

/** Longest message accepted. Adam's own texts rarely run past a few hundred characters. */
export const MAX_MESSAGE_CHARS = 2000;
/** Most recent messages kept per request; older ones are dropped. */
export const MAX_HISTORY_MESSAGES = 20;
/**
 * Conversation budget in estimated tokens. The model's 8,192-token window also holds the
 * system prompt about Adam (about 2,500 tokens) and the reply.
 */
export const MAX_HISTORY_TOKENS = 4000;

/** A request the chat route rejects with a 400. */
export class ChatInputError extends Error {}

/**
 * A deliberately high token estimate: Qwen averages about 4 characters per token in
 * English, and emoji or other scripts take more tokens per character.
 */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 3);
}

/** Validates a request's messages and drops the oldest ones until the conversation fits the model. */
export function parseMessages(data: unknown): ChatMessage[] {
	if (!Array.isArray(data) || data.length === 0) {
		throw new ChatInputError("messages must be a non-empty array");
	}

	const messages = data.map((item: unknown, i): ChatMessage => {
		const { role, content } = (item ?? {}) as { role?: unknown; content?: unknown };
		if (role !== "user" && role !== "assistant") {
			throw new ChatInputError(`messages[${i}].role must be user or assistant`);
		}
		if (typeof content !== "string") {
			throw new ChatInputError(`messages[${i}].content must be a string`);
		}
		if (content.length > MAX_MESSAGE_CHARS) {
			throw new ChatInputError(`messages[${i}] is longer than ${MAX_MESSAGE_CHARS} characters`);
		}
		return { role, content };
	});

	if (messages.at(-1)?.role !== "user") {
		throw new ChatInputError("the last message must be from the user");
	}

	// Keep the newest messages; the last one is the user's, so it always survives.
	const kept = messages.slice(-MAX_HISTORY_MESSAGES);
	let tokens = kept.reduce((sum, message) => sum + estimateTokens(message.content), 0);
	while (kept.length > 1 && tokens > MAX_HISTORY_TOKENS) {
		tokens -= estimateTokens(kept.shift()!.content);
	}
	return kept;
}
