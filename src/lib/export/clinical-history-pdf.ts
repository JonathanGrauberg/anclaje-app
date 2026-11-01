import "server-only";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { decrypt, decryptOptional } from "@/lib/crypto";
import { formatDate, formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { CLINICAL_RECORD_FIELDS } from "@/lib/validation/pro";
import { MUTED, Writer } from "./pdf";
import { patientName } from "@/lib/patients";

// PDF de la historia clínica de un paciente, para su autora: ficha + evolución + turnos.
// Quien llama ya verificó el vínculo y registra la exportación en la auditoría.

export async function clinicalHistoryPdf(professionalId: string, patientId: string) {
  const [patient, professional, record, notes, appointments] = await Promise.all([
    prisma.patientProfile.findUniqueOrThrow({
      where: { id: patientId },
      select: {
        displayName: true,
        contactEnc: true,
        user: { select: { name: true, email: true } },
      },
    }),
    prisma.professionalProfile.findUniqueOrThrow({
      where: { id: professionalId },
      select: { displayName: true, licenseNumber: true },
    }),
    prisma.clinicalRecord.findUnique({
      where: { professionalId_patientId: { professionalId, patientId } },
    }),
    prisma.clinicalNote.findMany({
      where: { professionalId, patientId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.appointment.findMany({
      where: { professionalId, patientId, startsAt: { lt: new Date() } },
      orderBy: { startsAt: "asc" },
      select: { startsAt: true, status: true, cancelledBy: true },
    }),
  ]);

  const doc = await PDFDocument.create();
  doc.setTitle("Historia clínica");
  doc.setLanguage("es-AR");
  doc.setCreator("Anclaje");
  const w = new Writer(
    doc,
    await doc.embedFont(StandardFonts.Helvetica),
    await doc.embedFont(StandardFonts.HelveticaBold),
  );

  const name = patientName(patient);
  w.text("Historia clínica", { size: 22, bold: true, after: 4 });
  w.text(
    patient.user
      ? `${name} (${patient.user.name}) · ${patient.user.email}`
      : `${name} · paciente sin la app${patient.contactEnc ? ` · ${decrypt(patient.contactEnc)}` : ""}`,
    { color: MUTED },
  );
  w.text(
    `Profesional: ${professional.displayName}${professional.licenseNumber ? ` · ${professional.licenseNumber}` : ""} · generado el ${formatDateTime(new Date())}`,
    { color: MUTED },
  );
  w.text("Documento confidencial. Contiene datos de salud (Ley 25.326 y Ley 26.529).", {
    size: 9,
    color: MUTED,
    after: 8,
  });

  w.section("Ficha", record ? 1 : 0);
  if (record) {
    w.field(
      "Inicio del tratamiento",
      record.treatmentStartedAt ? formatDate(record.treatmentStartedAt) : null,
    );
    const values = {
      reason: record.reasonEnc,
      history: record.historyEnc,
      medication: record.medicationEnc,
      diagnosis: record.diagnosisEnc,
      plan: record.planEnc,
      emergencyContact: record.emergencyContactEnc,
    };
    for (const f of CLINICAL_RECORD_FIELDS) {
      const value = decryptOptional(values[f.key]);
      if (!value) continue;
      w.item(f.label);
      w.text(value, { indent: 10 });
    }
  }

  w.section("Evolución", notes.length);
  for (const n of notes) {
    w.item(
      formatDateTime(n.createdAt),
      n.updatedAt.getTime() !== n.createdAt.getTime()
        ? `editada el ${formatDateTime(n.updatedAt)}`
        : undefined,
    );
    w.text(decrypt(n.bodyEnc), { indent: 10 });
  }

  w.section("Turnos pasados", appointments.length);
  for (const a of appointments) {
    w.text(
      `${formatDateTime(a.startsAt)}${
        a.status === "CANCELLED"
          ? a.cancelledBy === "PATIENT"
            ? " · avisó que no venía"
            : " · cancelado"
          : ""
      }`,
      { indent: 10, after: 1 },
    );
  }

  w.footer();
  return doc.save();
}
