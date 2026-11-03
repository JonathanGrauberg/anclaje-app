// Celular de una persona (Ajustes → Datos personales). Se guarda ya listo para WhatsApp (wa.me):
// solo dígitos, con el código de país y, en Argentina, el 9 de celular (549 + área + número).
// Así el botón de WhatsApp funciona siempre, escriba la gente el número como lo escriba.

export type PhoneCountry = {
  code: string; // código de país, sin "+"
  name: string;
  /** Cuántos dígitos tiene el número nacional (sin el 0 de larga distancia). */
  digits: [min: number, max: number];
  example: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "54", name: "Argentina", digits: [10, 10], example: "11 2345 6789" },
  { code: "598", name: "Uruguay", digits: [8, 8], example: "94 123 456" },
  { code: "56", name: "Chile", digits: [9, 9], example: "9 1234 5678" },
  { code: "595", name: "Paraguay", digits: [9, 9], example: "981 123 456" },
  { code: "55", name: "Brasil", digits: [10, 11], example: "11 91234 5678" },
  { code: "591", name: "Bolivia", digits: [8, 8], example: "7123 4567" },
  { code: "51", name: "Perú", digits: [9, 9], example: "912 345 678" },
  { code: "52", name: "México", digits: [10, 10], example: "55 1234 5678" },
  { code: "34", name: "España", digits: [9, 9], example: "612 34 56 78" },
  { code: "1", name: "Estados Unidos", digits: [10, 10], example: "212 555 0123" },
];

export const DEFAULT_PHONE_COUNTRY = "54";

const countryOf = (code: string) => PHONE_COUNTRIES.find((c) => c.code === code);

/** Ayuda que se muestra debajo del campo. */
export function phoneHint(code: string) {
  if (code === "54")
    return "Código de área sin el 0 y número sin el 15: son 10 números. Ej: 11 2345 6789 o 343 456 7890.";
  const c = countryOf(code);
  return c ? `Sin el 0 de adelante. Ej: ${c.example}.` : "";
}

/** Dígitos del número nacional tal como se tipea (para el contador del campo). */
export function nationalDigits(code: string, raw: string) {
  const d = raw.replace(/\D/g, "");
  return code === "1" ? d : d.replace(/^0+/, "");
}

/**
 * Arma el número para guardar. Devuelve el número listo para wa.me, o un mensaje de error.
 * En Argentina acepta que se cuele el 15 después de la característica y lo saca.
 */
export function buildPhone(
  code: string,
  raw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const c = countryOf(code);
  if (!c) return { ok: false, error: "Elegí el país del celular." };
  let n = nationalDigits(code, raw);
  if (code === "54") {
    if (n.length === 12) {
      const at = [2, 3, 4].find((i) => n.slice(i, i + 2) === "15");
      if (at !== undefined) n = n.slice(0, at) + n.slice(at + 2);
    }
    if (n.length !== 10)
      return {
        ok: false,
        error: `Tienen que ser 10 números: código de área sin el 0 y número sin el 15 (pusiste ${n.length}).`,
      };
    if (!/^[123]/.test(n))
      return { ok: false, error: "El código de área empieza con 1, 2 o 3 (sin el 0)." };
    return { ok: true, value: `549${n}` };
  }
  const [min, max] = c.digits;
  if (n.length < min || n.length > max)
    return {
      ok: false,
      error:
        min === max
          ? `En ${c.name} son ${min} números (pusiste ${n.length}).`
          : `En ${c.name} son entre ${min} y ${max} números (pusiste ${n.length}).`,
    };
  return { ok: true, value: `${code}${n}` };
}

/** Lo guardado, separado en país y número, para volver a mostrarlo en el formulario. */
export function splitPhone(stored: string | null | undefined) {
  if (!stored) return { code: DEFAULT_PHONE_COUNTRY, national: "" };
  if (stored.startsWith("549")) return { code: "54", national: stored.slice(3) };
  const c = [...PHONE_COUNTRIES]
    .sort((a, b) => b.code.length - a.code.length)
    .find((x) => stored.startsWith(x.code));
  return c
    ? { code: c.code, national: stored.slice(c.code.length) }
    : { code: DEFAULT_PHONE_COUNTRY, national: stored };
}

/** El número nacional en grupos ("11 2345 6789", "343 456 7890"), para el campo. */
export function formatNational(code: string, national: string) {
  if (code === "54" && national.length === 10) {
    // Característica de 2 cifras (11, CABA y GBA) o de 3: sin tabla, alcanza para leerlo.
    const area = national.startsWith("11") ? 2 : 3;
    const rest = national.slice(area);
    return `${national.slice(0, area)} ${rest.slice(0, -4)} ${rest.slice(-4)}`;
  }
  return national;
}

/** "+54 9 11 2345-6789" (Argentina) o "+598 94123456": para mostrar. */
export function formatPhone(stored: string) {
  const { code, national } = splitPhone(stored);
  const grouped = formatNational(code, national);
  if (code === "54") return `+54 9 ${grouped.replace(/ (\d{4})$/, "-$1")}`;
  return `+${code} ${grouped}`;
}
