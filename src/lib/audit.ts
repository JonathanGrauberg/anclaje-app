import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

export type AuditAction = "view" | "create" | "update" | "delete" | "export";

/**
 * Registra un acceso o cambio sobre un dato clínico. Se llama en cada lectura/modificación que
 * hace una profesional. Si el registro falla no se corta la operación, pero se loguea.
 */
export async function audit(entry: {
  actorId: string;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  patientId?: string | null;
  meta?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({ data: entry });
  } catch (e) {
    console.error("[audit] no se pudo registrar", entry.action, entry.entityType, e);
  }
}
