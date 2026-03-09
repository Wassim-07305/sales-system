import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Cache les pages dynamiques côté client pendant 30s
    // → revisiter une page déjà vue = instantané
    staleTimes: {
      dynamic: 30,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  headers: async () => [
    {
      source: "/sw.js",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" },
        { key: "Clear-Site-Data", value: '"cache", "storage"' },
      ],
    },
  ],
};

export default nextConfig;
