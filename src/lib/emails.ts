// Textos de los mails de Anclaje. Puro (sin DB ni envío) para poder probarlo.
// Regla: ningún mail lleva contenido clínico. Los de la profesional tampoco nombran pacientes
// (igual que el resumen): para ver el detalle se entra a la app.

import { formatLongDay, formatTime } from "@/lib/dates";

export type EmailContent = { subject: string; text: string; html: string };

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** Diseño común: fondo crema, el nombre con su punto dorado y, si hay, un botón. */
function layout(paragraphs: string[], button?: { label: string; url: string }, footer?: string) {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;line-height:1.6">${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");
  const cta = button
    ? `<p style="margin:24px 0"><a href="${esc(button.url)}" style="background:#426f64;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600;display:inline-block">${esc(button.label)}</a></p>`
    : "";
  const foot = footer
    ? `<p style="margin:24px 0 0;font-size:12px;color:#66626f;line-height:1.5">${esc(footer)}</p>`
    : "";
  return `<!doctype html><html lang="es"><body style="margin:0;background:#faf7f2;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif;color:#2a2833">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<p style="margin:0 0 28px;font-size:20px;font-weight:600;letter-spacing:-0.02em"><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#fcc107;margin-right:2px"></span>anclaje</p>
<div style="background:#ffffff;border:1px solid #e6dfd4;border-radius:20px;padding:28px">${body}${cta}</div>
${foot}
</div></body></html>`;
}

function build(
  subject: string,
  paragraphs: string[],
  button?: { label: string; url: string },
  footer?: string,
): EmailContent {
  const text = [
    ...paragraphs,
    ...(button ? [`${button.label}: ${button.url}`] : []),
    ...(footer ? ["", footer] : []),
  ].join("\n\n");
  return { subject, text, html: layout(paragraphs, button, footer) };
}

const firstName = (name: string | null | undefined) => name?.trim().split(/\s+/)[0] || null;

/** Recordatorio del turno del día siguiente, para el paciente (tenga o no la app). */
export function appointmentReminderEmail(a: {
  patientName: string | null;
  professionalName: string;
  startsAt: Date;
  durationMin: number;
  modality: "IN_PERSON" | "ONLINE";
  place: string | null;
  appUrl: string | null; // null si el paciente no tiene la app
}): EmailContent {
  const name = firstName(a.patientName);
  const when = `${formatLongDay(a.startsAt)} a las ${formatTime(a.startsAt)}`;
  const where =
    a.modality === "ONLINE"
      ? a.place
        ? `Es online. Link: ${a.place}`
        : "Es online: el link te lo pasa tu profesional."
      : a.place
        ? `Es presencial, en ${a.place}.`
        : "Es presencial.";
  return build(
    `Recordatorio: tu turno de mañana a las ${formatTime(a.startsAt)}`,
    [
      name ? `Hola, ${name}.` : "Hola.",
      `Te recordamos que mañana, ${when}, tenés turno con ${a.professionalName} (${a.durationMin} minutos).`,
      where,
      a.appUrl
        ? "Si no vas a poder ir, avisá desde la app así ese horario queda libre."
        : "Si no vas a poder ir, avisale a tu profesional así ese horario queda libre.",
    ],
    a.appUrl ? { label: "Ver mis turnos", url: a.appUrl } : undefined,
    a.appUrl
      ? "Si no querés recibir estos recordatorios, apagalos en Ajustes de la app."
      : "Te llega este mail porque tu profesional te dio un turno. Si no querés recibirlos, avisale.",
  );
}

/** Bienvenida a una profesional nueva, con los primeros pasos. Nunca incluye contraseñas. */
export function welcomeProfessionalEmail(a: { name: string; loginUrl: string }): EmailContent {
  return build(
    "Bienvenida a Anclaje",
    [
      `Hola, ${firstName(a.name) ?? a.name}. ¡Qué bueno tenerte en Anclaje!`,
      "Para arrancar, tres pasos:",
      "1. Entrá y, si te dimos una contraseña temporal, cambiala en Ajustes → Contraseña.\n" +
        "2. En «Agregar paciente», invitá a tus pacientes a la app con un código o un link (se lo pasás por WhatsApp). Si alguien no quiere usar la app, cargalo igual: te sirve para la agenda y la historia clínica.\n" +
        "3. En «Agenda», dales turno. El día anterior les llega un recordatorio por mail (a quienes no usan la app, si cargaste su mail en el contacto).",
      "Todo lo que escriben tus pacientes y tus notas clínicas se guarda cifrado. Vos solo ves lo que cada paciente elige compartir con vos.",
    ],
    { label: "Entrar a Anclaje", url: a.loginUrl },
    "Si tenés dudas o algo no funciona, respondé este mail o escribinos.",
  );
}

/** Aviso a la profesional: alguien aceptó su invitación. Sin nombre (ver regla arriba). */
export function patientLinkedEmail(a: {
  professionalName: string;
  url: string;
  merged: boolean;
}): EmailContent {
  return build(
    "Un paciente se vinculó con vos en Anclaje",
    [
      `Hola, ${firstName(a.professionalName) ?? a.professionalName}.`,
      a.merged
        ? "Un paciente que tenías cargado sin la app aceptó tu invitación. Sus turnos y su historia clínica ya están en su cuenta."
        : "Un paciente aceptó tu invitación y ya está vinculado con vos.",
      "Desde ahora vas a ver lo que elija compartirte.",
    ],
    { label: "Ver mis pacientes", url: a.url },
    "Por privacidad, este mail no incluye nombres ni datos de tus pacientes.",
  );
}

/** Primer mail que aparezca en un texto libre de contacto ("11 5555-0000, ana@x.com"). */
export function extractEmail(contact: string | null | undefined) {
  const m = contact?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m ? m[0].toLowerCase() : null;
}
