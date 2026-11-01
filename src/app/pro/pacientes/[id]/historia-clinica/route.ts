import { NextResponse, type NextRequest } from "next/server";
import { findLinkedPatient } from "@/lib/access";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { clinicalHistoryPdf } from "@/lib/export/clinical-history-pdf";
import { getSession } from "@/lib/session";

// Descarga de la historia clínica en PDF. Solo la autora, con vínculo activo. Queda en la auditoría.
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/pro/pacientes/[id]/historia-clinica">,
) {
  const { id } = await ctx.params;
  const session = await getSession();
  if (!session || (session.user.role ?? "PATIENT") === "PATIENT")
    return new NextResponse("No autorizado", { status: 401 });
  const professional = await prisma.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!professional) return new NextResponse("No autorizado", { status: 401 });
  const patient = await findLinkedPatient(professional.id, id);
  if (!patient) return new NextResponse("No encontrado", { status: 404 });

  const pdf = await clinicalHistoryPdf(professional.id, patient.id);
  await audit({
    actorId: session.user.id,
    action: "export",
    entityType: "ClinicalHistory",
    entityId: patient.id,
    patientId: patient.id,
  });
  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="historia-clinica.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
