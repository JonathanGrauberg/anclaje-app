import { hashPassword } from "better-auth/crypto";
import { randomBytes, randomUUID } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";

// Alta de cuentas del equipo (profesionales y admins). El registro público solo crea pacientes,
// así que estas cuentas las crea un admin (panel) o el CLI (`npm run crear:usuario`).
// Sin "server-only": lo usa también el script de consola. Recibe el cliente de Prisma.

export type StaffRole = "PROFESSIONAL" | "ADMIN";

/** Contraseña temporal legible: 4 grupos de 4 (sin caracteres que se confunden). */
export function generateTempPassword() {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(16);
  const chars = [...bytes].map((b) => alphabet[b % alphabet.length]);
  return [0, 4, 8, 12].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

export async function createStaffUser(
  db: PrismaClient,
  input: {
    email: string;
    name: string;
    role: StaffRole;
    licenseNumber?: string | null;
    withProfessionalProfile?: boolean;
  },
) {
  const email = input.email.trim().toLowerCase();
  if (await db.user.findUnique({ where: { email } })) {
    throw new AccountError("Ya existe una cuenta con ese email.");
  }
  const tempPassword = generateTempPassword();
  const id = randomUUID();
  const needsProfile = input.role === "PROFESSIONAL" || input.withProfessionalProfile;
  const user = await db.user.create({
    data: {
      id,
      email,
      name: input.name,
      role: input.role,
      emailVerified: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: id,
          providerId: "credential",
          password: await hashPassword(tempPassword),
        },
      },
      ...(needsProfile && {
        professionalProfile: {
          create: {
            displayName: input.name,
            licenseNumber: input.licenseNumber || null,
            verifiedAt: new Date(), // la dio de alta el admin
          },
        },
      }),
    },
  });
  return { user, tempPassword };
}

/** Nueva contraseña temporal y cierre de todas las sesiones abiertas. */
export async function resetStaffPassword(db: PrismaClient, userId: string) {
  const tempPassword = generateTempPassword();
  const hash = await hashPassword(tempPassword);
  const updated = await db.account.updateMany({
    where: { userId, providerId: "credential" },
    data: { password: hash },
  });
  if (updated.count === 0) throw new AccountError("La cuenta no tiene contraseña.");
  await db.session.deleteMany({ where: { userId } });
  return tempPassword;
}

export class AccountError extends Error {}
