import "server-only";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const BOT_PATTERN = /bot|crawl|spider|curl|wget|python|go-http/i;
const KEY = "portfolio:views";

export async function getViewCount(): Promise<number> {
  return (await redis.get<number>(KEY)) ?? 0;
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
  if (BOT_PATTERN.test(userAgent) || isPrefetch) {
    return getViewCount();
  }

  const dedupKey = `portfolio:views:seen:${ip}`;
  const isNew = await redis.set(dedupKey, 1, { nx: true, ex: 3600 });

  if (isNew !== null) {
    await redis.incr(KEY);
  }

  return getViewCount();
}
