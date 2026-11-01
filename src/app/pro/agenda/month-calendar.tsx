import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  ["L", "lunes"],
  ["M", "martes"],
  ["M", "miércoles"],
  ["J", "jueves"],
  ["V", "viernes"],
  ["S", "sábado"],
  ["D", "domingo"],
] as const;

const monthFmt = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const dayFmt = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

/** "2026-11" → el mes anterior o siguiente. */
export function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Días del mes ("YYYY-MM-DD") en semanas de lunes a domingo; null = casillero vacío. */
function weeksOf(month: string) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // lunes = 0
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

const utc = (day: string) => new Date(`${day}T12:00:00Z`);

/**
 * Calendario del mes: cada día es un link que lo elige (`?dia=`). Los días con turnos llevan un
 * punto. Se arma en el servidor, sin JavaScript.
 */
export function MonthCalendar({
  month,
  today,
  selected,
  counts,
  hrefFor,
}: {
  month: string;
  today: string;
  selected?: string;
  counts: Map<string, number>;
  hrefFor: (q: { dia?: string; mes?: string }) => string;
}) {
  const title = monthFmt.format(utc(`${month}-01`));
  return (
    <div className="bg-card flex flex-col gap-3 rounded-2xl border p-4">
      <div className="flex items-center justify-between">
        <Link
          href={hrefFor({ mes: shiftMonth(month, -1), dia: selected })}
          className="hover:bg-muted rounded-lg p-1.5"
          aria-label="Mes anterior"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h2 id="calendar-title" className="font-semibold first-letter:uppercase" aria-live="polite">
          {title}
        </h2>
        <Link
          href={hrefFor({ mes: shiftMonth(month, 1), dia: selected })}
          className="hover:bg-muted rounded-lg p-1.5"
          aria-label="Mes siguiente"
        >
          <ChevronRight className="size-5" aria-hidden />
        </Link>
      </div>
      <table className="w-full table-fixed text-center text-sm" aria-labelledby="calendar-title">
        <thead>
          <tr>
            {WEEKDAYS.map(([short, long]) => (
              <th key={long} scope="col" className="text-muted-foreground pb-1 font-medium">
                <abbr title={long} className="no-underline">
                  {short}
                </abbr>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeksOf(month).map((week, i) => (
            <tr key={i}>
              {week.map((day, j) => {
                if (!day) return <td key={j} />;
                const n = counts.get(day) ?? 0;
                const isSelected = day === selected;
                const label = `${dayFmt.format(utc(day))}${day === today ? ", hoy" : ""}${
                  n ? `, ${n} ${n === 1 ? "turno" : "turnos"}` : ""
                }`;
                return (
                  <td key={day} className="p-0.5">
                    <Link
                      href={hrefFor({ dia: day, mes: month })}
                      aria-label={label}
                      aria-current={isSelected ? "date" : undefined}
                      className={cn(
                        "relative flex aspect-square flex-col items-center justify-center rounded-lg transition-colors",
                        isSelected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : "hover:bg-muted",
                        day === today &&
                          !isSelected &&
                          "text-primary ring-primary font-semibold ring-1",
                      )}
                    >
                      {Number(day.slice(8))}
                      {n > 0 && (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute bottom-1 size-1.5 rounded-full",
                            isSelected ? "bg-primary-foreground" : "bg-primary",
                          )}
                        />
                      )}
                    </Link>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted-foreground text-xs">Tocá un día para ver sus turnos y dar uno.</p>
    </div>
  );
}
