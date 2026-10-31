import "server-only";
import { Redis } from "@upstash/redis";

export function redis(): Redis | null {
	const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
	const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
	if (!url?.startsWith("https") || !token || token.includes("SENSITIVE")) {
		return null;
	}
	return new Redis({ url, token });
}
