import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { getBilling } from "@/lib/mercadopago";
import { SLUG_RE } from "@/lib/validation/public-profile";

// Perfil público de la profesional (/profesionales/[slug]) y solicitudes de turno.
// Se muestra solo si ella lo activó, su matrícula está verificada y tiene acceso al panel (si no,
// le llegarían pedidos que no puede ver).

export const avatarUrl = (key: string | null | undefined) =>
  key ? `/api/avatars/${key.split("/")[1]}` : null;

export function slugBase(name: string) {
  const base = name
    .replace(/^(lic|lic\.|licenciada|licenciado|dra|dr|psic|ps)\.?\s+/i, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
    .replace(/-$/, "");
  return base.length >= 3 && SLUG_RE.test(base) ? base : "profesional";
}

/** Primer slug libre a partir del nombre ("maria-perez", "maria-perez-2"…). */
export async function freeSlug(name: string, exceptId?: string) {
  const base = slugBase(name);
  for (let i = 1; i < 50; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    const taken = await prisma.professionalProfile.findFirst({
      where: { slug, ...(exceptId && { id: { not: exceptId } }) },
      select: { id: true },
    });
    if (!taken) return slug;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
}

const publicSelect = {
  id: true,
  displayName: true,
  slug: true,
  photoKey: true,
  headline: true,
  bio: true,
  approaches: true,
  audiences: true,
  languages: true,
  education: true,
  city: true,
  province: true,
  address: true,
  publicPhone: true,
  whatsapp: true,
  inPerson: true,
  online: true,
  coverage: true,
  acceptsRequests: true,
  licenseNumber: true,
  licenseJurisdiction: true,
  updatedAt: true,
} as const;

/** El perfil público, o null si no se tiene que ver. */
export const getPublicProfile = cache(async (slug: string) => {
  if (!SLUG_RE.test(slug) || slug.length > 60) return null;
  const p = await prisma.professionalProfile.findFirst({
    where: {
      slug,
      publicProfile: true,
      verifiedAt: { not: null },
      accessBlocked: false,
      user: { role: "PROFESSIONAL" },
    },
    select: publicSelect,
  });
  if (!p) return null;
  if (!(await getBilling(p.id)).access) return null;
  return p;
});

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

/** Perfiles que se ven (para el sitemap). */
export async function listedProfiles() {
  const pros = await prisma.professionalProfile.findMany({
    where: {
      publicProfile: true,
      slug: { not: null },
      verifiedAt: { not: null },
      accessBlocked: false,
      user: { role: "PROFESSIONAL" },
    },
    select: { id: true, slug: true, updatedAt: true },
  });
  const out = [];
  for (const p of pros) if ((await getBilling(p.id)).access) out.push(p);
  return out;
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(24).toString("base64url");

/** Las solicitudes que nadie confirmó en 3 días se borran (no le llegaron a nadie). */
export async function purgeUnconfirmedRequests(now = new Date()) {
  const { count } = await prisma.appointmentRequest.deleteMany({
    where: { status: "UNCONFIRMED", createdAt: { lt: new Date(now.getTime() - 3 * 86_400_000) } },
  });
  return { purged: count };
}
