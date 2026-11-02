import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { magicLink } from "better-auth/plugins";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { storage } from "@/lib/storage";

const isProd = process.env.NODE_ENV === "production";

/** Ingreso con Google: solo si están las credenciales. Es solo para profesionales. */
export const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const GOOGLE_ONLY_PROS = "El ingreso con Google es solo para profesionales.";

export const auth = betterAuth({
  appName: "Anclaje",
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, { provider: "postgresql" }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    autoSignIn: true,
    // "¿Te olvidaste la contraseña?": link de un solo uso por email, vence en 1 hora.
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Cambiá tu contraseña de Anclaje",
        text: `Hola. Pediste cambiar tu contraseña de Anclaje. Tocá este link para elegir una nueva (vence en 1 hora):\n\n${url}\n\nSi no lo pediste, ignorá este email: tu contraseña sigue igual.`,
      });
    },
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : undefined,

  account: {
    // Una profesional con cuenta de email puede entrar después con Google (mismo email).
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },

  user: {
    additionalFields: {
      // El rol nunca lo elige el usuario: el registro público siempre crea pacientes. Quien se
      // registra con Google queda como profesional (ver databaseHooks) y completa su matrícula.
      role: { type: "string", required: false, defaultValue: "PATIENT", input: false },
      lastActiveAt: { type: "date", required: false, input: false },
    },
    // Borrar cuenta: solo pacientes, siempre con contraseña (lo valida la acción deleteMyAccount).
    // Todo lo del paciente se borra en cascada desde la DB; acá se borran los archivos asociados.
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        if (((user as { role?: string }).role ?? "PATIENT") !== "PATIENT") {
          throw new APIError("FORBIDDEN", {
            message: "Las cuentas profesionales se dan de baja con el equipo de Anclaje.",
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
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    },
  },

  advanced: {
    useSecureCookies: isProd,
    defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: isProd },
  },

  databaseHooks: {
    user: {
      create: {
        before: async (user, ctx) => {
          if (!ctx?.path?.startsWith("/callback/")) return;
          return { data: { ...user, role: "PROFESSIONAL" } };
        },
        after: async (user) => {
          const role = (user as { role?: string }).role ?? "PATIENT";
          if (role !== "PATIENT") return;
          await prisma.patientProfile.create({
            data: { userId: user.id, displayName: user.name, sharingDefaults: { create: {} } },
          });
        },
      },
    },
    account: {
      create: {
        // Un paciente no puede sumar Google a su cuenta: el ingreso con Google es de profesionales.
        before: async (account) => {
          if (account.providerId !== "google") return;
          const user = await prisma.user.findUnique({
            where: { id: account.userId },
            select: { role: true },
          });
          if (user?.role === "PATIENT")
            throw new APIError("FORBIDDEN", { message: GOOGLE_ONLY_PROS });
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          const now = new Date();
          await prisma.user
            .update({
              where: { id: session.userId },
              data: { lastLoginAt: now, lastActiveAt: now },
            })
            .catch(() => {});
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
          subject: "Tu link para entrar a Anclaje",
          text: `Hola. Tocá este link para entrar a Anclaje (vence en 10 minutos):\n\n${url}\n\nSi no lo pediste, ignorá este email.`,
        });
      },
    }),
    nextCookies(), // tiene que ir último
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
