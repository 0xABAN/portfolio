import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The chat route reads Adam's context files at run time, so ship them with its function.
  outputFileTracingIncludes: {
    "/api/chat": ["./src/lib/chat/context/**"],
  },
};

export default nextConfig;
