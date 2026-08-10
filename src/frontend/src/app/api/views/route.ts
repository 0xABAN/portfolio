import { NextResponse } from "next/server";
import { getViewCount, recordView } from "@/lib/views";

export async function POST(req: Request) {
	const userAgent = req.headers.get("user-agent") ?? "";
	const isPrefetch = req.headers.get("purpose") === "prefetch";
	const ip =
		req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

	const count = await recordView({ userAgent, ip, isPrefetch });
	return NextResponse.json({ count });
}

export async function GET() {
	const count = await getViewCount();
	return NextResponse.json({ count });
}
