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
  return role === "PATIENT" ? "/app" : role === "ADMIN" ? "/admin" : "/pro";
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
  if (!professional) redirect(user.role === "ADMIN" ? "/admin" : "/ingresar?error=sin-perfil");
  return { user, professional };
});

/** Administración: solo rol ADMIN. El admin NO ve datos clínicos (ver docs/DECISIONES.md). */
export const requireAdmin = cache(async () => {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect(homeForRole(user.role));
  return user;
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

/** Para Server Actions del lado profesional: sesión + perfil, sin redirect. */
export async function professionalForAction() {
  const session = await getSession();
  if (!session || (session.user.role ?? "PATIENT") === "PATIENT") throw new Error("No autorizado");
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) throw new Error("No autorizado");
  return { userId: session.user.id, professional };
}

/** Para Server Actions de administración. */
export async function adminForAction() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") throw new Error("No autorizado");
  return session.user;
}
