"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { appUrl, contactEmail, sendEmailQuietly } from "@/lib/email";
import { allow } from "@/lib/rate-limit";
import { adminForAction, professionalForAction } from "@/lib/session";
import { isValidKey, storage } from "@/lib/storage";
import {
  communityItemSchema,
  reviewSchema,
  type CommunityItemInput,
} from "@/lib/validation/community";
import { fail, firstIssue, ok, safe } from "./result";

// Comunidad (biblioteca colaborativa): las profesionales proponen material, el admin lo revisa y
// recién aprobado lo ven todas. Cualquiera puede copiarlo a su Biblioteca para asignarlo.

async function teamRecipients() {
  const contact = contactEmail();
  if (contact) return [contact];
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } });
  return admins.map((a) => a.email);
}

export async function proposeCommunityItem(input: CommunityItemInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    if (!allow(`community:${professional.id}`, 10, 24 * 60 * 60_000))
      return fail("Ya propusiste mucho material hoy. Seguí mañana.");
    const parsed = communityItemSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const v = parsed.data;
    const isFile = v.kind === "PDF" || v.kind === "IMAGE";
    if (
      isFile &&
      (!v.storageKey || !isValidKey(v.storageKey) || !v.storageKey.startsWith("community/"))
    )
      return fail("Archivo inválido");

    const item = await prisma.communityItem.create({
      data: {
        authorId: professional.id,
        kind: v.kind,
        title: v.title,
        summary: v.summary || null,
        url: v.kind === "LINK" ? v.url! : null,
        storageKey: isFile ? v.storageKey! : null,
        bodyText: v.kind === "TEXT" ? v.bodyText!.trim() : null,
        source: v.source || null,
        category: v.category || null,
        tags: [...new Set(v.tags.map((t) => t.toLowerCase()))],
      },
      select: { id: true, title: true },
    });
    await audit({
      actorId: userId,
      action: "create",
      entityType: "CommunityItem",
      entityId: item.id,
    });

    const author = professional.displayName;
    after(async () => {
      for (const to of await teamRecipients()) {
        await sendEmailQuietly(
          {
            to,
            subject: `Anclaje: nuevo material para revisar`,
            text: [
              `${author} propuso material para la Comunidad: "${item.title}".`,
              `\nRevisalo en: ${appUrl("/admin/comunidad")}`,
            ].join("\n"),
          },
          "aporte a la comunidad",
        );
      }
    });
    revalidatePath("/pro/comunidad");
    revalidatePath("/admin/comunidad");
    return ok(undefined);
  });
}

/** La autora puede retirar su aporte (pendiente, aprobado o rechazado). */
export async function deleteMyCommunityItem(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const item = await prisma.communityItem.findFirst({
      where: { id: String(id), authorId: professional.id },
      select: { id: true, storageKey: true },
    });
    if (!item) return fail("No encontramos ese aporte");
    await prisma.communityItem.delete({ where: { id: item.id } });
    if (item.storageKey) await storage().delete(item.storageKey);
    await audit({
      actorId: userId,
      action: "delete",
      entityType: "CommunityItem",
      entityId: item.id,
    });
    revalidatePath("/pro/comunidad");
    revalidatePath("/admin/comunidad");
    return ok(undefined);
  });
}

/**
 * Copia un aporte aprobado a la Biblioteca propia (para asignarlo a pacientes). El archivo se
 * duplica: si la profesional borra su copia, no se borra el de la Comunidad (ni al revés).
 */
export async function copyCommunityItemToLibrary(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const item = await prisma.communityItem.findFirst({
      where: { id: String(id), status: "APPROVED" },
    });
    if (!item) return fail("No encontramos ese material");
    const already = await prisma.resource.count({
      where: { professionalId: professional.id, title: item.title, kind: item.kind },
    });
    if (already) return fail("Ya lo tenés en tu Biblioteca");

    let storageKey: string | null = null;
    if (item.storageKey) {
      const file = await storage().get(item.storageKey);
      if (!file) return fail("No encontramos el archivo");
      storageKey = `resources/${randomBytes(16).toString("hex")}.${item.storageKey.split(".").pop()}`;
      await storage().put(storageKey, file.data, file.contentType);
    }
    const description = [item.summary, item.source && `Fuente: ${item.source}`]
      .filter(Boolean)
      .join("\n\n");
    const r = await prisma.resource.create({
      data: {
        professionalId: professional.id,
        kind: item.kind,
        title: item.title,
        description: description ? description.slice(0, 1000) : null,
        category: item.category,
        tags: item.tags,
        url: item.url,
        storageKey,
        bodyText: item.bodyText,
      },
      select: { id: true },
    });
    await audit({
      actorId: userId,
      action: "create",
      entityType: "Resource",
      entityId: r.id,
      meta: { fromCommunity: item.id },
    });
    revalidatePath("/pro/biblioteca");
    return ok(undefined);
  });
}

/** Revisión (hoy, solo ADMIN; más adelante, un rol de comité). Le avisa a la autora por mail. */
export async function reviewCommunityItem(input: {
  id: string;
  decision: "APPROVED" | "REJECTED";
  note?: string;
}) {
  return safe(async () => {
    const admin = await adminForAction();
    const parsed = reviewSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { id, decision, note } = parsed.data;
    if (decision === "REJECTED" && !note)
      return fail("Contale por qué no se publica, así lo puede corregir.");
    const item = await prisma.communityItem.update({
      where: { id },
      data: { status: decision, reviewNote: note || null, reviewedAt: new Date() },
      select: { id: true, title: true, author: { select: { user: { select: { email: true } } } } },
    });
    await audit({
      actorId: admin.id,
      action: "update",
      entityType: "CommunityItem",
      entityId: item.id,
      meta: { status: decision },
    });
    const approved = decision === "APPROVED";
    after(() =>
      sendEmailQuietly(
        {
          to: item.author.user.email,
          subject: approved
            ? "Anclaje: tu aporte ya está en la Comunidad"
            : "Anclaje: tu aporte necesita cambios",
          text: [
            approved
              ? `¡Gracias! "${item.title}" ya lo pueden ver todas las profesionales de Anclaje.`
              : `Revisamos "${item.title}" y por ahora no lo publicamos.`,
            note ? `\nComentario: ${note}` : null,
            `\nVer la Comunidad: ${appUrl("/pro/comunidad")}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        "revisión de aporte",
      ),
    );
    revalidatePath("/pro/comunidad");
    revalidatePath("/admin/comunidad");
    return ok(undefined);
  });
}
