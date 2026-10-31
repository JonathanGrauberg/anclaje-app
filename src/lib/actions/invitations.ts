"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { generateCode, INVITATION_DAYS } from "@/lib/invitations";
import { professionalForAction } from "@/lib/session";
import { fail, ok, safe } from "./result";

export async function createInvitation() {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const pending = await prisma.invitation.count({
      where: { professionalId: professional.id, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pending >= 20) return fail("Tenés muchas invitaciones sin usar. Borrá alguna primero.");

    const expiresAt = new Date(Date.now() + INVITATION_DAYS * 86_400_000);
    // Reintento por si justo colisiona el código (muy improbable).
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const exists = await prisma.invitation.findUnique({ where: { code }, select: { id: true } });
      if (exists) continue;
      const inv = await prisma.invitation.create({
        data: { code, professionalId: professional.id, expiresAt },
        select: { id: true, code: true },
      });
      await audit({
        actorId: userId,
        action: "create",
        entityType: "Invitation",
        entityId: inv.id,
      });
      revalidatePath("/pro/invitaciones");
      return ok(inv);
    }
    return fail("No pudimos generar el código. Probá de nuevo.");
  });
}

export async function deleteInvitation(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const res = await prisma.invitation.deleteMany({
      where: { id, professionalId: professional.id, usedAt: null },
    });
    if (res.count === 0) return fail("No encontramos esa invitación");
    await audit({ actorId: userId, action: "delete", entityType: "Invitation", entityId: id });
    revalidatePath("/pro/invitaciones");
    return ok(undefined);
  });
}
