import { ChartLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Mis patrones" };

// Los gráficos llegan en la fase 4.
export default function PatternsPage() {
  return (
    <>
      <PageHeader title="Mis patrones" />
      <EmptyState
        icon={<ChartLine />}
        title="Pronto vas a ver tus patrones acá"
        action={
          <Button asChild variant="soft">
            <Link href="/app/rueda/historial">Ver lo que registré</Link>
          </Button>
        }
      >
        Qué emociones aparecen más, a qué hora, qué días. Mientras más registres, más claro se ve.
      </EmptyState>
    </>
  );
}
