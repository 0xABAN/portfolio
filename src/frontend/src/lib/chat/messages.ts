/** Chat messages as the terminal sends them and the chat route checks them. Shared by both, so it stays free of server-only code. */

export type ChatMessage = { role: "user" | "assistant"; content: string };

/** Longest message accepted. Adam's own texts rarely run past a few hundred characters. */
export const MAX_MESSAGE_CHARS = 2000;

/**
 * What Adam says when he can't reply, shown as his message in the terminal. Visitors only ever
 * see these; the technical cause goes to the server logs.
 */
export const FAILURE_REPLIES = {
	/** The visitor used up today's chat time. */
	outOfTime: "sry i'm too broke to afford this rn",
	tooLong: `thats a lot lol, keep it under ${MAX_MESSAGE_CHARS} characters`,
	/** A request the terminal wouldn't send, so it came from somewhere else or got mangled. */
	malformed: "that came through weird, send it again?",
	/** The model or the server failed. */
	broken: "my brain isn't working rn, try again in a bit",
	/** The visitor's browser couldn't reach the server. */
	unreachable: "can't reach u rn, check ur internet",
	/** The model finished without saying anything. */
	silent: "i blanked lol, ask me again",
};

/** A request the chat route rejects with a 400. The message is technical, for the logs. */
export class ChatInputError extends Error {}

export class MessageTooLongError extends ChatInputError {}

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
			throw new MessageTooLongError(`messages[${i}] is longer than ${MAX_MESSAGE_CHARS} characters`);
		}
		return { role, content };
	});

	if (messages.at(-1)?.role !== "user") {
		throw new ChatInputError("the last message must be from the user");
	}
	return messages;
}
