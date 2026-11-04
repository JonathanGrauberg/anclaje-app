"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatMonth, formatMonthShort } from "@/lib/fees";

const AXIS = { fontSize: 12, fill: "var(--muted-foreground)" };
const compact = new Intl.NumberFormat("es-AR", { notation: "compact", maximumFractionDigits: 1 });

/** Cobrado por mes (últimos 6). Una sola serie: el título la nombra; tabla debajo. */
export function MonthlyChart({
  rows,
  current,
}: {
  rows: { month: string; total: number }[];
  current: string;
}) {
  const data = rows.map((r) => ({ ...r, label: formatMonthShort(r.month) }));
  return (
    <section className="bg-card flex min-w-0 flex-col gap-3 rounded-3xl border p-4 sm:p-5">
      <div>
        <h2 className="font-semibold">Cobrado por mes</h2>
        <p className="text-muted-foreground text-sm">Los últimos 6 meses.</p>
      </div>
      <div className="h-52" role="img" aria-label="Gráfico de lo cobrado en los últimos 6 meses">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={false} />
            <YAxis
              tick={AXIS}
              tickLine={false}
              axisLine={false}
              width={48}
              tickFormatter={(v: number) => `$${compact.format(v)}`}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) => {
                const r = payload?.[0]?.payload as (typeof data)[number] | undefined;
                if (!active || !r) return null;
                return (
                  <div className="bg-card text-card-foreground rounded-xl border px-3 py-2 text-sm shadow-md">
                    <p className="font-medium first-letter:uppercase">{formatMonth(r.month)}</p>
                    <p className="text-muted-foreground tabular-nums">{formatMoney(r.total)}</p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="total"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
              isAnimationActive={false}
              shape={(props: {
                x?: number;
                y?: number;
                width?: number;
                height?: number;
                payload?: { month: string };
              }) => {
                const { x = 0, y = 0, width = 0, height = 0, payload } = props;
                const h = Math.max(0, height);
                const r = Math.min(4, width / 2, h);
                return (
                  <path
                    d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + h} Z`}
                    fill="var(--primary)"
                    opacity={payload?.month === current ? 1 : 0.45}
                  />
                );
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="text-sm">
        <summary className="text-muted-foreground hover:text-foreground w-fit cursor-pointer rounded">
          Ver como tabla
        </summary>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 pr-4 font-medium">
                Mes
              </th>
              <th scope="col" className="py-1 font-medium">
                Cobrado
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.month} className="border-t">
                <td className="py-1 pr-4 first-letter:uppercase">{formatMonth(r.month)}</td>
                <td className="py-1 tabular-nums">{formatMoney(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
