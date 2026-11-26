import type { MetadataRoute } from "next";
import { listedProfiles } from "@/lib/public-profile";
import { SITE_URL } from "@/lib/site";

// La landing y los perfiles públicos de las profesionales que lo activaron.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const profiles = await listedProfiles().catch(() => []);
  return [
    { url: `${SITE_URL}/`, changeFrequency: "weekly", priority: 1 },
    ...profiles.map((p) => ({
      url: `${SITE_URL}/profesionales/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
