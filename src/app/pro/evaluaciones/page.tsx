import { AlertTriangle, Archive, ClipboardList, FileWarning } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import type { Prisma } from "@/generated/prisma/client";
import { linkedPatientsWhere } from "@/lib/access";
import { createAssessment, duplicateAssessment } from "@/lib/actions/assessments";
import { audit } from "@/lib/audit";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireProfessional } from "@/lib/session";
import { cn } from "@/lib/utils";
import { ArchiveAssessmentButton, DeleteAssessmentButton, ImportJsonButton } from "./list-client";

export const metadata: Metadata = { title: "Evaluaciones" };

const STATUS = { DRAFT: "Borrador", PUBLISHED: "Publicada", ARCHIVED: "Archivada" } as const;
const PAGE_SIZE = 30;

const str = z.string().trim().max(200).optional().catch(undefined);
const paramsSchema = z.object({
  vista: z.enum(["respuestas"]).optional().catch(undefined),
  q: str,
  archivadas: z.literal("1").optional().catch(undefined),
  evaluacion: z.string().max(40).optional().catch(undefined),
  paciente: z.string().max(40).optional().catch(undefined),
  mostrar: z.enum(["criticos", "sin-revisar"]).optional().catch(undefined),
  pagina: z.coerce.number().int().min(1).max(1000).catch(1),
});
type Params = z.infer<typeof paramsSchema>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export default async function AssessmentsPage({ searchParams }: PageProps<"/pro/evaluaciones">) {
  const { user, professional } = await requireProfessional();
  const sp = await searchParams;
  const params = paramsSchema.parse(
    Object.fromEntries(Object.keys(paramsSchema.shape).map((k) => [k, first(sp[k])])),
  );
  const responsesView = params.vista === "respuestas";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Evaluaciones"
        description="Armá cuestionarios con puntaje, publicalos, asignalos y mirá las respuestas de tus pacientes."
        action={responsesView ? undefined : <ImportJsonButton />}
      />

      <nav aria-label="Secciones de evaluaciones" className="flex gap-1 border-b">
        {[
          { href: "/pro/evaluaciones", label: "Mis evaluaciones", active: !responsesView },
          {
            href: "/pro/evaluaciones?vista=respuestas",
            label: "Respuestas",
            active: responsesView,
          },
        ].map((t) => (
          <Link
            key={t.href}
            href={t.href}
            aria-current={t.active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              t.active
                ? "border-primary text-primary font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {responsesView ? (
        <ResponsesView professionalId={professional.id} userId={user.id} params={params} />
      ) : (
        <InstrumentsView professionalId={professional.id} params={params} />
      )}
    </div>
  );
}

// ── Mis evaluaciones (los instrumentos, no las respuestas) ──────────────────────

async function InstrumentsView({
  professionalId,
  params,
}: {
  professionalId: string;
  params: Params;
}) {
  const archived = params.archivadas === "1";
  const where: Prisma.AssessmentWhereInput = {
    ownerId: professionalId,
    archivedAt: archived ? { not: null } : null,
    ...(params.q && { title: { contains: params.q, mode: "insensitive" } }),
  };
  const [own, archivedCount, templates] = await Promise.all([
    prisma.assessment.findMany({
      where,
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
    prisma.assessment.count({ where: { ownerId: professionalId, archivedAt: { not: null } } }),
    archived
      ? Promise.resolve([])
      : prisma.assessment.findMany({
          where: { ownerId: null, isTemplate: true },
          orderBy: { title: "asc" },
          include: { versions: { select: { _count: { select: { questions: true } } }, take: 1 } },
        }),
  ]);

  return (
    <>
      {!archived && (
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
      )}

      <section aria-labelledby="own-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="own-title" className="text-lg font-semibold">
            {archived ? "Archivadas" : "Tus evaluaciones"}
          </h2>
          <form method="get" className="flex flex-wrap items-center gap-2">
            {archived && <input type="hidden" name="archivadas" value="1" />}
            <input
              type="search"
              name="q"
              defaultValue={params.q}
              placeholder="Buscar por título"
              aria-label="Buscar evaluaciones por título"
              className="border-input bg-card h-10 min-w-52 rounded-xl border px-3"
            />
            <button className="bg-primary-soft text-primary h-10 rounded-full px-4 text-sm font-medium">
              Buscar
            </button>
          </form>
        </div>
        <p className="text-sm">
          {archived ? (
            <Link href="/pro/evaluaciones" className="text-primary hover:underline">
              Volver a las activas
            </Link>
          ) : (
            archivedCount > 0 && (
              <Link
                href="/pro/evaluaciones?archivadas=1"
                className="text-muted-foreground inline-flex items-center gap-1.5 hover:underline"
              >
                <Archive className="size-4" aria-hidden /> Ver archivadas ({archivedCount})
              </Link>
            )
          )}
        </p>

        {own.length === 0 ? (
          params.q ? (
            <EmptyState title="No hay evaluaciones con ese título" />
          ) : archived ? (
            <EmptyState title="No tenés evaluaciones archivadas" />
          ) : (
            <EmptyState icon={<ClipboardList />} title="Todavía no armaste ninguna">
              Creá una de cero, usá una plantilla o importá un JSON.
            </EmptyState>
          )
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
                    {archived ? (
                      <Badge>Archivada el {formatDate(a.archivedAt!)}</Badge>
                    ) : (
                      latest && (
                        <Badge
                          className={
                            latest.status === "PUBLISHED"
                              ? "bg-primary-soft text-primary"
                              : undefined
                          }
                        >
                          {STATUS[latest.status]} · v{latest.version}
                        </Badge>
                      )
                    )}
                    {!archived && published && latest?.status === "DRAFT" && (
                      <Badge>v{published.version} publicada</Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Actualizada el {formatDate(a.updatedAt)} ·{" "}
                    {responses > 0 ? (
                      <Link
                        href={`/pro/evaluaciones?vista=respuestas&evaluacion=${a.id}`}
                        className="text-primary underline underline-offset-2"
                      >
                        {responses} {responses === 1 ? "respuesta" : "respuestas"}
                      </Link>
                    ) : (
                      "0 respuestas"
                    )}
                  </p>
                  <div className="mt-auto -ml-2 flex flex-wrap gap-1">
                    {!archived && (
                      <Button asChild variant="soft" size="sm">
                        <Link href={`/pro/evaluaciones/${a.id}`}>Abrir</Link>
                      </Button>
                    )}
                    {responses === 0 ? (
                      <DeleteAssessmentButton id={a.id} title={a.title} />
                    ) : (
                      <ArchiveAssessmentButton id={a.id} title={a.title} archived={archived} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {!archived && (
        <section aria-labelledby="tpl-title" className="flex flex-col gap-3">
          <h2 id="tpl-title" className="text-lg font-semibold">
            Plantillas
          </h2>
          <p className="text-muted-foreground flex items-start gap-2 text-sm">
            <FileWarning className="mt-0.5 size-4 shrink-0" aria-hidden />
            Traen la estructura y el puntaje, pero no la redacción de los ítems: copiá el texto de
            la versión validada en español que tengas autorizada y revisá la licencia de cada
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
      )}
    </>
  );
}

// ── Respuestas de todos los pacientes, con filtros ──────────────────────────────

async function ResponsesView({
  professionalId,
  userId,
  params,
}: {
  professionalId: string;
  userId: string;
  params: Params;
}) {
  // Solo respuestas de evaluaciones que asignó esta profesional, de pacientes con vínculo activo.
  const where: Prisma.AssessmentResponseWhereInput = {
    status: "COMPLETED",
    assignment: { professionalId },
    patient: linkedPatientsWhere(professionalId),
    ...(params.evaluacion && { version: { assessmentId: params.evaluacion } }),
    ...(params.paciente && { patientId: params.paciente }),
    ...(params.mostrar === "criticos" && { criticalQuestionIds: { isEmpty: false } }),
    ...(params.mostrar === "sin-revisar" && { reviewedAt: null }),
  };
  const [total, rows, assessments, patients] = await Promise.all([
    prisma.assessmentResponse.count({ where }),
    prisma.assessmentResponse.findMany({
      where,
      orderBy: { completedAt: "desc" },
      skip: (params.pagina - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        completedAt: true,
        totalScore: true,
        interpretation: true,
        criticalQuestionIds: true,
        reviewedAt: true,
        patient: { select: { id: true, displayName: true, user: { select: { name: true } } } },
        version: { select: { version: true, assessment: { select: { title: true } } } },
      },
    }),
    prisma.assessment.findMany({
      where: {
        ownerId: professionalId,
        versions: { some: { responses: { some: { status: "COMPLETED" } } } },
      },
      orderBy: { title: "asc" },
      select: { id: true, title: true, archivedAt: true },
    }),
    prisma.patientProfile.findMany({
      where: linkedPatientsWhere(professionalId),
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, user: { select: { name: true } } },
    }),
  ]);
  await audit({
    actorId: userId,
    action: "view",
    entityType: "AssessmentResponseList",
    patientId: params.paciente ?? null,
    meta: {
      evaluacion: params.evaluacion ?? null,
      mostrar: params.mostrar ?? null,
      pagina: params.pagina,
    },
  });

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = !!(params.evaluacion || params.paciente || params.mostrar);
  const href = (page: number) => {
    const q = new URLSearchParams({ vista: "respuestas" });
    if (params.evaluacion) q.set("evaluacion", params.evaluacion);
    if (params.paciente) q.set("paciente", params.paciente);
    if (params.mostrar) q.set("mostrar", params.mostrar);
    if (page > 1) q.set("pagina", String(page));
    return `/pro/evaluaciones?${q}`;
  };
  const selectClass = "border-input bg-card h-10 rounded-xl border px-3 text-sm";

  return (
    <section aria-labelledby="resp-title" className="flex flex-col gap-4">
      <h2 id="resp-title" className="sr-only">
        Respuestas
      </h2>
      <form method="get" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="vista" value="respuestas" />
        <select
          name="evaluacion"
          defaultValue={params.evaluacion ?? ""}
          aria-label="Evaluación"
          className={selectClass}
        >
          <option value="">Todas las evaluaciones</option>
          {assessments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title}
              {a.archivedAt ? " (archivada)" : ""}
            </option>
          ))}
        </select>
        <select
          name="paciente"
          defaultValue={params.paciente ?? ""}
          aria-label="Paciente"
          className={selectClass}
        >
          <option value="">Todos los pacientes</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName ?? p.user.name}
            </option>
          ))}
        </select>
        <select
          name="mostrar"
          defaultValue={params.mostrar ?? ""}
          aria-label="Mostrar"
          className={selectClass}
        >
          <option value="">Todas</option>
          <option value="sin-revisar">Sin revisar</option>
          <option value="criticos">Con ítem crítico</option>
        </select>
        <button className="bg-primary-soft text-primary h-10 rounded-full px-4 text-sm font-medium">
          Filtrar
        </button>
        {filtered && (
          <Link
            href="/pro/evaluaciones?vista=respuestas"
            className="text-muted-foreground flex h-10 items-center px-2 text-sm hover:underline"
          >
            Limpiar filtros
          </Link>
        )}
      </form>

      {rows.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title="No hay respuestas">
          {filtered
            ? "Probá con otros filtros."
            : "Cuando un paciente responda una evaluación que le asignaste, la vas a ver acá."}
        </EmptyState>
      ) : (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Respuestas de evaluaciones, página {params.pagina} de {pages}
              </caption>
              <thead className="text-muted-foreground text-left">
                <tr className="border-b">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Paciente
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Evaluación
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Puntaje
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Resultado
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/50 border-b last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link
                        href={`/pro/pacientes/${r.patient.id}/evaluacion/${r.id}?desde=respuestas`}
                        className="text-primary font-medium hover:underline"
                      >
                        {formatDate(r.completedAt!)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{r.patient.displayName ?? r.patient.user.name}</td>
                    <td className="px-4 py-3">
                      {r.version.assessment.title}{" "}
                      <span className="text-muted-foreground text-xs">v{r.version.version}</span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.totalScore ?? "—"}</td>
                    <td className="px-4 py-3">{r.interpretation ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.criticalQuestionIds.length > 0 && (
                          <span className="text-danger flex items-center gap-1 font-medium whitespace-nowrap">
                            <AlertTriangle className="size-4" aria-hidden /> Ítem crítico
                          </span>
                        )}
                        <Badge
                          className={r.reviewedAt ? undefined : "bg-primary-soft text-primary"}
                        >
                          {r.reviewedAt ? "Revisada" : "Sin revisar"}
                        </Badge>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            {total} {total === 1 ? "respuesta" : "respuestas"}
            {pages > 1 && ` · página ${params.pagina} de ${pages}`}
          </span>
          <div className="flex gap-2">
            {params.pagina > 1 && (
              <Button asChild variant="outline" size="sm">
                <Link href={href(params.pagina - 1)}>Anterior</Link>
              </Button>
            )}
            {params.pagina < pages && (
              <Button asChild variant="outline" size="sm">
                <Link href={href(params.pagina + 1)}>Siguiente</Link>
              </Button>
            )}
          </div>
        </nav>
      )}
    </section>
  );
}
