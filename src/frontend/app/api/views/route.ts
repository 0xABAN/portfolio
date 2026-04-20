import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const BOT_PATTERN = /bot|crawl|spider|curl|wget|python|go-http/i;
const KEY = "portfolio:views";

export async function POST(req: Request) {
  const ua = req.headers.get("user-agent") ?? "";
  if (BOT_PATTERN.test(ua)) {
    const count = (await redis.get<number>(KEY)) ?? 0;
    return NextResponse.json({ count });
  }

  if (req.headers.get("purpose") === "prefetch") {
    const count = (await redis.get<number>(KEY)) ?? 0;
    return NextResponse.json({ count });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const dedupKey = `portfolio:views:seen:${ip}`;
  const isNew = await redis.set(dedupKey, 1, { nx: true, ex: 3600 });

  if (isNew !== null) {
    await redis.incr(KEY);
  }

  const count = (await redis.get<number>(KEY)) ?? 0;
  return NextResponse.json({ count });
}

export async function GET() {
  const count = (await redis.get<number>(KEY)) ?? 0;
  return NextResponse.json({ count });
}
