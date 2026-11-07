"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { appUrl, contactEmail, sendEmail, sendEmailQuietly } from "@/lib/email";
import { leadSignupEmail } from "@/lib/emails";
import { formatFreeUntil, freeDaysLeft } from "@/lib/launch";
import { allow } from "@/lib/rate-limit";
import { adminForAction } from "@/lib/session";
import { leadSchema, type LeadInput } from "@/lib/validation/leads";
import { fail, firstIssue, ok, safe } from "./result";

/** Formulario público de la landing: una profesional quiere probar Anclaje. */
export async function createLead(input: LeadInput) {
  return safe(async () => {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!allow(`lead:${ip}`, 5, 60 * 60_000)) {
      return fail("Recibimos varios pedidos seguidos. Probá de nuevo en un rato.");
    }
    const parsed = leadSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { website, name, email, phone, province, message } = parsed.data;
    const data = { name, email, phone, province, message };
    if (website) return ok(undefined); // bot: se hace como que salió bien
    const lead = await prisma.lead.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        province: data.province ?? null,
        message: data.message || null,
      },
    });
    const contact = contactEmail();
    const recipients = contact
      ? [contact]
      : (await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } })).map(
          (a) => a.email,
        );
    for (const to of recipients) {
      await sendEmailQuietly(
        {
          to,
          subject: `Anclaje: ${lead.name} quiere probarla`,
          text: [
            `${lead.name} dejó sus datos en la página de Anclaje.`,
            `Mail: ${lead.email}`,
            lead.phone ? `Teléfono: ${lead.phone}` : null,
            lead.province ? `Provincia: ${lead.province}` : null,
            lead.message ? `\nMensaje:\n${lead.message}` : null,
            `\nVer interesados: ${appUrl("/admin/interesados")}`,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        "nuevo interesado",
      );
    }
    return ok(undefined);
  });
}

/** El admin marca que ya le escribió (o lo desmarca). */
export async function markLeadContacted(id: string, contacted: boolean) {
  return safe(async () => {
    const admin = await adminForAction();
    const res = await prisma.lead.updateMany({
      where: { id: String(id) },
      data: { contactedAt: contacted ? new Date() : null },
    });
    if (res.count === 0) return fail("No encontramos ese interesado");
    await audit({ actorId: admin.id, action: "update", entityType: "Lead", entityId: String(id) });
    revalidatePath("/admin/interesados");
    return ok(undefined);
  });
}

/** El admin le manda al interesado, desde Anclaje, el mail con el link para crear su cuenta. */
export async function sendLeadSignupLink(id: string) {
  return safe(async () => {
    const admin = await adminForAction();
    const lead = await prisma.lead.findUnique({ where: { id: String(id) } });
    if (!lead) return fail("No encontramos ese interesado");
    if (await prisma.user.findUnique({ where: { email: lead.email }, select: { id: true } })) {
      return fail("Ya tiene cuenta con ese email.");
    }
    try {
      await sendEmail({
        to: lead.email,
        replyTo: contactEmail(),
        ...leadSignupEmail({
          name: lead.name,
          signupUrl: appUrl("/registrarse?tipo=profesional"),
          freeUntil: freeDaysLeft() > 0 ? formatFreeUntil() : null,
        }),
      });
    } catch {
      return fail("No se pudo mandar el mail. Probá de nuevo en un rato.");
    }
    await prisma.lead.update({
      where: { id: lead.id },
      data: { contactedAt: lead.contactedAt ?? new Date(), signupLinkSentAt: new Date() },
    });
    await audit({ actorId: admin.id, action: "update", entityType: "Lead", entityId: lead.id });
    revalidatePath("/admin/interesados");
    return ok(undefined);
  });
}
