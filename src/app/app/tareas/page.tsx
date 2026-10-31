import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { decryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/session";
import { TaskList } from "./task-list";

export const metadata: Metadata = { title: "Mis tareas y evaluaciones" };

// Las evaluaciones se suman en la fase 3.
export default async function TasksPage() {
  const { patient } = await requirePatient();
  const tasks = await prisma.task.findMany({
    where: { patientId: patient.id },
    orderBy: [
      { completedAt: { sort: "asc", nulls: "first" } },
      { dueAt: "asc" },
      { createdAt: "desc" },
    ],
    include: { professional: { select: { displayName: true } } },
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Mis tareas y evaluaciones"
        description="Lo que te propuso tu psicóloga. Sin apuro y sin rachas: a tu ritmo."
      />
      {tasks.length === 0 ? (
        <EmptyState icon={<ListChecks />} title="No tenés nada pendiente">
          Cuando tu psicóloga te proponga una tarea o un cuestionario, lo vas a ver acá.
        </EmptyState>
      ) : (
        <TaskList
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
            from: t.professional.displayName,
            dueAt: t.dueAt?.toISOString() ?? null,
            done: t.completedAt !== null,
            comment: decryptOptional(t.patientCommentEnc) ?? "",
          }))}
        />
      )}
    </>
  );
}
