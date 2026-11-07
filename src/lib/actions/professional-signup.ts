"use server";

import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "node:crypto";
import { headers } from "next/headers";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { appUrl, contactEmail, sendEmailQuietly } from "@/lib/email";
import { welcomeProfessionalEmail } from "@/lib/emails";
import { allow } from "@/lib/rate-limit";
import { getSession } from "@/lib/session";
import {
  professionalSignupSchema,
  proSignUpSchema,
  type ProfessionalSignupInput,
  type ProSignUpInput,
} from "@/lib/validation/professional";
import { fail, firstIssue, ok, safe } from "./result";

const TAKEN = "Esa matrícula ya está registrada en Anclaje. Si es tuya, escribinos y lo vemos.";

/**
 * Alta de una profesional que entró con Google: carga su matrícula. Queda sin verificar hasta que
 * el admin la revisa, pero ya puede usar la app. La misma matrícula no se puede usar dos veces.
 */
export async function completeProfessionalSignup(input: ProfessionalSignupInput) {
  return safe(async () => {
    const session = await getSession();
    if (!session || session.user.role !== "PROFESSIONAL") return fail("No autorizado");
    const parsed = professionalSignupSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { displayName, licenseJurisdiction, licenseNumber } = parsed.data;

    const existing = await prisma.professionalProfile.findFirst({
      where: { OR: [{ userId: session.user.id }, { licenseJurisdiction, licenseNumber }] },
      select: { userId: true },
    });
    if (existing?.userId === session.user.id) return ok(undefined);
    if (existing) return fail(TAKEN);

    try {
      const profile = await prisma.professionalProfile.create({
        data: { userId: session.user.id, displayName, licenseJurisdiction, licenseNumber },
      });
      await audit({
        actorId: session.user.id,
        action: "create",
        entityType: "Professional",
        entityId: profile.id,
      });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") return fail(TAKEN);
      throw e;
    }
    await sendEmailQuietly(
      {
        to: session.user.email,
        replyTo: contactEmail(),
        ...welcomeProfessionalEmail({ name: displayName, loginUrl: appUrl("/ingresar") }),
      },
      "bienvenida",
    );
    return ok(undefined);
  });
}

/**
 * Alta propia de una profesional desde "Crear cuenta" (email y contraseña). Igual que con Google:
 * queda sin verificar hasta que el admin revisa la matrícula, pero ya puede usar la app. Después
 * el cliente inicia sesión con la contraseña que eligió.
 */
export async function signUpProfessional(input: ProSignUpInput) {
  return safe(async () => {
    const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
    if (!allow(`pro-signup:${ip}`, 5, 60 * 60_000)) {
      return fail("Muchos intentos seguidos. Probá de nuevo en un rato.");
    }
    const parsed = proSignUpSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { fullName, displayName, email, password, licenseJurisdiction, licenseNumber } =
      parsed.data;

    if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
      return fail("Ya hay una cuenta con ese email. ¿Querés ingresar?");
    }
    const taken = await prisma.professionalProfile.findFirst({
      where: { licenseJurisdiction, licenseNumber },
      select: { id: true },
    });
    if (taken) return fail(TAKEN);

    const id = randomUUID();
    try {
      await prisma.user.create({
        data: {
          id,
          email,
          name: fullName,
          role: "PROFESSIONAL",
          accounts: {
            create: {
              id: randomUUID(),
              accountId: id,
              providerId: "credential",
              password: await hashPassword(password),
            },
          },
          professionalProfile: { create: { displayName, licenseJurisdiction, licenseNumber } },
        },
      });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") {
        return fail("Ya hay una cuenta con ese email o esa matrícula.");
      }
      throw e;
    }
    await audit({ actorId: id, action: "create", entityType: "Professional", entityId: id });
    await sendEmailQuietly(
      {
        to: email,
        replyTo: contactEmail(),
        ...welcomeProfessionalEmail({ name: displayName, loginUrl: appUrl("/ingresar") }),
      },
      "bienvenida",
    );
    // Aviso al equipo para revisar la matrícula (queda "sin verificar" hasta entonces).
    const contact = contactEmail();
    const admins = contact
      ? [contact]
      : (await prisma.user.findMany({ where: { role: "ADMIN" }, select: { email: true } })).map(
          (a) => a.email,
        );
    for (const to of admins) {
      await sendEmailQuietly(
        {
          to,
          subject: `Anclaje: ${fullName} creó su cuenta de profesional`,
          text: [
            `${fullName} (${email}) se dio de alta como profesional.`,
            `Matrícula: ${licenseNumber} (${licenseJurisdiction}). Queda sin verificar hasta que la revises.`,
            `Verificarla: ${appUrl("/admin/profesionales")}`,
          ].join("\n"),
        },
        "alta profesional",
      );
    }
    return ok({ email });
  });
}
