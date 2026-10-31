import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui/misc";

export const metadata: Metadata = { title: "Mis tareas y evaluaciones" };

// Las tareas y evaluaciones las asigna la profesional (fases 2 y 3).
export default function TasksPage() {
  return (
    <>
      <PageHeader title="Mis tareas y evaluaciones" />
      <EmptyState icon={<ListChecks />} title="No tenés nada pendiente">
        Cuando tu psicóloga te proponga una tarea o un cuestionario, lo vas a ver acá. Sin apuro y
        sin rachas: a tu ritmo.
      </EmptyState>
    </>
  );
}
