import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

// PWA with next-pwa (webpack-based, used when building with --webpack)
let config = nextConfig;
if (process.env.NODE_ENV === "production") {
  try {
    const withPWA = require("next-pwa")({
      dest: "public",
      register: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/.*\.supabase\.co\/storage/,
          handler: "CacheFirst",
          options: {
            cacheName: "supabase-storage",
            expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
          },
        },
      ],
    });
    config = withPWA(nextConfig);
  } catch {
    // next-pwa not available, skip PWA setup
  }
}

export default config;
