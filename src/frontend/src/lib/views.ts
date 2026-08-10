import "server-only";
import { Redis } from "@upstash/redis";

// same key/logic as main branch — keep incrementing the live portfolio counter
const KEY = "portfolio:views";
const BOT_PATTERN = /bot|crawl|spider|curl|wget|python|go-http/i;
/** production site still on main — same Upstash DB behind /api/views */
const PROD_VIEWS = "https://advm.dev/api/views";

function client() {
	const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
	const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
	if (!url?.startsWith("https") || !token || token.includes("SENSITIVE")) {
		return null;
	}
	return new Redis({ url, token });
}

async function viaProduction(
	method: "GET" | "POST",
	headers?: { userAgent?: string; ip?: string },
): Promise<number> {
	try {
		const h = new Headers();
		if (headers?.userAgent) h.set("user-agent", headers.userAgent);
		if (headers?.ip) h.set("x-forwarded-for", headers.ip);
		const res = await fetch(PROD_VIEWS, {
			method,
			headers: h,
			cache: "no-store",
		});
		if (!res.ok) return 0;
		const data = (await res.json()) as { count?: number };
		return typeof data.count === "number" ? data.count : 0;
	} catch {
		return 0;
	}
}

export async function getViewCount(): Promise<number> {
	const redis = client();
	if (!redis) return viaProduction("GET");
	try {
		return (await redis.get<number>(KEY)) ?? 0;
	} catch {
		return 0;
	}
}

export async function recordView({
	userAgent,
	ip,
	isPrefetch,
}: {
	userAgent: string;
	ip: string;
	isPrefetch: boolean;
}): Promise<number> {
	const redis = client();
	if (!redis) {
		if (BOT_PATTERN.test(userAgent) || isPrefetch) {
			return viaProduction("GET");
		}
		return viaProduction("POST", { userAgent, ip });
	}

	if (BOT_PATTERN.test(userAgent) || isPrefetch) {
		return getViewCount();
	}

	try {
		const dedupKey = `portfolio:views:seen:${ip}`;
		const isNew = await redis.set(dedupKey, 1, { nx: true, ex: 3600 });

		if (isNew !== null) {
			return redis.incr(KEY);
		}

		return getViewCount();
	} catch {
		return getViewCount();
	}
}
