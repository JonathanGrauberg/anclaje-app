import { ChartLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PatternsView, RangeFilter } from "@/components/charts/patterns-view";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { getPatterns, parseRange } from "@/lib/queries/patterns";
import { requirePatient } from "@/lib/session";

export const metadata: Metadata = { title: "Mis patrones" };

export default async function PatternsPage({ searchParams }: PageProps<"/app/patrones">) {
  const { patient } = await requirePatient();
  const days = parseRange((await searchParams).dias);
  const patterns = await getPatterns({ patientId: patient.id }, days);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        tone="sage"
        back={{ href: "/app", label: "Inicio" }}
        title="Mis patrones"
        description="Lo que fuiste registrando en la rueda, visto de lejos. No hay valores buenos ni malos: es para conocerte un poco más."
      />
      <RangeFilter base="/app/patrones" days={days} />
      {patterns.total === 0 ? (
        <EmptyState
          icon={<ChartLine />}
          title="Todavía no hay registros en este período"
          action={
            <Button asChild variant="soft">
              <Link href="/app/rueda">Ir a la rueda</Link>
            </Button>
          }
        >
          Cuando registres cómo te sentís en la rueda, acá vas a ver qué emociones aparecen más, en
          qué momentos y cómo varía la intensidad.
        </EmptyState>
      ) : (
        <PatternsView patterns={patterns} who="self" />
      )}
    </div>
  );
}
