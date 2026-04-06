import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: [
    "*.space.z.ai",
    "space.z.ai",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "http://localhost:81",
  ],
};

export default nextConfig;
