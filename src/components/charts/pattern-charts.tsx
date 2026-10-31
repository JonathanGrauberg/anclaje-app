"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { BucketRow, CountRow, DailyRow, ScoreSeries } from "@/lib/patterns";

// Gráficos de patrones. Una sola serie por gráfico (sin leyenda: el título la nombra), marcas
// finas, grilla tenue, tooltip al pasar y siempre una vista de tabla para quien no ve el gráfico.

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function ChartCard({
  title,
  description,
  children,
  table,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  table: React.ReactNode;
}) {
  return (
    <section className="bg-card flex min-w-0 flex-col gap-3 rounded-3xl border p-4 sm:p-5">
      <div>
        <h2 className="font-semibold">{title}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
      </div>
      {children}
      <details className="text-sm">
        <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer rounded">
          Ver como tabla
        </summary>
        <div className="mt-2 overflow-x-auto">{table}</div>
      </details>
    </section>
  );
}

function SimpleTable({ head, rows }: { head: [string, string]; rows: [string, string][] }) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="text-muted-foreground">
        <tr>
          <th scope="col" className="py-1 pr-4 font-medium">
            {head[0]}
          </th>
          <th scope="col" className="py-1 font-medium">
            {head[1]}
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([a, b], i) => (
          <tr key={i} className="border-t">
            <td className="py-1 pr-4">{a}</td>
            <td className="py-1 tabular-nums">{b}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function TooltipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-card text-card-foreground rounded-xl border px-3 py-2 text-sm shadow-md">
      {children}
    </div>
  );
}

/** Ranking de emociones como barras HTML: la etiqueta siempre visible, el punto de color es el de la rueda. */
export function EmotionRanking({
  title,
  description,
  rows,
}: {
  title: string;
  description?: string;
  rows: CountRow[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ChartCard
      title={title}
      description={description}
      table={
        <SimpleTable
          head={["Emoción", "Veces"]}
          rows={rows.map((r) => [r.label, String(r.count)])}
        />
      }
    >
      <ul className="flex flex-col gap-2" aria-hidden>
        {rows.map((r) => (
          <li key={r.id} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                style={{ background: r.color }}
              />
              <span className="truncate">{r.label}</span>
            </span>
            <span className="bg-muted h-3 overflow-hidden rounded-full">
              <span
                className="bg-primary block h-full rounded-full"
                style={{ width: `${(r.count / max) * 100}%` }}
              />
            </span>
            <span className="text-muted-foreground text-right tabular-nums">{r.count}</span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

export function IntensityChart({ rows, weekly }: { rows: DailyRow[]; weekly: boolean }) {
  const withData = rows.filter((r) => r.avg !== null);
  return (
    <ChartCard
      title="Cómo vino la intensidad"
      description={`Promedio de intensidad (1 a 10) de cada ${weekly ? "semana" : "día"} con registros.`}
      table={
        <SimpleTable
          head={[weekly ? "Semana" : "Día", "Intensidad promedio"]}
          rows={withData.map((r) => [
            r.label,
            `${r.avg} (${plural(r.count, "registro", "registros")})`,
          ])}
        />
      }
    >
      <div className="h-56" role="img" aria-label="Gráfico de intensidad promedio por día">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 5, 10]}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const r = payload?.[0]?.payload as DailyRow | undefined;
                if (!active || !r) return null;
                return (
                  <TooltipBox>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-muted-foreground">
                      {r.avg === null
                        ? "Sin registros"
                        : `Promedio ${r.avg} · ${plural(r.count, "registro", "registros")}`}
                    </p>
                  </TooltipBox>
                );
              }}
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function BucketChart({
  title,
  description,
  rows,
  unit = ["registro", "registros"],
}: {
  title: string;
  description?: string;
  rows: BucketRow[];
  unit?: [string, string];
}) {
  return (
    <ChartCard
      title={title}
      description={description}
      table={
        <SimpleTable head={["", "Registros"]} rows={rows.map((r) => [r.label, String(r.count)])} />
      }
    >
      <div className="h-44" role="img" aria-label={`Gráfico de barras: ${title}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={rows}
            margin={{ top: 8, right: 8, bottom: 0, left: -24 }}
            barCategoryGap={6}
          >
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} />
            <Tooltip
              cursor={{ fill: "var(--muted)" }}
              content={({ active, payload }) => {
                const r = payload?.[0]?.payload as BucketRow | undefined;
                if (!active || !r) return null;
                return (
                  <TooltipBox>
                    <p className="font-medium">{r.label}</p>
                    <p className="text-muted-foreground">{plural(r.count, ...unit)}</p>
                  </TooltipBox>
                );
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--primary)"
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

export function ScoreChart({ series }: { series: ScoreSeries }) {
  return (
    <ChartCard
      title={series.title}
      description={`Puntaje total en cada respuesta (${plural(series.points.length, "respuesta", "respuestas")}).`}
      table={
        <SimpleTable
          head={["Fecha", "Puntaje"]}
          rows={series.points.map((p) => [
            p.label,
            `${p.score}${p.interpretation ? ` · ${p.interpretation}` : ""}`,
          ])}
        />
      }
    >
      <div className="h-48" role="img" aria-label={`Evolución del puntaje de ${series.title}`}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series.points} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis
              domain={[0, "auto"]}
              allowDecimals={false}
              tick={AXIS}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                const p = payload?.[0]?.payload as ScoreSeries["points"][number] | undefined;
                if (!active || !p) return null;
                return (
                  <TooltipBox>
                    <p className="font-medium">{p.label}</p>
                    <p className="text-muted-foreground">
                      Puntaje {p.score}
                      {p.interpretation ? ` · ${p.interpretation}` : ""}
                    </p>
                  </TooltipBox>
                );
              }}
            />
            <Line
              type="linear"
              dataKey="score"
              stroke="var(--primary)"
              strokeWidth={2}
              dot={{ r: 4, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
              activeDot={{ r: 6, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
