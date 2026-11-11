import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Por ahora la única página para buscadores es la landing. Cuando haya páginas de contenido
// (por ejemplo "app para psicólogos", "creador de tests"), se suman acá.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 }];
}
