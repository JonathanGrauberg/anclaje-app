"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { findLinkedPatient } from "@/lib/access";
import { audit } from "@/lib/audit";
import { dayKey, fromLocalInputValue } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { createManagedPatient } from "@/lib/managed-patients";
import { notifyPatient, notifyProfessional } from "@/lib/notify";
import { pushMessages } from "@/lib/push-messages";
import { patientForAction, professionalForAction } from "@/lib/session";
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  type CreateAppointmentInput,
  type UpdateAppointmentInput,
} from "@/lib/validation/appointments";
import { fail, firstIssue, ok, safe } from "./result";

// Turnera. La profesional crea, cambia y cancela turnos de sus pacientes vinculados; el paciente
// los ve y puede avisar que no va. Todo se verifica acá, en el servidor.

const WEEK = 7 * 86_400_000;

function refresh() {
  revalidatePath("/pro", "layout");
  revalidatePath("/app", "layout");
}

export async function createAppointment(input: CreateAppointmentInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = createAppointmentSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { newPatient, startsAt, durationMin, modality, place, repeatWeeks } = parsed.data;
    const first = fromLocalInputValue(startsAt);
    if (Number.isNaN(first.getTime())) return fail("Fecha inválida");
    if (first.getTime() < Date.now() - 60 * 60_000)
      return fail("Elegí una fecha que no haya pasado");
    if (!newPatient && !(await findLinkedPatient(professional.id, parsed.data.patientId!)))
      return fail("No tenés vínculo activo con ese paciente");

    const seriesId = repeatWeeks > 1 ? randomUUID() : null;
    const data = Array.from({ length: repeatWeeks }, (_, i) => ({
      professionalId: professional.id,
      startsAt: new Date(first.getTime() + i * WEEK), // Argentina no tiene horario de verano
      durationMin,
      modality,
      place: place || null,
      seriesId,
    }));
    const { patientId, created } = await prisma.$transaction(async (tx) => {
      // Paciente nuevo sin la app: se crea junto con el turno.
      const created = newPatient
        ? await createManagedPatient(tx, professional.id, newPatient)
        : null;
      const patientId = created?.id ?? parsed.data.patientId!;
      await tx.appointment.createMany({ data: data.map((d) => ({ ...d, patientId })) });
      return { patientId, created };
    });
    if (created) {
      await audit({
        actorId: userId,
        action: "create",
        entityType: "ManagedPatient",
        entityId: patientId,
        patientId,
      });
    }
    await audit({
      actorId: userId,
      action: "create",
      entityType: "Appointment",
      patientId,
      meta: { count: repeatWeeks },
    });
    after(() =>
      notifyPatient(
        patientId,
        "appointmentChanges",
        pushMessages.appointmentCreated(first, repeatWeeks),
      ),
    );
    refresh();
    return ok({
      count: repeatWeeks,
      newPatient: created ? { id: created.id, name: created.displayName ?? "" } : null,
    });
  });
}

/** Turno propio, de un paciente con vínculo activo. */
async function ownAppointment(professionalId: string, id: string) {
  return prisma.appointment.findFirst({
    where: {
      id: String(id),
      professionalId,
      patient: { links: { some: { professionalId, status: "ACTIVE" } } },
    },
  });
}

export async function updateAppointment(input: UpdateAppointmentInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = updateAppointmentSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const a = await ownAppointment(professional.id, parsed.data.id);
    if (!a || a.status !== "SCHEDULED") return fail("No encontramos ese turno");
    const startsAt = fromLocalInputValue(parsed.data.startsAt);
    if (Number.isNaN(startsAt.getTime())) return fail("Fecha inválida");
    await prisma.appointment.update({
      where: { id: a.id },
      data: {
        startsAt,
        durationMin: parsed.data.durationMin,
        modality: parsed.data.modality,
        place: parsed.data.place || null,
      },
    });
    await audit({
      actorId: userId,
      action: "update",
      entityType: "Appointment",
      entityId: a.id,
      patientId: a.patientId,
    });
    if (startsAt.getTime() > Date.now()) {
      after(() =>
        notifyPatient(a.patientId, "appointmentChanges", pushMessages.appointmentChanged(startsAt)),
      );
    }
    refresh();
    return ok(undefined);
  });
}

/** Cancela un turno, o ese y los siguientes de la misma serie semanal. */
export async function cancelAppointment(id: string, scope: "one" | "following" = "one") {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const a = await ownAppointment(professional.id, id);
    if (!a || a.status !== "SCHEDULED") return fail("No encontramos ese turno");
    const res = await prisma.appointment.updateMany({
      where:
        scope === "following" && a.seriesId
          ? {
              seriesId: a.seriesId,
              professionalId: professional.id,
              status: "SCHEDULED",
              startsAt: { gte: a.startsAt },
            }
          : { id: a.id },
      data: { status: "CANCELLED", cancelledBy: "PROFESSIONAL", cancelledAt: new Date() },
    });
    await audit({
      actorId: userId,
      action: "update",
      entityType: "Appointment",
      entityId: a.id,
      patientId: a.patientId,
      meta: { status: "CANCELLED", count: res.count },
    });
    if (a.startsAt.getTime() > Date.now()) {
      after(() =>
        notifyPatient(
          a.patientId,
          "appointmentChanges",
          pushMessages.appointmentCancelled(a.startsAt, res.count),
        ),
      );
    }
    refresh();
    return ok({ count: res.count });
  });
}

/** El paciente avisa que no puede ir: el turno queda cancelado y la profesional lo ve. */
export async function cancelMyAppointment(id: string) {
  return safe(async () => {
    const patient = await patientForAction();
    const res = await prisma.appointment.updateMany({
      where: {
        id: String(id),
        patientId: patient.id,
        status: "SCHEDULED",
        startsAt: { gte: new Date() },
        professional: { links: { some: { patientId: patient.id, status: "ACTIVE" } } },
      },
      data: { status: "CANCELLED", cancelledBy: "PATIENT", cancelledAt: new Date() },
    });
    if (res.count === 0) return fail("No encontramos ese turno");
    const a = await prisma.appointment.findUnique({
      where: { id: String(id) },
      select: { professionalId: true, startsAt: true },
    });
    if (a) {
      after(() =>
        notifyProfessional(
          a.professionalId,
          "patientCancelled",
          pushMessages.patientCancelled(a.startsAt, dayKey(a.startsAt)),
        ),
      );
    }
    refresh();
    return ok(undefined);
  });
}
