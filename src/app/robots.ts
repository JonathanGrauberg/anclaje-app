import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Solo la landing es pública. Lo demás es la app (con datos privados): que los buscadores ni la
// recorran. Igual, esas pantallas también llevan noindex por si alguien enlaza una.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // "/app$" y "/app/" (no "/app" a secas): si no, también bloquearía /apple-icon.
      disallow: [
        "/app",
        "/pro",
        "/admin",
        "/demo",
        "/vincular",
        "/alta-profesional",
        "/diseno",
        "/offline",
      ]
        .flatMap((p) => [`${p}$`, `${p}/`])
        .concat("/api/"),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
