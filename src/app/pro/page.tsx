import {
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  MessageCircleHeart,
  MessageSquareText,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArmchairScene } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatAppointmentShort, formatDate, formatRelative } from "@/lib/dates";
import { getNextAppointments } from "@/lib/queries/appointments";
import { getPatientsWithAttention, type PatientAttention } from "@/lib/queries/pro";
import { requireProfessional } from "@/lib/session";
import { getUiTheme } from "@/lib/ui-theme";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pacientes" };

export default async function ProfessionalHome({ searchParams }: PageProps<"/pro">) {
  const { professional } = await requireProfessional();
  const { baja } = await searchParams;
  const patients = await getPatientsWithAttention(professional.id);
  const nextAppointments = await getNextAppointments(
    professional.id,
    patients.map((p) => p.id),
  );
  const needAttention = patients.filter(
    (p) =>
      p.criticalAssessmentAt ||
      p.highIntensityAt ||
      p.pendingFeedback ||
      p.overdueTasks ||
      p.unreviewedAssessments,
  );

  const isNew = (await getUiTheme()) === "nuevo";
  const nextOverall = [...nextAppointments.entries()].sort((a, b) => +a[1] - +b[1])[0];
  const nextPatient = nextOverall && patients.find((p) => p.id === nextOverall[0]);

  return (
    <>
      {isNew ? (
        <ProHero
          name={professional.displayName}
          patients={patients.length}
          needAttention={needAttention.length}
          next={nextOverall && nextPatient ? { at: nextOverall[1], name: nextPatient.name } : null}
        />
      ) : (
        <PageHeader
          title={`Hola, ${professional.displayName}`}
          description="Lo que compartieron tus pacientes y lo que está esperando una respuesta."
          action={
            <Button asChild variant="soft">
              <Link href="/pro/invitaciones">Agregar paciente</Link>
            </Button>
          }
        />
      )}

      {(baja === "archivado" || baja === "borrado") && (
        <p role="status" className="bg-primary-soft text-primary mb-4 rounded-xl px-4 py-3 text-sm">
          {baja === "archivado"
            ? "Listo, quedó dado de baja. Su historia clínica se guarda: lo podés reactivar desde «Agregar paciente»."
            : "Listo, el paciente se borró."}
        </p>
      )}

      {patients.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Todavía no tenés pacientes"
          action={
            <Button asChild>
              <Link href="/pro/invitaciones">Agregar paciente</Link>
            </Button>
          }
        >
          Invitalo a la app, o cargalo sin la app para usar la agenda y la historia clínica.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="attention-title">
            <h2 id="attention-title" className="mb-3 text-lg font-semibold">
              Pide atención
            </h2>
            {needAttention.length === 0 ? (
              <p className="text-muted-foreground bg-card nuevo:bg-block-sage-soft nuevo:text-block-sage-foreground nuevo:border-0 nuevo:rounded-3xl rounded-2xl border p-4">
                Nada pendiente por ahora: no hay pedidos de devolución sin responder ni tareas
                vencidas.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {needAttention.map((p) => (
                  <li key={p.id}>
                    <AttentionRow patient={p} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="patients-title">
            <h2 id="patients-title" className="mb-3 text-lg font-semibold">
              Tus pacientes ({patients.length})
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {patients.map((p) => (
                <li key={p.id}>
                  <PatientCard patient={p} nextAppointment={nextAppointments.get(p.id)} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

function ProHero({
  name,
  patients,
  needAttention,
  next,
}: {
  name: string;
  patients: number;
  needAttention: number;
  next: { at: Date; name: string } | null;
}) {
  return (
    <section className="bg-block-sun text-block-sun-foreground relative isolate mb-8 overflow-hidden rounded-[2rem] p-6 pb-0 sm:p-8 sm:pb-0">
      <div
        className="bg-block-sun-deep absolute -top-12 -right-12 -z-10 size-52 rounded-full"
        aria-hidden
      />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-4 pb-6 sm:pb-8">
          <h1 className="text-[2rem] leading-[1.05] font-bold tracking-tight sm:text-4xl">
            Hola, {name}
          </h1>
          <p className="max-w-md text-lg leading-snug font-medium">
            {next ? (
              <>
                Tu próximo turno es con {next.name}: {formatAppointmentShort(next.at)}.
              </>
            ) : (
              "Lo que compartieron tus pacientes y lo que está esperando una respuesta."
            )}
          </p>
          <dl className="flex flex-wrap gap-2 text-sm">
            <div className="rounded-full bg-white/40 px-4 py-2">
              <dt className="sr-only">Pacientes</dt>
              <dd>
                <strong className="tabular-nums">{patients}</strong>{" "}
                {patients === 1 ? "paciente" : "pacientes"}
              </dd>
            </div>
            <div className="rounded-full bg-white/40 px-4 py-2">
              <dt className="sr-only">Piden atención</dt>
              <dd>
                <strong className="tabular-nums">{needAttention}</strong>{" "}
                {needAttention === 1 ? "pide atención" : "piden atención"}
              </dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/pro/invitaciones"
              className="bg-block-night rounded-full px-5 py-3 text-sm font-semibold text-white transition-transform active:scale-[0.97]"
            >
              Agregar paciente
            </Link>
            <Link
              href="/pro/agenda"
              className="rounded-full bg-white/50 px-5 py-3 text-sm font-semibold transition-colors hover:bg-white/70"
            >
              Ver la agenda
            </Link>
          </div>
        </div>
        <ArmchairScene className="-mr-6 w-56 shrink-0 self-end sm:w-72" />
      </div>
    </section>
  );
}

function AttentionRow({ patient: p }: { patient: PatientAttention }) {
  return (
    <Link
      href={`/pro/pacientes/${p.id}`}
      className="bg-card hover:border-primary/40 nuevo:border-transparent nuevo:shadow-[0_10px_30px_-14px_rgba(30,51,49,0.28)] nuevo:rounded-3xl flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border p-4 transition-colors"
    >
      <span className="font-semibold">{p.name}</span>
      {p.criticalAssessmentAt && (
        <span className="text-danger flex items-center gap-1.5 text-sm font-medium">
          <AlertTriangle className="size-4" aria-hidden />
          Ítem crítico en una evaluación ({formatRelative(p.criticalAssessmentAt)})
        </span>
      )}
      {p.highIntensityAt && (
        <span className="text-danger flex items-center gap-1.5 text-sm font-medium">
          <AlertTriangle className="size-4" aria-hidden />
          Intensidad muy alta {formatRelative(p.highIntensityAt)}
        </span>
      )}
      {p.pendingFeedback > 0 && (
        <span className="flex items-center gap-1.5 text-sm">
          <MessageSquareText className="text-primary size-4" aria-hidden />
          {p.pendingFeedback} {p.pendingFeedback === 1 ? "pide" : "piden"} devolución
        </span>
      )}
      {p.unreviewedAssessments > 0 && (
        <span className="flex items-center gap-1.5 text-sm">
          <ClipboardCheck className="text-primary size-4" aria-hidden />
          {p.unreviewedAssessments}{" "}
          {p.unreviewedAssessments === 1 ? "evaluación sin revisar" : "evaluaciones sin revisar"}
        </span>
      )}
      {p.overdueTasks > 0 && (
        <span className="flex items-center gap-1.5 text-sm">
          <CalendarClock className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          {p.overdueTasks} {p.overdueTasks === 1 ? "tarea vencida" : "tareas vencidas"}
        </span>
      )}
    </Link>
  );
}

function PatientCard({
  patient: p,
  nextAppointment,
}: {
  patient: PatientAttention;
  nextAppointment?: Date;
}) {
  return (
    <Link href={`/pro/pacientes/${p.id}`} className="block h-full">
      <Card
        className={cn(
          "hover:border-primary/40 h-full transition-colors",
          (p.highIntensityAt || p.criticalAssessmentAt) &&
            "border-danger/40 nuevo:border-danger/50",
        )}
      >
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
              {p.name}
              {p.withoutApp && <Badge>Sin la app</Badge>}
            </p>
            <p className="text-muted-foreground text-sm">
              {p.withoutApp
                ? "Agenda e historia clínica"
                : p.lastSharedAt
                  ? `Compartió algo ${formatRelative(p.lastSharedAt)}`
                  : p.linkedAt
                    ? `Vinculado desde ${formatDate(p.linkedAt)}`
                    : "Sin actividad compartida"}
            </p>
            {nextAppointment && (
              <p className="text-primary mt-1 flex items-center gap-1.5 text-sm font-medium">
                <CalendarDays className="size-4" aria-hidden />
                Próximo turno: {formatAppointmentShort(nextAppointment)}
              </p>
            )}
          </div>
          {!p.withoutApp && (
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <Stat label="Devoluciones" value={p.pendingFeedback} />
              <Stat label="Tareas vencidas" value={p.overdueTasks} />
              <Stat
                label="Temas"
                value={p.openTopics}
                icon={<MessageCircleHeart className="size-3.5" aria-hidden />}
              />
            </dl>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="bg-muted nuevo:bg-block-sage-soft rounded-xl p-2">
      <dt className="text-muted-foreground flex items-center gap-1 text-xs">
        {icon}
        {label}
      </dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
