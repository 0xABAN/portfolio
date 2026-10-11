/**
 * Chat time limit: each visitor (IP) gets 15 minutes of conversation per UTC day.
 *
 * A message costs the time since the visitor's previous request, up to 5 minutes. The model's
 * GPU stays up for 5 minutes after any request, so this is roughly the GPU time the visitor keeps
 * busy by chatting. A longer gap starts a new conversation and costs nothing.
 *
 * Waking the model costs nothing, so visitors aren't charged for waiting on a cold start, and a
 * message right after Adam wakes up costs only the moment since the last wake-up check. A visitor
 * who is out of time can't wake the model, though.
 *
 * The counts live in Redis because serverless instances share no memory.
 */

export const DAILY_CHAT_MS = 15 * 60_000;
export const CONVERSATION_GAP_MS = 5 * 60_000;

export type ChatRequest = "wake" | "message";

/** The Redis commands the limit needs, so tests can substitute an in-memory fake. */
export type Store = {
	set(key: string, value: number, options: { get: true; px: number }): Promise<unknown>;
	get<T>(key: string): Promise<T | null>;
	incrby(key: string, increment: number): Promise<number>;
	expire(key: string, seconds: number): Promise<unknown>;
};

/** Records a request from `ip` at `now` (ms) and returns whether the visitor still has chat time today. */
export async function allowChat(redis: Store, ip: string, request: ChatRequest, now = Date.now()): Promise<boolean> {
	// Swap in this request's time and get the previous one back in one atomic step. The key
	// expires after the gap, so a missing previous time means a new conversation.
	const previous = await redis.set(`portfolio:chat:last:${ip}`, now, { get: true, px: CONVERSATION_GAP_MS });
	const usedKey = `portfolio:chat:used:${ip}:${new Date(now).toISOString().slice(0, 10)}`;

	if (request === "wake") {
		return ((await redis.get<number>(usedKey)) ?? 0) < DAILY_CHAT_MS;
	}

	const gap = previous === null ? 0 : Math.min(now - Number(previous), CONVERSATION_GAP_MS);
	const used = await redis.incrby(usedKey, gap);
	if (used === gap) {
		// A new day's counter. Its key names the day, so one that misses its expiry only lingers.
		await redis.expire(usedKey, 2 * 24 * 60 * 60);
	}
	return used <= DAILY_CHAT_MS;
}
