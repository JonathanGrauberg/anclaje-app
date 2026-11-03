import { AlertTriangle, CalendarDays, Download, Lock, MessageSquareText } from "lucide-react";
import { BackLink } from "@/components/back-link";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmotionChip } from "@/components/emotion-chip";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import type { ShareIntention } from "@/generated/prisma/client";
import { findLinkedPatient, sessionTopicsWhere, sharedEmotionWhere } from "@/lib/access";
import { audit } from "@/lib/audit";
import { INTENTION_LABELS, INTENTIONS } from "@/lib/constants";
import { decrypt, decryptOptional } from "@/lib/crypto";
import { dayKey, formatAppointmentShort, formatDate, formatRelative } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { buildEmotionIndex } from "@/lib/emotions/tree";
import { getNextAppointments } from "@/lib/queries/appointments";
import { getEmotionTree } from "@/lib/queries/common";
import { getTimeline, type TimelineKind } from "@/lib/queries/pro";
import { requireProfessional } from "@/lib/session";
import { extractPhone } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";
import { PatternsView, RangeFilter } from "@/components/charts/patterns-view";
import { ScoreChart } from "@/components/charts/pattern-charts";
import { getPatterns, getScoreSeries, parseRange } from "@/lib/queries/patterns";
import { AssessmentsPanel } from "./assessments-panel";
import { ClinicalRecordForm } from "./clinical-record-form";
import { CopingEditor } from "./coping-editor";
import { ManagedPatientActions } from "./managed-patient-actions";
import { NotesPanel } from "./notes-panel";
import { TasksPanel } from "./tasks-panel";
import { TopicsPanel } from "./topics-panel";
import { patientName } from "@/lib/patients";

export const metadata: Metadata = { title: "Ficha del paciente" };

const TABS = [
  { id: "compartido", label: "Lo compartido" },
  { id: "historia", label: "Historia clínica" },
  { id: "plan", label: "Plan de calma" },
  { id: "tareas", label: "Tareas" },
  { id: "evaluaciones", label: "Evaluaciones" },
  { id: "patrones", label: "Patrones" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const KINDS: { id: TimelineKind; label: string }[] = [
  { id: "diario", label: "Diario" },
  { id: "rueda", label: "Rueda" },
  { id: "autorregistro", label: "Autorregistros" },
];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function PatientRecordPage({
  params,
  searchParams,
}: PageProps<"/pro/pacientes/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const { user, professional } = await requireProfessional();
  const patient = await findLinkedPatient(professional.id, id);
  if (!patient) notFound();

  // Paciente sin la app: no hay nada compartido, solo la historia clínica (y los turnos).
  const withoutApp = !patient.userId;
  const tabs = withoutApp ? TABS.filter((t) => t.id === "historia") : TABS;
  const tabParam = one(sp.tab) === "notas" ? "historia" : one(sp.tab); // "notas" era el nombre viejo
  const tab: TabId = tabs.some((t) => t.id === tabParam)
    ? (tabParam as TabId)
    : withoutApp
      ? "historia"
      : "compartido";
  const kindParam = one(sp.tipo);
  const kind = KINDS.some((k) => k.id === kindParam) ? (kindParam as TimelineKind) : undefined;
  const intentionParam = one(sp.intencion);
  const intention = (INTENTIONS as readonly string[]).includes(intentionParam ?? "")
    ? (intentionParam as ShareIntention)
    : undefined;

  await audit({
    actorId: user.id,
    action: "view",
    entityType: "PatientRecord",
    entityId: patient.id,
    patientId: patient.id,
    meta: { tab },
  });

  const name = patientName(patient);
  const contact = decryptOptional(patient.contactEnc);
  const baseUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const link = patient.links[0];
  const base = `/pro/pacientes/${patient.id}`;
  const nextAppointment = (await getNextAppointments(professional.id, [patient.id])).get(
    patient.id,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <BackLink href="/pro" label="Pacientes" />
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{name}</h1>
        {withoutApp ? (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
              <Badge>Sin la app</Badge>
              Cargado el {formatDate(patient.createdAt)}
              {contact && <> · {contact}</>}
            </p>
            <ManagedPatientActions
              patientId={patient.id}
              name={name}
              contact={contact ?? ""}
              baseUrl={baseUrl}
              phone={extractPhone(contact)}
              professionalName={professional.displayName}
            />
          </div>
        ) : (
          <p className="text-muted-foreground mt-1 text-sm">
            Vinculado desde {formatDate(link.createdAt)} · consentimiento {link.consentVersion}{" "}
            aceptado el {formatDate(link.consentAcceptedAt ?? link.createdAt)}
          </p>
        )}
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <CalendarDays className="text-primary size-4" aria-hidden />
            {nextAppointment
              ? `Próximo turno: ${formatAppointmentShort(nextAppointment)}`
              : "Sin turno agendado"}
          </span>
          <Link
            href={`/pro/agenda?paciente=${patient.id}`}
            className="text-primary underline underline-offset-2"
          >
            {nextAppointment ? "Ver agenda" : "Agendar turno"}
          </Link>
        </p>
      </div>

      <nav
        aria-label="Secciones de la ficha"
        className="flex gap-1 overflow-x-auto overflow-y-hidden border-b"
      >
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.id === "compartido" ? base : `${base}?tab=${t.id}`}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              tab === t.id
                ? "border-primary text-primary font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "compartido" && (
        <SharedTab
          professionalId={professional.id}
          patientId={patient.id}
          base={base}
          kind={kind}
          intention={intention}
        />
      )}
      {tab === "historia" && <HistoryTab professionalId={professional.id} patientId={patient.id} />}
      {tab === "plan" && <PlanTab patientId={patient.id} />}
      {tab === "tareas" && <TasksTab professionalId={professional.id} patientId={patient.id} />}
      {tab === "patrones" && (
        <PatternsTab
          professionalId={professional.id}
          patientId={patient.id}
          days={parseRange(sp.dias)}
          base={`${base}?tab=patrones`}
        />
      )}
      {tab === "evaluaciones" && (
        <AssessmentsTab professionalId={professional.id} patientId={patient.id} />
      )}
    </div>
  );
}

