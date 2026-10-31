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
