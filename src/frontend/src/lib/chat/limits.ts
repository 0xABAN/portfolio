/**
 * Chat rate limits, counted in Redis so every serverless instance shares them.
 *
 * Both limits use fixed windows named after the window itself (the minute, or the UTC day),
 * so a counter that somehow misses its expiry only lingers; it never blocks a later window.
 */

/** Requests one visitor (IP) can send per UTC day. */
export const DAILY_IP_LIMIT = 10;
/** Requests the whole site can send per minute, so a burst can't hog the one GPU. */
export const GLOBAL_PER_MINUTE_LIMIT = 15;

/** The Redis commands the limiter needs, so tests can substitute an in-memory fake. */
export type Counter = {
	incr(key: string): Promise<number>;
	expire(key: string, seconds: number): Promise<unknown>;
	get<T>(key: string): Promise<T | null>;
};

export type ChatAllowance = { ok: boolean; remaining: number };

/** Counts one chat request against the site-wide per-minute limit, then the visitor's daily limit. */
export async function consumeChat(redis: Counter, ip: string, now = new Date()): Promise<ChatAllowance> {
	const dayKey = `portfolio:chat:ip:${ip}:${now.toISOString().slice(0, 10)}`;
	const minuteKey = `portfolio:chat:minute:${Math.floor(now.getTime() / 60_000)}`;

	// A request turned away by the site-wide limit doesn't use up the visitor's daily quota.
	if ((await bump(redis, minuteKey, 2 * 60)) > GLOBAL_PER_MINUTE_LIMIT) {
		const used = (await redis.get<number>(dayKey)) ?? 0;
		return { ok: false, remaining: Math.max(0, DAILY_IP_LIMIT - used) };
	}

	const used = await bump(redis, dayKey, 2 * 24 * 60 * 60);
	return { ok: used <= DAILY_IP_LIMIT, remaining: Math.max(0, DAILY_IP_LIMIT - used) };
}

/** Increments a window's counter, expiring it once the window is over. */
async function bump(redis: Counter, key: string, ttlSeconds: number): Promise<number> {
	const count = await redis.incr(key);
	if (count === 1) {
		await redis.expire(key, ttlSeconds);
	}
	return count;
}
