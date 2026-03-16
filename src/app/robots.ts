import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/onboarding/"] },
    ],
    sitemap:
      "https://sales-system-ahmanewassim6-2668s-projects.vercel.app/sitemap.xml",
  };
}
