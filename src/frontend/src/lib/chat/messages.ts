export type ChatMessage = { role: "user" | "assistant"; content: string };

export const MAX_MESSAGE_CHARS = 2000;

export const FAILURE_REPLIES = {
	outOfTime: "sry i'm too broke to afford this rn",
	tooLong: `thats a lot lol, keep it under ${MAX_MESSAGE_CHARS} characters`,
	malformed: "that came through weird, send it again?",
	broken: "my brain isn't working rn, try again in a bit",
	unreachable: "can't reach u rn, check ur internet",
	silent: "i blanked lol, ask me again",
};

export class ChatInputError extends Error {}

export class MessageTooLongError extends ChatInputError {}

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
