export const LOCALE = "es-AR";
export const TIME_ZONE = "America/Argentina/Buenos_Aires";

const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "long",
  year: "numeric",
});

const timeFmt = new Intl.DateTimeFormat(LOCALE, {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export const formatDateTime = (d: Date) => dateTimeFmt.format(d);
export const formatDate = (d: Date) => dateFmt.format(d);
export const formatTime = (d: Date) => timeFmt.format(d);

/** "hoy, 14:30" · "ayer, 09:10" · "lun 3 nov, 18:00" */
export function formatRelative(d: Date, now = new Date()) {
  const day = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(x); // AAAA-MM-DD
  const today = day(now);
  const yesterday = day(new Date(now.getTime() - 86_400_000));
  if (day(d) === today) return `hoy, ${formatTime(d)}`;
  if (day(d) === yesterday) return `ayer, ${formatTime(d)}`;
  return formatDateTime(d);
}

/** Saludo según la hora en Buenos Aires. */
export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(now),
  );
  if (hour < 6) return "Hola";
  if (hour < 13) return "Buen día";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** Valor para <input type="datetime-local"> en hora de Buenos Aires. */
export function toLocalInputValue(d: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`;
}

/** Interpreta un datetime-local como hora de Buenos Aires (UTC-3, sin horario de verano). */
export function fromLocalInputValue(value: string) {
  return new Date(`${value}:00-03:00`);
}
