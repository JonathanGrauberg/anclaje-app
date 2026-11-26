"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { isValidKey, storage } from "@/lib/storage";
import { professionalForAction } from "@/lib/session";
import { publicProfileSchema, type PublicProfileInput } from "@/lib/validation/public-profile";
import { fail, firstIssue, ok, safe } from "./result";

// Perfil público de la profesional: lo que ella elige mostrar para que la encuentren.

export async function savePublicProfile(input: PublicProfileInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = publicProfileSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const v = parsed.data;
    if (v.publicProfile && !v.inPerson && !v.online)
      return fail("Elegí si atendés presencial, online o las dos.");
    const taken = await prisma.professionalProfile.findFirst({
      where: { slug: v.slug, id: { not: professional.id } },
      select: { id: true },
    });
    if (taken) return fail("Esa dirección ya la usa otra profesional. Probá con otra.");

    const before = await prisma.professionalProfile.findUniqueOrThrow({
      where: { id: professional.id },
      select: { slug: true },
    });
    await prisma.professionalProfile.update({
      where: { id: professional.id },
      data: {
        publicProfile: v.publicProfile,
        slug: v.slug,
        headline: v.headline ?? null,
        bio: v.bio ?? null,
        approaches: [...new Set(v.approaches)],
        audiences: [...new Set(v.audiences)],
        languages: [...new Set(v.languages)],
        education: v.education,
        city: v.city ?? null,
        province: v.province ?? null,
        address: v.address ?? null,
        publicPhone: v.publicPhone ?? null,
        whatsapp: Boolean(v.publicPhone) && v.whatsapp,
        inPerson: v.inPerson,
        online: v.online,
        coverage: v.coverage ?? null,
        acceptsRequests: v.acceptsRequests,
      },
    });
    await audit({
      actorId: userId,
      action: "update",
      entityType: "PublicProfile",
      entityId: professional.id,
      meta: { publicProfile: v.publicProfile },
    });
    revalidatePath("/pro/perfil-publico");
    revalidatePath(`/profesionales/${v.slug}`);
    if (before.slug && before.slug !== v.slug) revalidatePath(`/profesionales/${before.slug}`);
    return ok({ slug: v.slug });
  });
}

/** Cambia (o saca, con null) la foto de perfil. La anterior se borra de R2. */
export async function setProfilePhoto(storageKey: string | null) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    if (
      storageKey !== null &&
      (typeof storageKey !== "string" ||
        !isValidKey(storageKey) ||
        !storageKey.startsWith("avatars/") ||
        storageKey.endsWith(".pdf"))
    )
      return fail("Foto inválida");
    const before = await prisma.professionalProfile.findUniqueOrThrow({
      where: { id: professional.id },
      select: { photoKey: true, slug: true },
    });
    await prisma.professionalProfile.update({
      where: { id: professional.id },
      data: { photoKey: storageKey },
    });
    if (before.photoKey && before.photoKey !== storageKey)
      await storage()
        .delete(before.photoKey)
        .catch(() => undefined);
    await audit({
      actorId: userId,
      action: "update",
      entityType: "PublicProfile",
      entityId: professional.id,
      meta: { photo: storageKey ? "set" : "removed" },
    });
    revalidatePath("/pro/perfil-publico");
    if (before.slug) revalidatePath(`/profesionales/${before.slug}`);
    return ok(undefined);
  });
}
