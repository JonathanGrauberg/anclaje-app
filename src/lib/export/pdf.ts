import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { formatDate, formatDateTime } from "@/lib/dates";
import type { PatientExport } from "./patient-data";

// PDF legible de la exportación (A4, fuentes estándar). Las fuentes estándar solo cubren
// WinAnsi (alcanza para español); cualquier otro carácter (emojis, etc.) se reemplaza.

const A4: [number, number] = [595.28, 841.89];
const M = 50;
const INK = rgb(0.16, 0.16, 0.2);
export const MUTED = rgb(0.4, 0.38, 0.44);
const ACCENT = rgb(0.27, 0.46, 0.42);

const VIS = { SHARED: "Compartido", PRIVATE: "Privado" } as const;
const d = (s: string | null | undefined) => (s ? formatDateTime(new Date(s)) : "");

export class Writer {
  private page!: PDFPage;
  private y = 0;
  constructor(
    private doc: PDFDocument,
    private font: PDFFont,
    private bold: PDFFont,
  ) {
    this.newPage();
  }

  private newPage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - M;
  }

  private ensure(h: number) {
    if (this.y - h < M) this.newPage();
  }

  /** Reemplaza lo que la fuente no puede dibujar. */
  private clean(text: string, font: PDFFont) {
    let out = "";
    for (const ch of text.replace(/\r/g, "")) {
      if (ch === "\n" || ch === "\t") {
        out += ch === "\t" ? " " : ch;
        continue;
      }
      try {
        font.encodeText(ch);
        out += ch;
      } catch {
        out += "?";
      }
    }
    return out;
  }

  private wrap(text: string, font: PDFFont, size: number, width: number) {
    const lines: string[] = [];
    for (const para of this.clean(text, font).split("\n")) {
      let line = "";
      for (const word of para.split(" ")) {
        const next = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width) {
          line = next;
          continue;
        }
        if (line) lines.push(line);
        // Palabra más larga que el renglón: se corta.
        let rest = word;
        while (font.widthOfTextAtSize(rest, size) > width) {
          let i = rest.length;
          while (i > 1 && font.widthOfTextAtSize(rest.slice(0, i), size) > width) i--;
          lines.push(rest.slice(0, i));
          rest = rest.slice(i);
        }
        line = rest;
      }
      lines.push(line);
    }
    return lines;
  }

  text(
    text: string,
    opts: {
      size?: number;
      bold?: boolean;
      color?: typeof INK;
      indent?: number;
      after?: number;
    } = {},
  ) {
    const { size = 10.5, bold = false, color = INK, indent = 0, after = 4 } = opts;
    const font = bold ? this.bold : this.font;
    const lh = size * 1.35;
    for (const line of this.wrap(text, font, size, A4[0] - 2 * M - indent)) {
      this.ensure(lh);
      this.y -= lh;
      this.page.drawText(line, { x: M + indent, y: this.y, size, font, color });
    }
    this.y -= after;
  }

  section(title: string, count: number) {
    this.ensure(60);
    this.y -= 14;
    this.text(title, { size: 15, bold: true, color: ACCENT, after: 2 });
    if (count === 0) this.text("Nada registrado.", { color: MUTED, after: 6 });
  }

  item(title: string, meta?: string) {
    this.ensure(40);
    this.y -= 6;
    this.text(title, { bold: true, after: 1 });
    if (meta) this.text(meta, { size: 9, color: MUTED, after: 2 });
  }

  field(label: string, value: string | number | null | undefined) {
    if (value === null || value === undefined || value === "") return;
    this.text(`${label}: ${value}`, { indent: 10, after: 2 });
  }

  footer() {
    const pages = this.doc.getPages();
    pages.forEach((p, i) =>
      p.drawText(`Anclaje · página ${i + 1} de ${pages.length}`, {
        x: M,
        y: 26,
        size: 8,
        font: this.font,
        color: MUTED,
      }),
    );
  }
}

