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

export const DAILY_CHAT_MS = 45 * 60_000;
export const CONVERSATION_GAP_MS = 5 * 60_000;

export type ChatRequest = "wake" | "message";

export type Store = {
	set(key: string, value: number, options: { get: true; px: number }): Promise<unknown>;
	get<T>(key: string): Promise<T | null>;
	incrby(key: string, increment: number): Promise<number>;
	expire(key: string, seconds: number): Promise<unknown>;
};

export async function allowChat(redis: Store, ip: string, request: ChatRequest, now = Date.now()): Promise<boolean> {
	const previous = await redis.set(`portfolio:chat:last:${ip}`, now, { get: true, px: CONVERSATION_GAP_MS });
	const usedKey = `portfolio:chat:used:${ip}:${new Date(now).toISOString().slice(0, 10)}`;

	if (request === "wake") {
		return ((await redis.get<number>(usedKey)) ?? 0) < DAILY_CHAT_MS;
	}

	const gap = previous === null ? 0 : Math.min(now - Number(previous), CONVERSATION_GAP_MS);
	const used = await redis.incrby(usedKey, gap);
	if (used === gap) {
		await redis.expire(usedKey, 2 * 24 * 60 * 60);
	}
	return used <= DAILY_CHAT_MS;
}

const encoder = new TextEncoder();

export function sseEvent(event: string, data: object): Uint8Array {
	return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function* completionText(body: ReadableStream<Uint8Array<ArrayBuffer>>): AsyncGenerator<string> {
	const reader = body.pipeThrough(new TextDecoderStream()).getReader();
	let buffer = "";

	for (;;) {
		const { done, value } = await reader.read();
		if (done) return;

		const lines = (buffer + value).split("\n");
		buffer = lines.pop() ?? "";

		for (const line of lines) {
			if (!line.startsWith("data:")) continue;
			const data = line.slice(5).trim();
			if (data === "[DONE]") return;

			const chunk = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
			const text = chunk.choices?.[0]?.delta?.content;
			if (text) yield text;
		}
	}
}
