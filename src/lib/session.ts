import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getDemoViewPatient } from "@/lib/demo";

export type Role = "PATIENT" | "PROFESSIONAL" | "ADMIN";

/** Sesión actual (o null). Cacheada por request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

const ACTIVE_EVERY = 60 * 60 * 1000;

export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/ingresar");
  // "Última vez que usó la app", para el panel de admin. Se escribe como mucho una vez por hora.
  const last = session.user.lastActiveAt ? new Date(session.user.lastActiveAt).getTime() : 0;
  if (Date.now() - last > ACTIVE_EVERY) {
    await prisma.user
      .update({ where: { id: session.user.id }, data: { lastActiveAt: new Date() } })
      .catch(() => {});
  }
  return { ...session.user, role: (session.user.role ?? "PATIENT") as Role };
}

export function homeForRole(role: Role) {
  return role === "PATIENT" ? "/app" : role === "ADMIN" ? "/admin" : "/pro";
}

/** Usuario paciente + su perfil. Redirige si no corresponde. */
export const requirePatient = cache(async () => {
  const user = await requireUser();
  if (user.role !== "PATIENT") {
    // Una profesional "viendo como paciente": solo su paciente demo (ver src/lib/demo.ts).
    const demo = await getDemoViewPatient(user.id);
    if (!demo?.user) redirect(homeForRole(user.role));
    const { user: demoUser, ...demoPatient } = demo;
    return {
      user: {
        ...user,
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        role: "PATIENT" as Role,
      },
      patient: { ...demoPatient, userId: demoUser.id },
      isDemoView: true,
    };
  }
  const patient = await prisma.patientProfile.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, displayName: user.name, sharingDefaults: { create: {} } },
    include: { sharingDefaults: true },
  });
  return { user, patient: { ...patient, userId: user.id }, isDemoView: false };
});

/** Usuario profesional (o admin) + su perfil profesional. */
export const requireProfessional = cache(async () => {
  const user = await requireUser();
  if (user.role === "PATIENT") redirect("/app");
  const professional = await prisma.professionalProfile.findUnique({ where: { userId: user.id } });
  // Quien entró con Google por primera vez todavía no cargó su matrícula.
  if (!professional) redirect(user.role === "ADMIN" ? "/admin" : "/alta-profesional");
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
  return { ...patient, userId: session.user.id };
}

/**
 * Como patientForAction, pero también vale para una profesional "viendo como paciente" su demo.
 * Usalo SOLO en acciones de contenido (rueda, diario, autorregistro, temas, tareas, evaluaciones):
 * nunca en las de cuenta, vínculos o notificaciones, que tienen que seguir rechazando a la demo.
 */
export async function patientForContentAction() {
  const session = await getSession();
  if (!session) throw new Error("No autorizado");
  if ((session.user.role ?? "PATIENT") === "PATIENT") return patientForAction();
  const demo = await getDemoViewPatient(session.user.id);
  if (!demo?.user) throw new Error("No autorizado");
  const { user: demoUser, ...patient } = demo;
  return { ...patient, userId: demoUser.id };
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