export async function patientExportPdf(data: PatientExport) {
  const doc = await PDFDocument.create();
  doc.setTitle("Mis datos en Anclaje");
  doc.setLanguage("es-AR");
  doc.setCreator("Anclaje");
  const w = new Writer(
    doc,
    await doc.embedFont(StandardFonts.Helvetica),
    await doc.embedFont(StandardFonts.HelveticaBold),
  );

  w.text("Mis datos en Anclaje", { size: 22, bold: true, after: 4 });
  w.text(
    `${data.account.displayName ?? data.account.name} · ${data.account.email} · exportado el ${formatDateTime(new Date(data.exportedAt))}`,
    { color: MUTED },
  );
  w.text(
    "Este documento tiene información personal y sensible. Guardalo en un lugar seguro y compartilo solo con quien vos quieras.",
    { size: 9, color: MUTED, after: 8 },
  );

  w.section("Mi psicóloga", data.professionals.length);
  for (const p of data.professionals)
    w.item(
      p.name,
      `${p.status === "ACTIVE" ? "Vinculados" : "Desvinculados"} · desde el ${formatDate(new Date(p.linkedAt!))} · consentimiento ${p.consentVersion} aceptado el ${d(p.consentAcceptedAt)}`,
    );

  w.section("Rueda de las emociones", data.emotionEntries.length);
  for (const e of data.emotionEntries) {
    w.item(
      e.emotions.map((x) => `${x.emotion} (${x.intensity}/10)`).join(" · "),
      `${d(e.occurredAt)} · ${VIS[e.visibility]}`,
    );
    w.field("Dónde lo sentí", e.bodyZones.join(", "));
    w.field("Nota", e.note);
  }

  w.section("Diario", data.journal.length);
  for (const j of data.journal) {
    w.item(
      j.title || "Sin título",
      `${d(j.createdAt)} · ${VIS[j.visibility]}${j.draft ? " · borrador" : ""}`,
    );
    w.field("Emociones", j.emotions.join(", "));
    w.text(j.body, { indent: 10 });
  }

  w.section("Autorregistros", data.cbtRecords.length);
  for (const c of data.cbtRecords) {
    w.item(
      c.situation || "Autorregistro",
      `${d(c.occurredAt)} · ${VIS[c.visibility]}${c.status === "DRAFT" ? " · sin terminar" : ""}`,
    );
    w.field("Pensamiento", c.thought);
    w.field("Cuánto lo creía", c.beliefBefore !== null ? `${c.beliefBefore}%` : null);
    w.field(
      "Emociones",
      c.emotions
        .map(
          (x) =>
            `${x.emotion} ${x.intensityBefore}/10${x.intensityAfter !== null ? ` → ${x.intensityAfter}/10` : ""}`,
        )
        .join(" · "),
    );
    w.field("Trampas del pensamiento", c.distortions.join(", "));
    w.field("Qué hice", c.behavior);
    w.field("Otra forma de verlo", c.alternative);
    w.field("Cuánto lo creo después", c.beliefAfter !== null ? `${c.beliefAfter}%` : null);
  }

  w.section("Para la próxima sesión", data.sessionTopics.length);
  for (const t of data.sessionTopics)
    w.item(t.text, `${d(t.createdAt)}${t.discussedAt ? ` · hablado el ${d(t.discussedAt)}` : ""}`);

  w.section("Devoluciones de mi psicóloga", data.feedbackReceived.length);
  for (const f of data.feedbackReceived) {
    w.item(f.from, d(f.createdAt));
    w.text(f.body, { indent: 10 });
  }

  w.section("Plan de calma", data.copingPlan.length);
  for (const c of data.copingPlan) {
    w.item(c.title);
    w.field("Detalle", c.body);
    w.field("Teléfono", c.phone);
  }

  w.section("Tareas", data.tasks.length);
  for (const t of data.tasks) {
    w.item(t.title, `De ${t.from}${t.completedAt ? ` · hecha el ${d(t.completedAt)}` : ""}`);
    w.field("Detalle", t.description);
    w.field("Mi comentario", t.myComment);
  }

  w.section("Cuestionarios respondidos", data.assessments.length);
  for (const a of data.assessments) {
    w.item(
      `${a.title} (v${a.version})`,
      `${d(a.completedAt)}${a.totalScore !== null ? ` · puntaje ${a.totalScore}` : ""}${a.interpretation ? ` · ${a.interpretation}` : ""}`,
    );
    for (const ans of a.answers) w.field(ans.question, ans.answer ?? "Sin responder");
  }

  w.footer();
  return doc.save();
}
