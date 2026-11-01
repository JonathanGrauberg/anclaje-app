import { headers } from "next/headers";
import { audit } from "@/lib/audit";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildPatientExport } from "@/lib/export/patient-data";
import { patientExportPdf } from "@/lib/export/pdf";
import { allow } from "@/lib/rate-limit";

// Descarga de "mis datos" (JSON o PDF). Solo el propio paciente.
export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || (session.user.role ?? "PATIENT") !== "PATIENT")
    return new Response("No autorizado", { status: 401 });
  const patient = await prisma.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!patient) return new Response("No autorizado", { status: 401 });
  if (!allow(`export:${patient.id}`, 5, 10 * 60_000))
    return new Response("Esperá unos minutos antes de volver a descargar.", { status: 429 });

  const format = new URL(req.url).searchParams.get("formato") === "pdf" ? "pdf" : "json";
  const data = await buildPatientExport(patient.id);
  await audit({
    actorId: session.user.id,
    action: "export",
    entityType: "PatientExport",
    entityId: patient.id,
    patientId: patient.id,
    meta: { format },
  });

  const date = data.exportedAt.slice(0, 10);
  const common = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  if (format === "pdf") {
    return new Response(Buffer.from(await patientExportPdf(data)), {
      headers: {
        ...common,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="anclaje-mis-datos-${date}.pdf"`,
      },
    });
  }
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      ...common,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="anclaje-mis-datos-${date}.json"`,
    },
  });
}
