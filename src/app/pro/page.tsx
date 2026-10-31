import {
  AlertTriangle,
  CalendarClock,
  MessageCircleHeart,
  MessageSquareText,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDate, formatRelative } from "@/lib/dates";
import { getPatientsWithAttention, type PatientAttention } from "@/lib/queries/pro";
import { requireProfessional } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pacientes" };

export default async function ProfessionalHome() {
  const { professional } = await requireProfessional();
  const patients = await getPatientsWithAttention(professional.id);
  const needAttention = patients.filter(
    (p) => p.highIntensityAt || p.pendingFeedback || p.overdueTasks,
  );

  return (
    <>
      <PageHeader
        title={`Hola, ${professional.displayName}`}
        description="Lo que compartieron tus pacientes y lo que está esperando una respuesta."
        action={
          <Button asChild variant="soft">
            <Link href="/pro/invitaciones">Invitar paciente</Link>
          </Button>
        }
      />

      {patients.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="Todavía no tenés pacientes vinculados"
          action={
            <Button asChild>
              <Link href="/pro/invitaciones">Generar un código de invitación</Link>
            </Button>
          }
        >
          Generá un código y pasáselo a tu paciente. Cuando lo acepte, lo vas a ver acá.
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="attention-title">
            <h2 id="attention-title" className="mb-3 text-lg font-semibold">
              Pide atención
            </h2>
            {needAttention.length === 0 ? (
              <p className="text-muted-foreground bg-card rounded-2xl border p-4">
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
                  <PatientCard patient={p} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}

function AttentionRow({ patient: p }: { patient: PatientAttention }) {
  return (
    <Link
      href={`/pro/pacientes/${p.id}`}
      className="bg-card hover:border-primary/40 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border p-4 transition-colors"
    >
      <span className="font-semibold">{p.name}</span>
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
      {p.overdueTasks > 0 && (
        <span className="flex items-center gap-1.5 text-sm">
          <CalendarClock className="size-4 text-amber-600 dark:text-amber-400" aria-hidden />
          {p.overdueTasks} {p.overdueTasks === 1 ? "tarea vencida" : "tareas vencidas"}
        </span>
      )}
    </Link>
  );
}

function PatientCard({ patient: p }: { patient: PatientAttention }) {
  return (
    <Link href={`/pro/pacientes/${p.id}`} className="block h-full">
      <Card
        className={cn(
          "hover:border-primary/40 h-full transition-colors",
          p.highIntensityAt && "border-danger/40",
        )}
      >
        <CardContent className="flex flex-col gap-3">
          <div>
            <p className="text-lg font-semibold">{p.name}</p>
            <p className="text-muted-foreground text-sm">
              {p.lastSharedAt
                ? `Compartió algo ${formatRelative(p.lastSharedAt)}`
                : p.linkedAt
                  ? `Vinculado desde ${formatDate(p.linkedAt)}`
                  : "Sin actividad compartida"}
            </p>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <Stat label="Devoluciones" value={p.pendingFeedback} />
            <Stat label="Tareas vencidas" value={p.overdueTasks} />
            <Stat
              label="Temas"
              value={p.openTopics}
              icon={<MessageCircleHeart className="size-3.5" aria-hidden />}
            />
          </dl>
        </CardContent>
      </Card>
    </Link>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <div className="bg-muted rounded-xl p-2">
      <dt className="text-muted-foreground flex items-center gap-1 text-xs">
        {icon}
        {label}
      </dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
