"use server";

import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { appUrl, sendEmailQuietly } from "@/lib/email";
import { welcomeProfessionalEmail } from "@/lib/emails";
import { getSession } from "@/lib/session";
import {
  professionalSignupSchema,
  type ProfessionalSignupInput,
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
        ...welcomeProfessionalEmail({ name: displayName, loginUrl: appUrl("/ingresar") }),
      },
      "bienvenida",
    );
    return ok(undefined);
  });
}
