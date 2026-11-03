import { formatAppointmentShort, formatTime } from "@/lib/dates";

// Textos de los avisos al celular. Se ven con el teléfono bloqueado, así que NUNCA llevan
// contenido clínico, nombres de pacientes ni de profesionales, ni la palabra "terapia":
// solo qué pasó y cuándo. Tocar el aviso lleva a la pantalla que corresponde.

export type PushMessage = { title: string; body: string; url: string };

/** Qué avisos se pueden apagar en Ajustes (coinciden con los campos de `NotificationPrefs`). */
export type NotifyKind =
  | "appointmentDayBefore"
  | "appointmentSoon"
  | "appointmentChanges"
  | "feedback"
  | "assignments"
  | "patientCancelled"
  | "patientLinked";

export const NOTIFY_DEFAULTS: Record<NotifyKind, boolean> = {
  appointmentDayBefore: true,
  appointmentSoon: false,
  appointmentChanges: true,
  feedback: true,
  assignments: true,
  patientCancelled: true,
  patientLinked: true,
};

const TURNOS = "/app/turnos";

export const pushMessages = {
  appointmentTomorrow: (startsAt: Date): PushMessage => ({
    title: "Turno de mañana",
    body: `Mañana a las ${formatTime(startsAt)} tenés turno.`,
    url: TURNOS,
  }),
  appointmentSoon: (startsAt: Date): PushMessage => ({
    title: "Turno en un rato",
    body: `Hoy a las ${formatTime(startsAt)} tenés turno.`,
    url: TURNOS,
  }),
  appointmentCreated: (startsAt: Date, count: number, now = new Date()): PushMessage => ({
    title: count > 1 ? "Turnos nuevos" : "Turno nuevo",
    body:
      count > 1
        ? `Tenés ${count} turnos nuevos, el primero ${formatAppointmentShort(startsAt, now)}.`
        : `Tenés un turno nuevo: ${formatAppointmentShort(startsAt, now)}.`,
    url: TURNOS,
  }),
  appointmentChanged: (startsAt: Date, now = new Date()): PushMessage => ({
    title: "Cambió tu turno",
    body: `Ahora es ${formatAppointmentShort(startsAt, now)}. Tocá para ver el detalle.`,
    url: TURNOS,
  }),
  appointmentCancelled: (startsAt: Date, count: number, now = new Date()): PushMessage => ({
    title: count > 1 ? "Turnos cancelados" : "Turno cancelado",
    body:
      count > 1
        ? `Se cancelaron ${count} turnos, desde el de ${formatAppointmentShort(startsAt, now)}.`
        : `Se canceló el turno de ${formatAppointmentShort(startsAt, now)}.`,
    url: TURNOS,
  }),
  feedback: (): PushMessage => ({
    title: "Devolución nueva",
    body: "Tenés una devolución nueva para leer.",
    url: "/app/devoluciones",
  }),
  task: (): PushMessage => ({
    title: "Tarea nueva",
    body: "Tenés una tarea nueva. Sin apuro: hacela a tu ritmo.",
    url: "/app/tareas",
  }),
  resource: (): PushMessage => ({
    title: "Material nuevo",
    body: "Te compartieron material para leer o escuchar.",
    url: "/app/material",
  }),
  assessment: (): PushMessage => ({
    title: "Cuestionario nuevo",
    body: "Tenés un cuestionario para completar cuando puedas.",
    url: "/app/evaluaciones",
  }),
  // Profesional: sin el nombre del paciente.
  patientCancelled: (startsAt: Date, dayKey: string, now = new Date()): PushMessage => ({
    title: "Un paciente no puede venir",
    body: `Avisó que no va al turno de ${formatAppointmentShort(startsAt, now)}.`,
    url: `/pro/agenda?dia=${dayKey}`,
  }),
  patientLinked: (): PushMessage => ({
    title: "Invitación aceptada",
    body: "Un paciente aceptó tu invitación y ya está en tu lista.",
    url: "/pro",
  }),
  // Aviso de seguridad: no se puede apagar. `url` lleva a cambiar o recuperar la contraseña.
  accountChanged: (change: "profile" | "password", url: string): PushMessage => ({
    title: change === "password" ? "Cambió tu contraseña" : "Cambiaron tus datos",
    body:
      change === "password"
        ? "Se cambió la contraseña de tu cuenta. Si no fuiste vos, tocá acá para recuperarla."
        : "Se modificaron los datos de tu cuenta. Si no fuiste vos, tocá acá y cambiá tu contraseña.",
    url,
  }),
  test: (professional: boolean): PushMessage => ({
    title: "Anclaje",
    body: "Así te van a llegar los avisos. ¡Funciona!",
    url: professional ? "/pro" : "/app",
  }),
};
