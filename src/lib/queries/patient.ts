import "server-only";
import { prisma } from "@/lib/db";

export async function hasActiveLink(patientId: string) {
  const n = await prisma.careLink.count({ where: { patientId, status: "ACTIVE" } });
  return n > 0;
}
