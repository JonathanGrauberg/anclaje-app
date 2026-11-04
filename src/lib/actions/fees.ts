"use server";

import { revalidatePath } from "next/cache";
import { findLinkedPatient } from "@/lib/access";
import { audit } from "@/lib/audit";
import { dayKey } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { professionalForAction } from "@/lib/session";
import {
  patientPriceSchema,
  paymentSchema,
  servicePriceSchema,
  type PatientPriceInput,
  type PaymentInput,
  type ServicePriceInput,
} from "@/lib/validation/fees";
import { fail, firstIssue, ok, safe } from "./result";

// Honorarios: lista de precios, precio por paciente y cobros. Todo es de la profesional y se
// verifica acá, en el servidor (que el paciente esté vinculado y el servicio sea suyo).

function refresh() {
  revalidatePath("/pro", "layout");
}

const ownService = (professionalId: string, id: string) =>
  prisma.servicePrice.findFirst({ where: { id, professionalId } });

export async function saveServicePrice(input: ServicePriceInput) {
  return safe(async () => {
    const { professional } = await professionalForAction();
    const parsed = servicePriceSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { id, name, price } = parsed.data;
    if (id) {
      const res = await prisma.servicePrice.updateMany({
        where: { id, professionalId: professional.id },
        data: { name, price },
      });
      if (res.count === 0) return fail("No encontramos ese precio");
      refresh();
      return ok({ id });
    }
    const count = await prisma.servicePrice.count({ where: { professionalId: professional.id } });
    if (count >= 100) return fail("Llegaste al máximo de 100 precios");
    const last = await prisma.servicePrice.aggregate({
      where: { professionalId: professional.id },
      _max: { sortOrder: true },
    });
    const created = await prisma.servicePrice.create({
      data: {
        professionalId: professional.id,
        name,
        price,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    refresh();
    return ok({ id: created.id });
  });
}

/** Borra un precio de la lista. Los cobros ya hechos quedan (con su concepto guardado). */
export async function deleteServicePrice(id: string) {
  return safe(async () => {
    const { professional } = await professionalForAction();
    const res = await prisma.servicePrice.deleteMany({
      where: { id: String(id), professionalId: professional.id },
    });
    if (res.count === 0) return fail("No encontramos ese precio");
    refresh();
    return ok(undefined);
  });
}

export async function setPatientPrice(input: PatientPriceInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = patientPriceSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { patientId, serviceId, price } = parsed.data;
    const [patient, service] = await Promise.all([
      findLinkedPatient(professional.id, patientId),
      ownService(professional.id, serviceId),
    ]);
    if (!patient) return fail("No tenés vínculo activo con ese paciente");
    if (!service) return fail("No encontramos ese precio");

    if (price === null || price === service.price) {
      await prisma.patientPrice.deleteMany({ where: { patientId, serviceId } });
    } else {
      await prisma.patientPrice.upsert({
        where: { patientId_serviceId: { patientId, serviceId } },
        create: { professionalId: professional.id, patientId, serviceId, price },
        update: { price },
      });
    }
    await audit({
      actorId: userId,
      action: "update",
      entityType: "PatientPrice",
      entityId: serviceId,
      patientId,
    });
    refresh();
    return ok(undefined);
  });
}

export async function createPayment(input: PaymentInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = paymentSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { patientId, serviceId, amount, method, paidOn } = parsed.data;
    const today = dayKey(new Date());
    if (paidOn > today) return fail("La fecha no puede ser futura");
    const [patient, service] = await Promise.all([
      findLinkedPatient(professional.id, patientId),
      serviceId ? ownService(professional.id, serviceId) : null,
    ]);
    if (!patient) return fail("No tenés vínculo activo con ese paciente");
    if (serviceId && !service) return fail("No encontramos ese servicio");

    // Hoy: con la hora real (para ordenar). Otro día: al mediodía de ese día en Buenos Aires.
    const paidAt = paidOn === today ? new Date() : new Date(`${paidOn}T12:00:00-03:00`);
    const payment = await prisma.payment.create({
      data: {
        professionalId: professional.id,
        patientId,
        serviceId: service?.id ?? null,
        concept: service?.name ?? "Otro",
        amount,
        method,
        paidAt,
      },
    });
    await audit({
      actorId: userId,
      action: "create",
      entityType: "Payment",
      entityId: payment.id,
      patientId,
    });
    refresh();
    return ok({ id: payment.id });
  });
}

export async function deletePayment(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const payment = await prisma.payment.findFirst({
      where: { id: String(id), professionalId: professional.id },
      select: { id: true, patientId: true },
    });
    if (!payment) return fail("No encontramos ese cobro");
    await prisma.payment.delete({ where: { id: payment.id } });
    await audit({
      actorId: userId,
      action: "delete",
      entityType: "Payment",
      entityId: payment.id,
      patientId: payment.patientId,
    });
    refresh();
    return ok(undefined);
  });
}
