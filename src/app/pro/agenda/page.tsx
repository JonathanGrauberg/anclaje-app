import { CalendarDays, UserPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { linkedPatientsWhere } from "@/lib/access";
import { dayKey, formatLongDay } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { getAgenda, type AgendaItem } from "@/lib/queries/appointments";
import { requireProfessional } from "@/lib/session";
import { AgendaRow, NewAppointmentForm } from "./agenda-client";

export const metadata: Metadata = { title: "Agenda" };

const DAY = 86_400_000;

/** Comienzo de hoy en Buenos Aires y las claves de hoy y mañana. */
function todayInfo() {
  const now = new Date();
  return {
    from: new Date(`${dayKey(now)}T00:00:00-03:00`),
    today: dayKey(now),
    tomorrow: dayKey(new Date(now.getTime() + DAY)),
  };
}

export default async function AgendaPage({ searchParams }: PageProps<"/pro/agenda">) {
  const { professional } = await requireProfessional();
  const sp = await searchParams;
  const weeks = sp.semanas === "12" ? 12 : 4;
  const preselected = typeof sp.paciente === "string" ? sp.paciente : undefined;

  // Desde el comienzo de hoy (hora de Buenos Aires) para que se vean los turnos de la mañana.
  const { from, today, tomorrow } = todayInfo();
  const [patients, items] = await Promise.all([
    prisma.patientProfile.findMany({
      where: linkedPatientsWhere(professional.id),
      orderBy: { displayName: "asc" },
      select: { id: true, displayName: true, user: { select: { name: true } } },
    }),
    getAgenda(professional.id, from, new Date(from.getTime() + weeks * 7 * DAY)),
  ]);

  const days = new Map<string, AgendaItem[]>();
  for (const a of items) {
    const k = dayKey(a.startsAt);
    days.set(k, [...(days.get(k) ?? []), a]);
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Agenda"
        description="Tus turnos de las próximas semanas. Tus pacientes los ven en la app."
      />

      <section aria-labelledby="new-title" className="flex max-w-3xl flex-col gap-3">
        <h2 id="new-title" className="text-lg font-semibold">
          Nuevo turno
        </h2>
        {patients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-start gap-3">
              <p className="font-medium">Todavía no tenés pacientes vinculados</p>
              <p className="text-muted-foreground text-sm">
                Los turnos se dan a pacientes que ya usan la app con vos. Primero invitalos: les
                pasás un link o un código, se crean la cuenta y quedan vinculados. Después vuelven a
                esta pantalla y los elegís en la lista para darles turno.
              </p>
              <Button asChild>
                <Link href="/pro/invitaciones">
                  <UserPlus aria-hidden /> Invitar paciente
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <NewAppointmentForm
            patients={patients.map((p) => ({ id: p.id, name: p.displayName ?? p.user.name }))}
            defaultPatientId={patients.some((p) => p.id === preselected) ? preselected : undefined}
          />
        )}
      </section>

      <section aria-labelledby="agenda-title" className="flex flex-col gap-4">
        <h2 id="agenda-title" className="text-lg font-semibold">
          Próximas {weeks} semanas
        </h2>
        {days.size === 0 ? (
          <EmptyState icon={<CalendarDays />} title="No tenés turnos cargados">
            {patients.length === 0
              ? "Cuando tengas pacientes vinculados, los turnos que les des van a aparecer acá."
              : "Cargá el primero arriba. Si es semanal, elegí cuántas semanas repetirlo."}
          </EmptyState>
        ) : (
          [...days.entries()].map(([k, list]) => (
            <div key={k} className="flex flex-col gap-2">
              <h3 className="text-muted-foreground text-sm font-medium first-letter:uppercase">
                {k === today ? "Hoy · " : k === tomorrow ? "Mañana · " : ""}
                {formatLongDay(list[0].startsAt)}
              </h3>
              <ul className="flex flex-col gap-2">
                {list.map((a) => (
                  <AgendaRow
                    key={a.id}
                    item={{
                      id: a.id,
                      startsAt: a.startsAt.toISOString(),
                      durationMin: a.durationMin,
                      modality: a.modality,
                      place: a.place,
                      status: a.status,
                      cancelledBy: a.cancelledBy,
                      inSeries: !!a.seriesId,
                      patientId: a.patient.id,
                      patientName: a.patient.displayName ?? a.patient.user.name,
                    }}
                  />
                ))}
              </ul>
            </div>
          ))
        )}
        {weeks === 4 && (
          <Link href="/pro/agenda?semanas=12" className="text-primary text-sm hover:underline">
            Ver las próximas 12 semanas
          </Link>
        )}
      </section>
    </div>
  );
}
