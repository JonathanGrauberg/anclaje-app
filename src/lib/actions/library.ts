"use server";

import { revalidatePath } from "next/cache";
import { findLinkedPatient } from "@/lib/access";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { professionalForAction } from "@/lib/session";
import { isValidKey, storage } from "@/lib/storage";
import { resourceSchema, type ResourceInput } from "@/lib/validation/pro";
import { fail, firstIssue, ok, safe } from "./result";

// Biblioteca de la profesional: recursos propios y asignación a pacientes vinculados.

export async function saveResource(input: ResourceInput) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const parsed = resourceSchema.safeParse(input);
    if (!parsed.success) return fail(firstIssue(parsed.error));
    const { id, ...data } = parsed.data;
    if (data.storageKey && !isValidKey(data.storageKey)) return fail("Archivo inválido");

    let resourceId = id;
    if (id) {
      const prev = await prisma.resource.findFirst({
        where: { id, professionalId: professional.id },
        select: { storageKey: true },
      });
      if (!prev) return fail("No encontramos ese recurso");
      await prisma.resource.update({ where: { id }, data });
      if (prev.storageKey && prev.storageKey !== data.storageKey) {
        await storage().delete(prev.storageKey);
      }
    } else {
      const r = await prisma.resource.create({
        data: { ...data, professionalId: professional.id },
        select: { id: true },
      });
      resourceId = r.id;
    }
    await audit({
      actorId: userId,
      action: id ? "update" : "create",
      entityType: "Resource",
      entityId: resourceId,
    });
    revalidatePath("/pro/biblioteca");
    return ok({ id: resourceId! });
  });
}

export async function deleteResource(id: string) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const r = await prisma.resource.findFirst({
      where: { id, professionalId: professional.id },
      select: { storageKey: true },
    });
    if (!r) return fail("No encontramos ese recurso");
    await prisma.resource.delete({ where: { id } });
    if (r.storageKey) await storage().delete(r.storageKey);
    await audit({ actorId: userId, action: "delete", entityType: "Resource", entityId: id });
    revalidatePath("/pro/biblioteca");
    return ok(undefined);
  });
}

export async function setResourceAssignment(
  resourceId: string,
  patientId: string,
  assigned: boolean,
) {
  return safe(async () => {
    const { userId, professional } = await professionalForAction();
    const own = await prisma.resource.count({
      where: { id: resourceId, professionalId: professional.id },
    });
    if (!own) return fail("No encontramos ese recurso");
    if (!(await findLinkedPatient(professional.id, patientId)))
      return fail("No tenés vínculo activo");

    if (assigned) {
      await prisma.resourceAssignment.upsert({
        where: { resourceId_patientId: { resourceId, patientId } },
        update: {},
        create: { resourceId, patientId },
      });
    } else {
      await prisma.resourceAssignment.deleteMany({ where: { resourceId, patientId } });
    }
    await audit({
      actorId: userId,
      action: assigned ? "create" : "delete",
      entityType: "ResourceAssignment",
      entityId: resourceId,
      patientId,
    });
    revalidatePath("/pro/biblioteca");
    revalidatePath(`/pro/pacientes/${patientId}`);
    return ok(undefined);
  });
}
