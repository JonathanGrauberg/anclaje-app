import { BookOpen, ClipboardList, ListChecks } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { startAssessment } from "@/lib/actions/responses";
import { decryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { dueAssignmentsWhere } from "@/lib/queries/patient";
import { requirePatient } from "@/lib/session";
import { TaskList } from "./task-list";

export const metadata: Metadata = { title: "Mis tareas y evaluaciones" };

const KIND_LABEL = { PDF: "PDF", IMAGE: "Imagen", LINK: "Link", TEXT: "Para leer" } as const;

export default async function TasksPage() {
  const { patient } = await requirePatient();
  const [tasks, assignments, materials] = await Promise.all([
    prisma.task.findMany({
      where: { patientId: patient.id },
      orderBy: [
        { completedAt: { sort: "asc", nulls: "first" } },
        { dueAt: "asc" },
        { createdAt: "desc" },
      ],
      include: { professional: { select: { displayName: true } } },
      take: 100,
    }),
    prisma.assessmentAssignment.findMany({
      where: dueAssignmentsWhere(patient.id),
      orderBy: { createdAt: "asc" },
      include: {
        version: { select: { assessment: { select: { title: true } } } },
        professional: { select: { displayName: true } },
        responses: { where: { status: "IN_PROGRESS" }, select: { id: true }, take: 1 },
      },
    }),
    prisma.resourceAssignment.findMany({
      where: { patientId: patient.id },
      orderBy: { assignedAt: "desc" },
      include: { resource: { select: { id: true, title: true, kind: true, description: true } } },
      take: 50,
    }),
  ]);
  const empty = tasks.length === 0 && assignments.length === 0 && materials.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        back={{ href: "/app", label: "Inicio" }}
        title="Mis tareas y evaluaciones"
        description="Lo que te propuso tu psicóloga. Sin apuro y sin rachas: a tu ritmo."
      />
      {empty && (
        <EmptyState icon={<ListChecks />} title="No tenés nada pendiente">
          Cuando tu psicóloga te proponga una tarea, un cuestionario o algo para leer, lo vas a ver
          acá.
        </EmptyState>
      )}

      {assignments.length > 0 && (
        <section aria-labelledby="ev-title" className="flex flex-col gap-3">
          <h2 id="ev-title" className="flex items-center gap-2 text-lg font-semibold">
            <ClipboardList className="text-primary size-5" aria-hidden /> Cuestionarios
          </h2>
          <ul className="flex flex-col gap-2">
            {assignments.map((a) => (
              <li
                key={a.id}
                className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-3xl border p-4"
              >
                <div>
                  <p className="text-lg font-medium">{a.version.assessment.title}</p>
                  <p className="text-muted-foreground text-sm">
                    De {a.professional.displayName}
                    {a.responses.length > 0 && " · lo empezaste, seguí donde lo dejaste"}
                  </p>
                </div>
                <form action={startAssessment.bind(null, a.id)}>
                  <Button>{a.responses.length ? "Seguir" : "Empezar"}</Button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      {tasks.length > 0 && (
        <section aria-labelledby="tk-title" className="flex flex-col gap-3">
          <h2 id="tk-title" className="flex items-center gap-2 text-lg font-semibold">
            <ListChecks className="text-primary size-5" aria-hidden /> Tareas
          </h2>
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
        </section>
      )}

      {materials.length > 0 && (
        <section aria-labelledby="mt-title" className="flex flex-col gap-3">
          <h2 id="mt-title" className="flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="text-primary size-5" aria-hidden /> Para leer o mirar
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {materials.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/app/material/${m.resource.id}`}
                  className="bg-card hover:bg-muted flex h-full flex-col gap-1 rounded-3xl border p-4"
                >
                  <span className="text-muted-foreground text-xs">
                    {KIND_LABEL[m.resource.kind]}
                    {!m.viewedAt && <span className="text-primary ml-2 font-medium">Nuevo</span>}
                  </span>
                  <span className="font-medium">{m.resource.title}</span>
                  {m.resource.description && (
                    <span className="text-muted-foreground line-clamp-2 text-sm">
                      {m.resource.description}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
