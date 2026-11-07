import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { linkedPatientsWhere } from "@/lib/access";
import { dayKey, formatLongDay } from "@/lib/dates";
import { decryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { patientName } from "@/lib/patients";
import { getAgenda, type AgendaItem } from "@/lib/queries/appointments";
import { requireProfessional } from "@/lib/session";
import {
  appointmentCancelledMessage,
  appointmentReminderMessage,
  extractPhone,
  whatsappMessageHref,
} from "@/lib/whatsapp";
import { AgendaRow, NewAppointmentForm } from "./agenda-client";
import { MonthCalendar, shiftMonth } from "./month-calendar";

export const metadata: Metadata = { title: "Agenda" };

const DAY = 86_400_000;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;

/** Comienzo de hoy en Buenos Aires y las claves de hoy y mañana. */
function todayInfo() {
  const now = new Date();
  return {
    from: new Date(`${dayKey(now)}T00:00:00-03:00`),
    today: dayKey(now),
    tomorrow: dayKey(new Date(now.getTime() + DAY)),
  };
}

/** Inicio (hora de Buenos Aires) de un día "YYYY-MM-DD". */
const startOfDay = (day: string) => new Date(`${day}T00:00:00-03:00`);

function groupByDay(items: AgendaItem[]) {
  const days = new Map<string, AgendaItem[]>();
  for (const a of items) {
    const k = dayKey(a.startsAt);
    days.set(k, [...(days.get(k) ?? []), a]);
  }
  return days;
}

/**
 * Botón de WhatsApp de un turno que viene: recordarlo, o avisar que lo cancelaste (si lo canceló
 * el paciente, ya lo sabe). Abre el chat del paciente si cargó su celular (o está en su contacto).
 */
function whatsappFor(a: AgendaItem, professionalName: string) {
  if (a.startsAt.getTime() < Date.now()) return null;
  const cancelled = a.status === "CANCELLED";
  if (cancelled && a.cancelledBy !== "PROFESSIONAL") return null;
  const phone =
    decryptOptional(a.patient.user?.phoneEnc) ??
    extractPhone(decryptOptional(a.patient.contactEnc));
  const message = { ...a, patientName: patientName(a.patient), professionalName };
  const text = cancelled
    ? appointmentCancelledMessage(message)
    : appointmentReminderMessage(message);
  return {
    label: cancelled ? "Avisar por WhatsApp" : "Recordar por WhatsApp",
    href: whatsappMessageHref(phone, text),
    withPhone: !!phone,
  };
}

export default async function AgendaPage({ searchParams }: PageProps<"/pro/agenda">) {
  const { professional } = await requireProfessional();
  const sp = await searchParams;
  const weeks = sp.semanas === "12" ? 12 : 4;
  const preselected = typeof sp.paciente === "string" ? sp.paciente : undefined;
  const { from, today, tomorrow } = todayInfo();
  const selected =
    typeof sp.dia === "string" && DAY_RE.test(sp.dia) && !Number.isNaN(startOfDay(sp.dia).getTime())
      ? sp.dia
      : undefined;
  const month =
    typeof sp.mes === "string" && MONTH_RE.test(sp.mes) ? sp.mes : (selected ?? today).slice(0, 7);

  // Lo que se lista: el día elegido, o las próximas semanas desde hoy.
  const listFrom = selected ? startOfDay(selected) : from;
  const listTo = selected
    ? new Date(listFrom.getTime() + DAY)
    : new Date(from.getTime() + weeks * 7 * DAY);
  const monthFrom = startOfDay(`${month}-01`);
  const monthTo = startOfDay(`${shiftMonth(month, 1)}-01`);

  const [patients, items, monthItems] = await Promise.all([
    prisma.patientProfile.findMany({
      where: linkedPatientsWhere(professional.id),
      orderBy: { displayName: "asc" },
      select: { id: true, userId: true, displayName: true, user: { select: { name: true } } },
    }),
    getAgenda(professional.id, listFrom, listTo),
    getAgenda(professional.id, monthFrom, monthTo),
  ]);

  const counts = new Map<string, number>();
  for (const a of monthItems) {
    if (a.status !== "SCHEDULED") continue;
    const k = dayKey(a.startsAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const days = groupByDay(items);

  const hrefFor = (q: { dia?: string; mes?: string }) => {
    const p = new URLSearchParams();
    if (q.dia) p.set("dia", q.dia);
    if (q.mes) p.set("mes", q.mes);
    if (preselected) p.set("paciente", preselected);
    return `/pro/agenda?${p}`;
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        tone="sun"
        title="Agenda"
        description="Tus turnos. Los pacientes que usan la app los ven ahí; también podés dar turno a quien no la usa."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[300px_1fr]">
        <MonthCalendar
          month={month}
          today={today}
          selected={selected}
          counts={counts}
          hrefFor={hrefFor}
        />

        <div className="flex min-w-0 flex-col gap-8">
          <section aria-labelledby="new-title" className="flex max-w-3xl flex-col gap-3">
            <h2 id="new-title" className="text-lg font-semibold">
              Nuevo turno
            </h2>
            <NewAppointmentForm
              key={selected ?? "sin-dia"}
              patients={patients.map((p) => ({
                id: p.id,
                name: patientName(p),
                withoutApp: !p.userId,
              }))}
              defaultPatientId={
                patients.some((p) => p.id === preselected) ? preselected : undefined
              }
              defaultDay={selected && selected >= today ? selected : undefined}
            />
          </section>

          <section aria-labelledby="agenda-title" className="flex flex-col gap-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="agenda-title" className="text-lg font-semibold first-letter:uppercase">
                {selected
                  ? `${selected === today ? "Hoy · " : ""}${formatLongDay(startOfDay(selected))}`
                  : `Próximas ${weeks} semanas`}
              </h2>
              {selected && (
                <Link
                  href="/pro/agenda"
                  className="text-primary text-sm underline underline-offset-2"
                >
                  Ver los próximos turnos
                </Link>
              )}
            </div>
            {days.size === 0 ? (
              <EmptyState
                icon={<CalendarDays />}
                title={selected ? "No hay turnos ese día" : "No tenés turnos cargados"}
              >
                {selected
                  ? "Si querés, dale un turno con el formulario de arriba."
                  : "Cargá el primero arriba. Si es semanal, elegí cuántas semanas repetirlo."}
              </EmptyState>
            ) : (
              [...days.entries()].map(([k, list]) => (
                <div key={k} className="flex flex-col gap-2">
                  {!selected && (
                    <h3 className="text-muted-foreground text-sm font-medium first-letter:uppercase">
                      {k === today ? "Hoy · " : k === tomorrow ? "Mañana · " : ""}
                      {formatLongDay(list[0].startsAt)}
                    </h3>
                  )}
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
                          patientName: patientName(a.patient),
                          withoutApp: !a.patient.userId,
                          whatsapp: whatsappFor(a, professional.displayName),
                        }}
                      />
                    ))}
                  </ul>
                </div>
              ))
            )}
            {!selected && weeks === 4 && (
              <Link href="/pro/agenda?semanas=12" className="text-primary text-sm hover:underline">
                Ver las próximas 12 semanas
              </Link>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
