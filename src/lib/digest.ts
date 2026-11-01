// Resumen por email de la profesional. Puro: solo cuenta. Sin nombres ni contenido de pacientes
// (el email no es un canal seguro para datos sensibles): para ver el detalle, se entra a la app.

export type DigestRow = {
  pendingFeedback: number;
  overdueTasks: number;
  unreviewedAssessments: number;
  criticalAssessmentAt: Date | null;
  highIntensityAt: Date | null;
};

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function summarizeDigest(rows: DigestRow[]) {
  const sum = (f: (r: DigestRow) => number) => rows.reduce((a, r) => a + f(r), 0);
  const counts = {
    patients: rows.filter(
      (r) =>
        r.pendingFeedback ||
        r.overdueTasks ||
        r.unreviewedAssessments ||
        r.criticalAssessmentAt ||
        r.highIntensityAt,
    ).length,
    critical: rows.filter((r) => r.criticalAssessmentAt).length,
    highIntensity: rows.filter((r) => r.highIntensityAt).length,
    pendingFeedback: sum((r) => r.pendingFeedback),
    unreviewed: sum((r) => r.unreviewedAssessments),
    overdue: sum((r) => r.overdueTasks),
  };
  const lines = [
    counts.critical &&
      `• ${n(counts.critical, "paciente", "pacientes")} con un ítem crítico en una evaluación`,
    counts.highIntensity &&
      `• ${n(counts.highIntensity, "paciente", "pacientes")} con intensidad muy alta`,
    counts.pendingFeedback &&
      `• ${n(counts.pendingFeedback, "entrada pide", "entradas piden")} una devolución`,
    counts.unreviewed && `• ${n(counts.unreviewed, "evaluación", "evaluaciones")} sin revisar`,
    counts.overdue && `• ${n(counts.overdue, "tarea vencida", "tareas vencidas")}`,
  ].filter(Boolean) as string[];
  return { counts, lines, empty: lines.length === 0 };
}

export function digestEmail(name: string, lines: string[], url: string) {
  const subject = "Anclaje: tu resumen";
  const text = [
    `Hola, ${name}.`,
    "",
    "Esto está esperando tu mirada en Anclaje:",
    ...lines,
    "",
    `Entrá para ver el detalle: ${url}`,
    "",
    "Por privacidad, este email no incluye nombres ni contenido de tus pacientes.",
    "Podés cambiar la frecuencia del resumen en Ajustes.",
  ].join("\n");
  return { subject, text };
}
