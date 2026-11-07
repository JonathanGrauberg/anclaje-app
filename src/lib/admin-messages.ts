import { formatFreeUntil, freeDaysLeft } from "@/lib/launch";

// Mensajes listos para que el admin le pase a una profesional su usuario y contraseña temporal por
// WhatsApp (u otro canal que no sea el mismo mail). Ver DECISIONES.md.

export type AccessMessageKind = "alta" | "nueva";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function accessMessage(a: {
  kind: AccessMessageKind;
  name: string;
  email: string;
  password: string;
  origin: string;
  now?: Date;
}) {
  const hola = `¡Hola, ${firstName(a.name)}!`;
  const datos = [
    `Entrá en ${a.origin}/ingresar con:`,
    `Usuario: ${a.email}`,
    `Contraseña: ${a.password}`,
  ].join("\n");
  const cambiar = `Esa contraseña es solo para esta vez. Cuando entres, cambiala por una tuya en Ajustes → Contraseña (${a.origin}/pro/ajustes#contrasena).`;

  if (a.kind === "nueva") {
    return [
      `${hola} Te generé una contraseña nueva para entrar a .anclaje. La anterior ya no funciona.`,
      datos,
      cambiar,
    ].join("\n\n");
  }

  const gratis =
    freeDaysLeft(a.now) > 0
      ? ` Es gratis para siempre por sumarte antes del ${formatFreeUntil()}.`
      : "";
  return [
    `${hola} Ya está lista tu cuenta de .anclaje 🙌${gratis}`,
    datos,
    cambiar,
    "Adentro vas a encontrar a Sofía (DEMO), una paciente de ejemplo, y el botón «Ver la app como paciente» para ver lo mismo que ven tus pacientes.",
    "Cualquier cosa que no ande, o algo que te gustaría que tenga, escribime por acá. ¡Me sirve muchísimo!",
  ].join("\n\n");
}

/** Mensaje para WhatsApp con el link para que un interesado cree su cuenta. */
export function signupMessage(a: { name: string; url: string; now?: Date }) {
  const gratis =
    freeDaysLeft(a.now) > 0
      ? ` gratis para siempre por sumarte antes del ${formatFreeUntil()}`
      : "";
  return [
    `¡Hola, ${firstName(a.name)}! Gracias por sumarte a .anclaje 🙌`,
    `Te paso el link para que crees tu usuario${gratis}:\n${a.url}`,
    "Te lleva un minuto: tus datos, tu matrícula y una contraseña. Adentro vas a encontrar a Sofía (DEMO), una paciente de ejemplo, y el botón «Ver la app como paciente».",
    "Cualquier cosa, escribime por acá. ¡Me sirve muchísimo!",
  ].join("\n\n");
}
