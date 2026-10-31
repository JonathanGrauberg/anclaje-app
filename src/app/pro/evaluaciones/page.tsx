import { ClipboardList, FileWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { createAssessment, duplicateAssessment } from "@/lib/actions/assessments";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireProfessional } from "@/lib/session";
import { DeleteAssessmentButton, ImportJsonButton } from "./list-client";

export const metadata: Metadata = { title: "Evaluaciones" };

const STATUS = { DRAFT: "Borrador", PUBLISHED: "Publicada", ARCHIVED: "Archivada" } as const;

export default async function AssessmentsPage() {
  const { professional } = await requireProfessional();
  const [own, templates] = await Promise.all([
    prisma.assessment.findMany({
      where: { ownerId: professional.id },
      orderBy: { updatedAt: "desc" },
      include: {
        versions: {
          orderBy: { version: "desc" },
          select: {
            version: true,
            status: true,
            _count: { select: { assignments: true, responses: true } },
          },
        },
      },
    }),
    prisma.assessment.findMany({
      where: { ownerId: null, isTemplate: true },
      orderBy: { title: "asc" },
      include: { versions: { select: { _count: { select: { questions: true } } }, take: 1 } },
    }),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Evaluaciones"
        description="Armá cuestionarios con puntaje, publicalos y asignalos a tus pacientes."
        action={<ImportJsonButton />}
      />

      <form
        action={createAssessment}
        className="bg-card flex flex-wrap items-center gap-2 rounded-2xl border p-4"
      >
        <label htmlFor="new-title" className="sr-only">
          Título de la evaluación nueva
        </label>
        <Input
          id="new-title"
          name="title"
          placeholder="Título de la evaluación nueva"
          maxLength={200}
          className="h-11 max-w-md flex-1"
        />
        <Button>Crear evaluación</Button>
      </form>

      <section aria-labelledby="own-title" className="flex flex-col gap-3">
        <h2 id="own-title" className="text-lg font-semibold">
          Tus evaluaciones
        </h2>
        {own.length === 0 ? (
          <EmptyState icon={<ClipboardList />} title="Todavía no armaste ninguna">
            Creá una de cero, usá una plantilla o importá un JSON.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {own.map((a) => {
              const latest = a.versions[0];
              const published = a.versions.find((v) => v.status === "PUBLISHED");
              const responses = a.versions.reduce((n, v) => n + v._count.responses, 0);
              return (
                <li key={a.id} className="bg-card flex flex-col gap-2 rounded-2xl border p-4">
                  <Link href={`/pro/evaluaciones/${a.id}`} className="font-medium hover:underline">
                    {a.title}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    {latest && (
                      <Badge
                        className={
                          latest.status === "PUBLISHED" ? "bg-primary-soft text-primary" : undefined
                        }
                      >
                        {STATUS[latest.status]} · v{latest.version}
                      </Badge>
                    )}
                    {published && latest?.status === "DRAFT" && (
                      <Badge>v{published.version} publicada</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Actualizada el {formatDate(a.updatedAt)} · {responses}{" "}
                    {responses === 1 ? "respuesta" : "respuestas"}
                  </p>
                  <div className="mt-auto -ml-2 flex gap-1">
                    <Button asChild variant="soft" size="sm">
                      <Link href={`/pro/evaluaciones/${a.id}`}>Abrir</Link>
                    </Button>
                    {responses === 0 && <DeleteAssessmentButton id={a.id} title={a.title} />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="tpl-title" className="flex flex-col gap-3">
        <h2 id="tpl-title" className="text-lg font-semibold">
          Plantillas
        </h2>
        <p className="text-muted-foreground flex items-start gap-2 text-sm">
          <FileWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
          Traen la estructura y el puntaje, pero no la redacción de los ítems: copiá el texto de la
          versión validada en español que tengas autorizada y revisá la licencia de cada
          instrumento.
        </p>
        <ul className="grid gap-3 md:grid-cols-2">
          {templates.map((t) => (
            <li key={t.id} className="bg-card flex flex-col gap-2 rounded-2xl border p-4">
              <p className="font-medium">{t.title}</p>
              {t.description && <p className="text-muted-foreground text-sm">{t.description}</p>}
              {t.sourceNote && <p className="text-muted-foreground text-xs">{t.sourceNote}</p>}
              <form action={duplicateAssessment.bind(null, t.id)} className="-ml-2">
                <Button variant="soft" size="sm">
                  Usar plantilla
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
