"use server";

import { revalidatePath } from "next/cache";
import { AccountError, createStaffUser, resetStaffPassword } from "@/lib/accounts";
import { rekey } from "@/lib/assessments/doc";
import { createAssessmentFromDoc } from "@/lib/assessments/repo";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { appUrl, contactEmail, sendEmailQuietly } from "@/lib/email";
import { welcomeProfessionalEmail } from "@/lib/emails";
import { adminForAction } from "@/lib/session";
import {
  createProfessionalSchema,
  crisisLineSchema,
  type CreateProfessionalInput,
  type CrisisLineInput,
} from "@/lib/validation/admin";
import { assessmentDocSchema } from "@/lib/validation/assessment";
import { normalizeLicense } from "@/lib/licenses";
import { fail, firstIssue, ok, safe } from "./result";

// Administración. Todas verifican rol ADMIN en el servidor y quedan en el AuditLog.
// Ninguna lee ni devuelve datos clínicos.

export async function createProfessional(input: CreateProfessionalInput) {
  return safe(async () => {
    const admin = await adminForAction();
    const parsed = createProfessionalSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    try {
      // Mismo formato que en el alta propia: número solo con dígitos, más la provincia.
      const licenseNumber = normalizeLicense(parsed.data.licenseNumber ?? "") || null;
      const { user, tempPassword } = await createStaffUser(prisma, {
        ...parsed.data,
        licenseNumber,
        licenseJurisdiction: parsed.data.licenseJurisdiction || null,
        role: "PROFESSIONAL",
      });
      await audit({
        actorId: admin.id,
        action: "create",
        entityType: "Professional",
        entityId: user.id,
      });
      // La contraseña temporal NO va por mail: el admin se la pasa por otro canal.
      await sendEmailQuietly(
        {
          to: user.email,
          replyTo: contactEmail(),
          ...welcomeProfessionalEmail({ name: user.name, loginUrl: appUrl("/ingresar") }),
        },
        "bienvenida",
      );
      revalidatePath("/admin/profesionales");
      return ok({ email: user.email, tempPassword });
    } catch (e) {
      if (e instanceof AccountError) return fail(e.message);
      if ((e as { code?: string }).code === "P2002")
        return fail("Ya hay una profesional con esa matrícula en esa provincia.");
      throw e;
    }
  });
}

/** Nueva contraseña temporal para una profesional (cierra sus sesiones). No aplica a admins. */
export async function resetProfessionalPassword(userId: string) {
  return safe(async () => {
    const admin = await adminForAction();
    const target = await prisma.user.findFirst({
      where: { id: String(userId), role: "PROFESSIONAL" },
      select: { id: true, email: true },
    });
    if (!target) return fail("No encontramos esa profesional");
    const tempPassword = await resetStaffPassword(prisma, target.id);
    await audit({
      actorId: admin.id,
      action: "update",
      entityType: "Professional",
      entityId: target.id,
      meta: { field: "password" },
    });
    return ok({ email: target.email, tempPassword });
  });
}

/** Matrícula revisada (alta propia con Google). */
export async function verifyProfessional(professionalId: string) {
  return safe(async () => {
    const admin = await adminForAction();
    const updated = await prisma.professionalProfile.updateMany({
      where: { id: String(professionalId), verifiedAt: null },
      data: { verifiedAt: new Date() },
    });
    if (updated.count === 0) return fail("No encontramos esa profesional sin verificar");
    await audit({
      actorId: admin.id,
      action: "update",
      entityType: "Professional",
      entityId: String(professionalId),
      meta: { field: "verifiedAt" },
    });
    revalidatePath("/admin/profesionales");
    revalidatePath("/admin");
    return ok(undefined);
  });
}

export async function saveCrisisLine(input: CrisisLineInput) {
  return safe(async () => {
    const admin = await adminForAction();
    const parsed = crisisLineSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { id, ...data } = parsed.data;
    const clean = {
      ...data,
      whatsapp: data.whatsapp || null,
      description: data.description || null,
      region: data.region || null,
    };
    if (id && !data.active) {
      const others = await prisma.crisisLine.count({ where: { active: true, id: { not: id } } });
      if (others === 0) return fail("Tiene que quedar al menos una línea de ayuda activa.");
    }
    const line = id
      ? await prisma.crisisLine.update({ where: { id }, data: clean })
      : await prisma.crisisLine.create({ data: clean });
    await audit({
      actorId: admin.id,
      action: id ? "update" : "create",
      entityType: "CrisisLine",
      entityId: line.id,
    });
    revalidatePath("/admin/lineas");
    revalidatePath("/app", "layout");
    return ok(undefined);
  });
}

export async function deleteCrisisLine(id: string) {
  return safe(async () => {
    const admin = await adminForAction();
    const others = await prisma.crisisLine.count({
      where: { active: true, id: { not: String(id) } },
    });
    if (others === 0) return fail("Tiene que quedar al menos una línea de ayuda activa.");
    await prisma.crisisLine.delete({ where: { id: String(id) } });
    await audit({ actorId: admin.id, action: "delete", entityType: "CrisisLine", entityId: id });
    revalidatePath("/admin/lineas");
    revalidatePath("/app", "layout");
    return ok(undefined);
  });
}

/** Sube un JSON de Anclaje como plantilla del sistema (la ven todas las profesionales). */
export async function importTemplate(text: string) {
  return safe(async () => {
    const admin = await adminForAction();
    if (text.length > 500_000) return fail("El archivo es demasiado grande");
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      return fail("El archivo no es un JSON válido");
    }
    const parsed = assessmentDocSchema.safeParse(json);
    if (!parsed.success)
      return fail(`El JSON no tiene el formato de Anclaje: ${firstIssue(parsed.error)}`);
    const exists = await prisma.assessment.findFirst({
      where: { ownerId: null, isTemplate: true, title: parsed.data.title },
    });
    if (exists) return fail("Ya hay una plantilla con ese título.");
    const a = await createAssessmentFromDoc(null, rekey(parsed.data));
    await audit({ actorId: admin.id, action: "create", entityType: "Template", entityId: a.id });
    revalidatePath("/admin/plantillas");
    revalidatePath("/pro/evaluaciones");
    return ok(undefined);
  });
}

/** Borra una plantilla. Las copias que ya hicieron las profesionales no se tocan. */
export async function deleteTemplate(id: string) {
  return safe(async () => {
    const admin = await adminForAction();
    const t = await prisma.assessment.findFirst({
      where: { id: String(id), ownerId: null, isTemplate: true },
    });
    if (!t) return fail("No encontramos esa plantilla");
    const used = await prisma.assessmentResponse.count({
      where: { version: { assessmentId: t.id } },
    });
    if (used) return fail("Tiene respuestas asociadas: no se puede borrar.");
    await prisma.assessment.delete({ where: { id: t.id } });
    await audit({ actorId: admin.id, action: "delete", entityType: "Template", entityId: t.id });
    revalidatePath("/admin/plantillas");
    revalidatePath("/pro/evaluaciones");
    return ok(undefined);
  });
}