async function SharedTab({
  professionalId,
  patientId,
  base,
  kind,
  intention,
}: {
  professionalId: string;
  patientId: string;
  base: string;
  kind?: TimelineKind;
  intention?: ShareIntention;
}) {
  const [items, tree, topics] = await Promise.all([
    getTimeline(professionalId, patientId, { kind, intention }),
    getEmotionTree(),
    prisma.sessionTopic.findMany({
      where: { ...sessionTopicsWhere(professionalId), patientId },
      orderBy: [{ discussedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      take: 30,
    }),
  ]);
  const index = buildEmotionIndex(tree);
  const filterHref = (next: { tipo?: string; intencion?: string }) => {
    const q = new URLSearchParams();
    const tipo = "tipo" in next ? next.tipo : kind;
    const intencion = "intencion" in next ? next.intencion : intention;
    if (tipo) q.set("tipo", tipo);
    if (intencion) q.set("intencion", intencion);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section aria-labelledby="timeline-title" className="flex flex-col gap-4">
        <h2 id="timeline-title" className="sr-only">
          Línea de tiempo
        </h2>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
          <FilterChip href={filterHref({ tipo: undefined })} active={!kind}>
            Todo
          </FilterChip>
          {KINDS.map((k) => (
            <FilterChip key={k.id} href={filterHref({ tipo: k.id })} active={kind === k.id}>
              {k.label}
            </FilterChip>
          ))}
          <span className="bg-border mx-1 w-px" aria-hidden />
          {INTENTIONS.map((i) => (
            <FilterChip
              key={i}
              href={filterHref({ intencion: intention === i ? undefined : i })}
              active={intention === i}
            >
              {INTENTION_LABELS[i]}
            </FilterChip>
          ))}
        </div>

        {items.length === 0 ? (
          <EmptyState title="No hay nada compartido con estos filtros">
            Solo ves lo que el paciente eligió compartir. Lo privado y los borradores no aparecen.
          </EmptyState>
        ) : (
          <ol className="flex flex-col gap-3">
            {items.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <Link
                  href={`${base}/${item.kind}/${item.id}`}
                  className={cn(
                    "bg-card hover:border-primary/40 flex flex-col gap-2 rounded-2xl border p-4 transition-colors",
                    item.high && "border-danger/40",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{KINDS.find((k) => k.id === item.kind)?.label}</Badge>
                    <time
                      className="text-muted-foreground text-sm"
                      dateTime={item.at.toISOString()}
                    >
                      {formatRelative(item.at)}
                    </time>
                    {item.intention && item.intention !== "JUST_FYI" && (
                      <Badge className="bg-primary-soft text-primary">
                        {INTENTION_LABELS[item.intention]}
                      </Badge>
                    )}
                    {item.high && (
                      <span className="text-danger flex items-center gap-1 text-xs font-medium">
                        <AlertTriangle className="size-3.5" aria-hidden /> Intensidad alta
                      </span>
                    )}
                    {item.feedbackCount > 0 && (
                      <span className="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
                        <MessageSquareText className="size-3.5" aria-hidden />
                        {item.feedbackCount === 1
                          ? "1 devolución"
                          : `${item.feedbackCount} devoluciones`}
                      </span>
                    )}
                  </div>
                  {item.kind !== "rueda" && <p className="font-medium">{item.title}</p>}
                  {item.emotions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.emotions.slice(0, 6).map((e) => (
                        <EmotionChip
                          key={e.nodeId}
                          index={index}
                          nodeId={e.nodeId}
                          intensity={e.intensity}
                        />
                      ))}
                    </div>
                  )}
                  {item.preview && (
                    <p className="text-muted-foreground line-clamp-3 text-sm">{item.preview}</p>
                  )}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <aside aria-labelledby="topics-title" className="flex flex-col gap-3">
        <h2 id="topics-title" className="text-lg font-semibold">
          Para la próxima sesión
        </h2>
        <TopicsPanel
          topics={topics.map((t) => ({
            id: t.id,
            text: decrypt(t.textEnc),
            createdAt: t.createdAt.toISOString(),
            discussed: t.discussedAt !== null,
          }))}
        />
      </aside>
    </div>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted",
      )}
    >
      {children}
    </Link>
  );
}

async function HistoryTab({
  professionalId,
  patientId,
}: {
  professionalId: string;
  patientId: string;
}) {
  // Solo la historia de esta profesional: nadie más (ni el paciente, ni el admin) la ve.
  const [record, notes] = await Promise.all([
    prisma.clinicalRecord.findUnique({
      where: { professionalId_patientId: { professionalId, patientId } },
    }),
    prisma.clinicalNote.findMany({
      where: { professionalId, patientId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const text = (v: string | null | undefined) => decryptOptional(v) ?? "";
  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Lock className="size-4" aria-hidden /> Solo vos ves la historia clínica. Se guarda
          cifrada.
        </p>
        <Button asChild variant="soft" size="sm">
          <a href={`/pro/pacientes/${patientId}/historia-clinica`} download>
            <Download aria-hidden /> Descargar PDF
          </a>
        </Button>
      </div>

      <section aria-labelledby="hc-ficha" className="flex flex-col gap-3">
        <h2 id="hc-ficha" className="text-lg font-semibold">
          Ficha
        </h2>
        <ClinicalRecordForm
          patientId={patientId}
          updatedAt={record?.updatedAt.toISOString() ?? null}
          initial={{
            treatmentStartedAt: record?.treatmentStartedAt ? dayKey(record.treatmentStartedAt) : "",
            reason: text(record?.reasonEnc),
            history: text(record?.historyEnc),
            medication: text(record?.medicationEnc),
            diagnosis: text(record?.diagnosisEnc),
            plan: text(record?.planEnc),
            emergencyContact: text(record?.emergencyContactEnc),
          }}
        />
      </section>

      <section aria-labelledby="hc-evolucion" className="flex flex-col gap-3">
        <div>
          <h2 id="hc-evolucion" className="text-lg font-semibold">
            Evolución
          </h2>
          <p className="text-muted-foreground text-sm">
            Notas de cada sesión, de la más nueva a la más vieja.
          </p>
        </div>
        <NotesPanel
          patientId={patientId}
          notes={notes.map((n) => ({
            id: n.id,
            body: decrypt(n.bodyEnc),
            createdAt: n.createdAt.toISOString(),
            updatedAt: n.updatedAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}

async function PlanTab({ patientId }: { patientId: string }) {
  const cards = await prisma.copingCard.findMany({
    where: { plan: { patientId } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return (
    <CopingEditor
      patientId={patientId}
      cards={cards.map((c) => ({
        id: c.id,
        type: c.type === "HELPLINE" ? "CONTACT" : c.type,
        technique: c.technique,
        title: c.title,
        body: c.body ?? "",
        phone: c.phone ?? "",
        whatsapp: c.whatsapp,
        author: c.author,
      }))}
    />
  );
}

async function TasksTab({
  professionalId,
  patientId,
}: {
  professionalId: string;
  patientId: string;
}) {
  const now = new Date();
  const tasks = await prisma.task.findMany({
    where: { professionalId, patientId },
    orderBy: [
      { completedAt: { sort: "asc", nulls: "first" } },
      { dueAt: "asc" },
      { createdAt: "desc" },
    ],
  });
  return (
    <TasksPanel
      patientId={patientId}
      tasks={tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        dueAt: t.dueAt?.toISOString() ?? null,
        completedAt: t.completedAt?.toISOString() ?? null,
        overdue: !t.completedAt && t.dueAt !== null && t.dueAt < now,
        comment: decryptOptional(t.patientCommentEnc),
      }))}
    />
  );
}

async function AssessmentsTab({
  professionalId,
  patientId,
}: {
  professionalId: string;
  patientId: string;
}) {
  // Respuestas visibles: solo las de evaluaciones que asignó esta profesional.
  const [available, assignments, responses, externals] = await Promise.all([
    prisma.assessment.findMany({
      where: {
        ownerId: professionalId,
        archivedAt: null,
        versions: { some: { status: "PUBLISHED" } },
      },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.assessmentAssignment.findMany({
      where: { professionalId, patientId, active: true },
      orderBy: { createdAt: "desc" },
      include: {
        version: { select: { version: true, assessment: { select: { title: true } } } },
        responses: { where: { status: "IN_PROGRESS" }, select: { id: true }, take: 1 },
      },
    }),
    prisma.assessmentResponse.findMany({
      where: { patientId, status: "COMPLETED", assignment: { professionalId } },
      orderBy: { completedAt: "desc" },
      take: 50,
      include: { version: { select: { assessment: { select: { title: true } } } } },
    }),
    prisma.externalResult.findMany({
      where: { professionalId, patientId },
      orderBy: { takenAt: "desc" },
    }),
  ]);
  return (
    <AssessmentsPanel
      patientId={patientId}
      available={available}
      assignments={assignments.map((a) => ({
        id: a.id,
        title: a.version.assessment.title,
        version: a.version.version,
        recurrenceDays: a.recurrenceDays,
        nextDueAt: a.nextDueAt?.toISOString() ?? null,
        inProgress: a.responses.length > 0,
      }))}
      responses={responses.map((r) => ({
        id: r.id,
        title: r.version.assessment.title,
        completedAt: r.completedAt!.toISOString(),
        totalScore: r.totalScore,
        interpretation: r.interpretation,
        critical: r.criticalQuestionIds.length > 0,
        reviewed: r.reviewedAt !== null,
      }))}
      externals={externals.map((x) => ({
        id: x.id,
        name: x.name,
        score: x.score,
        interpretation: x.interpretation,
        takenAt: x.takenAt.toISOString(),
        notes: decryptOptional(x.notesEnc),
        storageKey: x.storageKey,
      }))}
    />
  );
}

async function PatternsTab({
  professionalId,
  patientId,
  days,
  base,
}: {
  professionalId: string;
  patientId: string;
  days: number;
  base: string;
}) {
  // Solo lo que el paciente compartió (rueda) y las evaluaciones que asignó esta profesional.
  const [patterns, scores] = await Promise.all([
    getPatterns({ AND: [sharedEmotionWhere(professionalId), { patientId }] }, days),
    getScoreSeries(professionalId, patientId),
  ]);
  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="pt-wheel" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="pt-wheel" className="text-lg font-semibold">
              Rueda de las emociones
            </h2>
            <p className="text-muted-foreground text-sm">
              Solo los registros que compartió ({patterns.total} en el período).
            </p>
          </div>
          <RangeFilter base={base} days={days} />
        </div>
        {patterns.total === 0 ? (
          <EmptyState title="No compartió registros de la rueda en este período" />
        ) : (
          <PatternsView patterns={patterns} who="pro" />
        )}
      </section>
      <section aria-labelledby="pt-scores" className="flex flex-col gap-4">
        <h2 id="pt-scores" className="text-lg font-semibold">
          Evolución de evaluaciones
        </h2>
        {scores.length === 0 ? (
          <EmptyState title="Todavía no hay evaluaciones con puntaje" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {scores.map((s) => (
              <ScoreChart key={s.assessmentId} series={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
