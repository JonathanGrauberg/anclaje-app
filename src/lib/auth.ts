import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { storage } from "@/lib/storage";

const isProd = process.env.NODE_ENV === "production";

export const auth = betterAuth({
  appName: "Sentir",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
  },

  user: {
    additionalFields: {
      // El rol nunca lo elige el usuario: el registro público siempre crea pacientes.
      role: { type: "string", required: false, defaultValue: "PATIENT", input: false },
    },
    // Borrar cuenta: solo pacientes, siempre con contraseña (lo valida la acción deleteMyAccount).
    // Todo lo del paciente se borra en cascada desde la DB; acá se borran los archivos asociados.
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        if (((user as { role?: string }).role ?? "PATIENT") !== "PATIENT") {
          throw new APIError("FORBIDDEN", {
            message: "Las cuentas profesionales se dan de baja con el equipo de Sentir.",
          });
        }
        const files = await prisma.externalResult.findMany({
          where: { patient: { userId: user.id }, storageKey: { not: null } },
          select: { storageKey: true },
        });
        await Promise.all(
          files.map((f) =>
            storage()
              .delete(f.storageKey!)
              .catch(() => {}),
          ),
        );
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 días
    updateAge: 60 * 60 * 24,
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/sign-in/magic-link": { window: 60, max: 3 },
    },
  },

  advanced: {
    useSecureCookies: isProd,
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: isProd },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const role = (user as { role?: string }).role ?? "PATIENT";
          if (role !== "PATIENT") return;
          await prisma.patientProfile.create({
            data: { userId: user.id, displayName: user.name, sharingDefaults: { create: {} } },
          });
        },
      },
    },
  },

  plugins: [
    magicLink({
      // Solo para cuentas existentes: el alta es con email + contraseña.
      disableSignUp: true,
      expiresIn: 60 * 10,
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Tu link para entrar a Sentir",
          text: `Hola. Tocá este link para entrar a Sentir (vence en 10 minutos):\n\n${url}\n\nSi no lo pediste, ignorá este email.`,
        });
      },
    }),
    nextCookies(), // tiene que ir último
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
