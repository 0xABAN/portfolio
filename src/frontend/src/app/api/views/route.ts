import { NextResponse } from "next/server";
import { clientIp, redis } from "@/lib/server";

const KEY = "portfolio:views";
const BOTS = /bot|crawl|spider|curl|wget|python|go-http/i;

async function production(method: "GET" | "POST", headers: Record<string, string> = {}): Promise<number> {
	try {
		const res = await fetch("https://advm.dev/api/views", { method, headers, cache: "no-store" });
		if (!res.ok) return 0;
		const { count } = (await res.json()) as { count?: number };
		return typeof count === "number" ? count : 0;
	} catch {
		return 0;
	}
}

async function viewCount(): Promise<number> {
	const store = redis();
	if (!store) return production("GET");
	try {
		return (await store.get<number>(KEY)) ?? 0;
	} catch {
		return 0;
	}
}

async function recordView(req: Request): Promise<number> {
	const userAgent = req.headers.get("user-agent") ?? "";
	const ip = clientIp(req);
	if (BOTS.test(userAgent) || req.headers.get("purpose") === "prefetch") return viewCount();

	const store = redis();
	if (!store) return production("POST", { "user-agent": userAgent, "x-forwarded-for": ip });
	try {
		const isNew = await store.set(`${KEY}:seen:${ip}`, 1, { nx: true, ex: 24 * 60 * 60 });
		return isNew === null ? viewCount() : store.incr(KEY);
	} catch {
		return viewCount();
	}
}

export async function GET() {
	return NextResponse.json({ count: await viewCount() });
}

export async function POST(req: Request) {
	return NextResponse.json({ count: await recordView(req) });
}
