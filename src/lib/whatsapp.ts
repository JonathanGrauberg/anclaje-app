import { dayKey, formatLongDay, formatTime } from "@/lib/dates";

// Mensajes de WhatsApp que la profesional manda desde su propio número: la app solo arma el link
// (wa.me) con el texto ya escrito y ella aprieta enviar. Gratis y sin la API de Meta.
// Nunca llevan nada clínico: día, hora, lugar y quién lo manda.

/**
 * Número argentino en el formato que pide wa.me (549 + característica + número, sin 0 ni 15).
 * Acepta como lo escriba la gente: "343 15 456-7890", "0343 4567890", "+54 9 11 5555 0000".
 * Si no se puede interpretar con seguridad, devuelve null.
 */
export function normalizeWhatsappNumber(raw: string) {
  const digits = raw.replace(/\D/g, "");
  // Número de otro país escrito con "+": se usa tal cual.
  if (raw.trim().startsWith("+") && !digits.startsWith("54")) {
    return digits.length >= 8 && digits.length <= 15 ? digits : null;
  }
  // Las características argentinas empiezan con 1, 2 o 3: un "54" adelante es el código de país.
  if (digits.startsWith("549") && digits.length === 13) return digits;
  if (digits.startsWith("54") && digits.length === 12) return `549${digits.slice(2)}`;

  let national = digits.replace(/^0/, "");
  if (national.length === 12) {
    // Con el 15 de celular después de la característica (de 2, 3 o 4 cifras).
    const at = [2, 3, 4].find((i) => national.slice(i, i + 2) === "15");
    if (at === undefined) return null;
    national = national.slice(0, at) + national.slice(at + 2);
  }
  return national.length === 10 && /^[123]/.test(national) ? `549${national}` : null;
}

/** Primer teléfono de un texto libre de contacto ("ana@x.com · 343 15 456-7890"). */
export function extractPhone(contact: string | null | undefined) {
  for (const m of contact?.match(/\+?\d[\d\s().-]{6,}\d/g) ?? []) {
    const n = normalizeWhatsappNumber(m);
    if (n) return n;
  }
  return null;
}

/** Link que abre WhatsApp con el texto escrito. Sin número, WhatsApp deja elegir el chat. */
export function whatsappMessageHref(phone: string | null, text: string) {
  return `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/** "hoy" · "mañana jueves 5 de noviembre" · "el jueves 5 de noviembre" */
function whenText(d: Date, now: Date) {
  const day = formatLongDay(d).replace(",", "");
  if (dayKey(d) === dayKey(now)) return "hoy";
  if (dayKey(d) === dayKey(new Date(now.getTime() + 86_400_000))) return `mañana ${day}`;
  return `el ${day}`;
}

type AppointmentMessage = {
  patientName: string;
  professionalName: string;
  startsAt: Date;
  modality: "IN_PERSON" | "ONLINE";
  place: string | null;
  now?: Date;
};

function whereText({ modality, place }: Pick<AppointmentMessage, "modality" | "place">) {
  if (modality === "ONLINE")
    return place ? ` Es por videollamada: ${place}` : " Es por videollamada.";
  return place ? ` En ${place}.` : "";
}

export function appointmentReminderMessage(a: AppointmentMessage) {
  const when = whenText(a.startsAt, a.now ?? new Date());
  return (
    `Hola, ${firstName(a.patientName)}. Te recuerdo el turno de ${when} a las ${formatTime(a.startsAt)}.` +
    `${whereText(a)}\n¡Nos vemos! ${a.professionalName}`
  );
}

export function appointmentCancelledMessage(a: AppointmentMessage) {
  const when = whenText(a.startsAt, a.now ?? new Date());
  return (
    `Hola, ${firstName(a.patientName)}. Te aviso que el turno de ${when} a las ${formatTime(a.startsAt)} ` +
    `queda cancelado. Cuando quieras, coordinamos otro.\n${a.professionalName}`
  );
}

export function invitationMessage({
  patientName,
  professionalName,
  link,
}: {
  patientName?: string;
  professionalName: string;
  link: string;
}) {
  const hello = patientName ? `Hola, ${firstName(patientName)}.` : "¡Hola!";
  return (
    `${hello} Te invito a usar Anclaje, la app que uso para acompañarte entre sesión y sesión. ` +
    `Entrá a este link, creá tu cuenta y aceptá la invitación (vence en 7 días):\n${link}\n` +
    `Vos elegís qué compartir conmigo. ${professionalName}`
  );
}
