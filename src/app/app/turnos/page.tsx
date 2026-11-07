import { CalendarDays, MapPin, Video } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatLongDay, formatTime } from "@/lib/dates";
import { getPatientAppointments } from "@/lib/queries/appointments";
import { requirePatient } from "@/lib/session";
import { cn } from "@/lib/utils";
import { MODALITY_LABEL } from "@/lib/validation/appointments";
import { CantGoButton } from "./cant-go-button";

export const metadata: Metadata = { title: "Mis turnos" };

export default async function MyAppointmentsPage() {
  const { patient } = await requirePatient();
  const appointments = await getPatientAppointments(patient.id);

  return (
    <>
      <PageHeader
        tone="sun"
        back={{ href: "/app", label: "Inicio" }}
        title="Mis turnos"
        description="Los turnos que te dio tu psicóloga. Si no podés ir, avisale desde acá."
      />
      {appointments.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title="No tenés turnos próximos">
          Cuando tu psicóloga te dé un turno, lo vas a ver acá.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {appointments.map((a) => {
            const cancelled = a.status === "CANCELLED";
            const ends = new Date(a.startsAt.getTime() + a.durationMin * 60_000);
            return (
              <li
                key={a.id}
                className={cn(
                  "bg-card flex flex-col gap-2 rounded-3xl border p-4",
                  cancelled && "text-muted-foreground",
                )}
              >
                <p className="text-lg font-semibold first-letter:uppercase">
                  <span className={cn(cancelled && "line-through")}>
                    {formatLongDay(a.startsAt)}, {formatTime(a.startsAt)} a {formatTime(ends)}
                  </span>
                </p>
                <p className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
                  {a.modality === "ONLINE" ? (
                    <Video className="size-4" aria-hidden />
                  ) : (
                    <MapPin className="size-4" aria-hidden />
                  )}
                  {MODALITY_LABEL[a.modality]} · con {a.professional.displayName}
                </p>
                {a.place &&
                  !cancelled &&
                  (a.modality === "ONLINE" && /^https?:\/\//.test(a.place) ? (
                    <a
                      href={a.place}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary text-sm break-all underline underline-offset-2"
                    >
                      Entrar a la videollamada
                    </a>
                  ) : (
                    <p className="text-sm break-words">{a.place}</p>
                  ))}
                {cancelled ? (
                  <p className="text-sm font-medium">
                    {a.cancelledBy === "PATIENT"
                      ? "Avisaste que no podés ir."
                      : "Tu psicóloga canceló este turno."}
                  </p>
                ) : (
                  <CantGoButton id={a.id} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
