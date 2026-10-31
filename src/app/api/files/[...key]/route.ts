import { NextResponse, type NextRequest } from "next/server";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { isValidKey, storage } from "@/lib/storage";

// Descarga/visualización de un archivo, con chequeo de permisos en el servidor:
// - profesional: recursos propios y resultados externos que cargó ella (con vínculo activo).
// - paciente: recursos que le asignaron o que le adjuntaron en una devolución.
export async function GET(_req: NextRequest, ctx: RouteContext<"/api/files/[...key]">) {
  const key = (await ctx.params).key.join("/");
  const notFound = () => new NextResponse("No encontrado", { status: 404 });
  if (!isValidKey(key)) return notFound();

  const session = await getSession();
  if (!session) return new NextResponse("No autorizado", { status: 401 });
  const role = session.user.role ?? "PATIENT";

  let allowed = false;
  let patientId: string | null = null;
  if (role === "PATIENT") {
    const patient = await prisma.patientProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (patient) {
      const n = await prisma.resource.count({
        where: {
          storageKey: key,
          OR: [
            { assignments: { some: { patientId: patient.id } } },
            { feedbacks: { some: { patientId: patient.id } } },
          ],
        },
      });
      allowed = n > 0;
    }
  } else {
    const pro = await prisma.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (pro) {
      const own = await prisma.resource.count({
        where: { storageKey: key, professionalId: pro.id },
      });
      if (own) allowed = true;
      else {
        const ext = await prisma.externalResult.findFirst({
          where: {
            storageKey: key,
            professionalId: pro.id,
            patient: { links: { some: { professionalId: pro.id, status: "ACTIVE" } } },
          },
          select: { id: true, patientId: true },
        });
        if (ext) {
          allowed = true;
          patientId = ext.patientId;
          await audit({
            actorId: session.user.id,
            action: "view",
            entityType: "ExternalResultFile",
            entityId: ext.id,
            patientId,
          });
        }
      }
    }
  }
  if (!allowed) return notFound();

  const file = await storage().get(key);
  if (!file) return notFound();
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
    },
  });
}
