import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type Role = "PATIENT" | "PROFESSIONAL" | "ADMIN";

/** Sesión actual (o null). Cacheada por request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/ingresar");
  return { ...session.user, role: (session.user.role ?? "PATIENT") as Role };
}

export function homeForRole(role: Role) {
  return role === "PATIENT" ? "/app" : "/pro";
}

/** Usuario paciente + su perfil. Redirige si no corresponde. */
export const requirePatient = cache(async () => {
  const user = await requireUser();
  if (user.role !== "PATIENT") redirect(homeForRole(user.role));
  const patient = await prisma.patientProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, displayName: user.name, sharingDefaults: { create: {} } },
    include: { sharingDefaults: true },
  });
  return { user, patient };
});

/** Usuario profesional (o admin) + su perfil profesional. */
export const requireProfessional = cache(async () => {
  const user = await requireUser();
  if (user.role === "PATIENT") redirect("/app");
  const professional = await prisma.professionalProfile.findUnique({ where: { userId: user.id } });
  if (!professional) redirect("/ingresar?error=sin-perfil");
  return { user, professional };
});

/**
 * Para Server Actions: igual que requirePatient pero sin redirect (lanza error).
 * Las acciones siempre re-verifican sesión y rol en el servidor.
 */
export async function patientForAction() {
  const session = await getSession();
  if (!session || (session.user.role ?? "PATIENT") !== "PATIENT") {
    throw new Error("No autorizado");
  }
  const patient = await prisma.patientProfile.findUnique({
    where: { userId: session.user.id },
    include: { sharingDefaults: true },
  });
  if (!patient) throw new Error("No autorizado");
  return patient;
}
