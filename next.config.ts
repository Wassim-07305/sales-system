import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ["@react-pdf/renderer"],
  experimental: {
    // Cache les pages dynamiques côté client pendant 30s
    staleTimes: {
      dynamic: 30,
    },
    // Tree-shake heavy packages (only import used exports)
    optimizePackageImports: [
      "recharts",
      "lucide-react",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "date-fns",
    ],
  },
  images: {
    formats: ["image/webp", "image/avif"],
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
        {
          key: "Cache-Control",
          value: "no-store, no-cache, must-revalidate, max-age=0",
        },
        { key: "Service-Worker-Allowed", value: "/" },
      ],
    },
  ],
};

export default nextConfig;
