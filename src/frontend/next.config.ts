import { readdirSync } from "node:fs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	env: {
		PUBLIC_IMAGES: JSON.stringify(
			readdirSync("public", { recursive: true, encoding: "utf8" })
				.filter((file) => /\.(png|jpg|webp|svg|cur)$/.test(file))
				.map((file) => `/${file}`),
		),
	},
};

export default nextConfig;
