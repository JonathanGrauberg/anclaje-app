// Fichas repetidas: la profesional cargó a alguien "sin la app" y esa misma persona ya tiene
// cuenta y está vinculada con ella. Los turnos de la ficha sin app no le aparecen al paciente en
// su app (pero el recordatorio por mail sí le llega), así que se avisa para que las una.
// Puro (sin DB) para poder probarlo.

import { extractEmail } from "@/lib/emails";

export type ManagedForMatch = { id: string; name: string; contact: string | null };
export type AppForMatch = { id: string; name: string; email: string };

/** "  María  José Pérez " → "maria jose perez". */
export function normalizeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Para cada ficha sin la app, la cuenta vinculada que parece ser la misma persona: mismo email
 * (el del contacto cargado) o mismo nombre completo (al menos nombre y apellido). Devuelve
 * id sin app → cuenta con la app.
 */
export function matchDuplicates(managed: ManagedForMatch[], app: AppForMatch[]) {
  const byEmail = new Map(app.map((a) => [a.email.toLowerCase(), a]));
  const byName = new Map<string, AppForMatch>();
  for (const a of app) {
    const n = normalizeName(a.name);
    if (n.includes(" ")) byName.set(n, a);
  }
  const out = new Map<string, AppForMatch>();
  for (const m of managed) {
    const email = extractEmail(m.contact);
    const hit = (email && byEmail.get(email)) || byName.get(normalizeName(m.name));
    if (hit) out.set(m.id, hit);
  }
  return out;
}
