import { Card, CardContent } from "@/components/ui/card";

export type Stat = { label: string; value: number | string; of?: number; hint?: string };

/** Grupo de números grandes del panel de admin. */
export function StatGroup({ title, stats }: { title: string; stats: Stat[] }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st) => (
          <Card key={st.label}>
            <CardContent className="flex flex-col gap-1">
              <p className="text-muted-foreground text-sm">{st.label}</p>
              <p className="text-3xl font-semibold tabular-nums">
                {st.value}
                {st.of !== undefined && (
                  <span className="text-muted-foreground text-base font-normal"> de {st.of}</span>
                )}
              </p>
              {st.hint && <p className="text-muted-foreground text-xs">{st.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
