import Link from "next/link";
import { BucketChart, EmotionRanking, IntensityChart } from "@/components/charts/pattern-charts";
import type { Patterns } from "@/lib/patterns";
import { RANGES } from "@/lib/queries/patterns";
import { cn } from "@/lib/utils";

/** Selector de período: una fila de links (sirve sin JS y queda en la URL). */
export function RangeFilter({ base, days }: { base: string; days: number }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <nav aria-label="Período" className="bg-muted flex w-fit gap-1 rounded-full p-1 text-sm">
      {RANGES.map((r) => (
        <Link
          key={r.days}
          href={`${base}${sep}dias=${r.days}`}
          aria-current={r.days === days ? "true" : undefined}
          className={cn(
            "rounded-full px-3 py-1.5",
            r.days === days
              ? "bg-card font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {r.label}
        </Link>
      ))}
    </nav>
  );
}

/** Los gráficos de la rueda, para el paciente (`who="self"`) o la profesional. */
export function PatternsView({ patterns, who }: { patterns: Patterns; who: "self" | "pro" }) {
  const self = who === "self";
  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2">
      <div className="md:col-span-2">
        <IntensityChart rows={patterns.daily} weekly={patterns.weekly} />
      </div>
      <EmotionRanking
        title={self ? "Lo que más aparece" : "Emociones más registradas"}
        description="Agrupado por emoción central de la rueda."
        rows={patterns.families}
      />
      <EmotionRanking
        title="Más en detalle"
        description="La emoción más específica que se eligió."
        rows={patterns.specific}
      />
      <BucketChart
        title={self ? "En qué momento del día" : "Momento del día"}
        rows={patterns.byTimeOfDay}
      />
      <BucketChart title={self ? "Qué días" : "Día de la semana"} rows={patterns.byWeekday} />
    </div>
  );
}
