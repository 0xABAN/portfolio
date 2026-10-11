/** Chat messages as the terminal sends them and the chat route checks them. Shared by both, so it stays free of server-only code. */

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Shown when a visitor runs out of chat time; the terminal also matches it to keep the reply in character. */
export const BROKE_MSG = "sry i'm too broke to afford this rn";

/** Longest message accepted. Adam's own texts rarely run past a few hundred characters. */
export const MAX_MESSAGE_CHARS = 2000;

/** A request the chat route rejects with a 400. */
export class ChatInputError extends Error {}

/** Validates a request's messages: user and assistant turns only, ending with the user's. */
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
	return messages;
}
