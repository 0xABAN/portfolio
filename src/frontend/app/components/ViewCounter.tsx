import { headers } from "next/headers";
import { recordView } from "@/lib/views";
import { ViewCounterDisplay } from "./ViewCounterDisplay";

export async function ViewCounter() {
  const h = await headers();
  const userAgent = h.get("user-agent") ?? "";
  const isPrefetch = h.get("purpose") === "prefetch";
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const count = await recordView({ userAgent, ip, isPrefetch });

  return <ViewCounterDisplay count={count} />;
}
