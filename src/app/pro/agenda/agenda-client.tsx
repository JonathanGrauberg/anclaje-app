"use client";

import { MapPin, Pencil, Video, X } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import {
  cancelAppointment,
  createAppointment,
  updateAppointment,
} from "@/lib/actions/appointments";
import { formatTime, toLocalInputValue } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { MODALITY_LABEL } from "@/lib/validation/appointments";

type Modality = keyof typeof MODALITY_LABEL;
type Fields = { startsAt: string; durationMin: number; modality: Modality; place: string };

const selectClass = "border-input bg-card h-11 rounded-xl border px-3 text-sm";

/** Día y hora, duración, modalidad y lugar: lo comparten el alta y la edición. */
function AppointmentFields({ value, onChange }: { value: Fields; onChange: (v: Fields) => void }) {
  const uid = useId();
  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => onChange({ ...value, [k]: v });
  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-when`}>Día y hora</Label>
        <Input
          id={`${uid}-when`}
          type="datetime-local"
          value={value.startsAt}
          onChange={(e) => set("startsAt", e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-dur`}>Duración (min)</Label>
        <Input
          id={`${uid}-dur`}
          type="number"
          min={10}
          max={240}
          step={5}
          value={value.durationMin}
          onChange={(e) => set("durationMin", Number(e.target.value) || 0)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-mod`}>Modalidad</Label>
        <select
          id={`${uid}-mod`}
          value={value.modality}
          onChange={(e) => set("modality", e.target.value as Modality)}
          className={selectClass}
        >
          {Object.entries(MODALITY_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor={`${uid}-place`}>
          {value.modality === "ONLINE" ? "Link de la videollamada" : "Dirección"} (opcional)
        </Label>
        <Input
          id={`${uid}-place`}
          value={value.place}
          maxLength={300}
          onChange={(e) => set("place", e.target.value)}
        />
      </div>
    </>
  );
}

const NEW = "__nuevo__";

export function NewAppointmentForm({
  patients,
  defaultPatientId,
  defaultDay,
}: {
  patients: { id: string; name: string; withoutApp: boolean }[];
  defaultPatientId?: string;
  /** Día elegido en el calendario ("YYYY-MM-DD"): se propone a las 9. */
  defaultDay?: string;
}) {
  const uid = useId();
  const [patientId, setPatientId] = useState(
    defaultPatientId ?? (patients.length === 0 ? NEW : ""),
  );
  const [newPatient, setNewPatient] = useState({ name: "", contact: "" });
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);
  const selectedPatient = patients.find((p) => p.id === patientId);
  const [fields, setFields] = useState<Fields>({
    startsAt: defaultDay ? `${defaultDay}T09:00` : "",
    durationMin: 50,
    modality: "IN_PERSON",
    place: "",
  });
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(null);
            setCreated(null);
            start(async () => {
              const res = await createAppointment(
                patientId === NEW
                  ? { newPatient, ...fields, repeatWeeks }
                  : { patientId, ...fields, repeatWeeks },
              );
              if (!res.ok) return setError(res.error);
              setError(null);
              setDone(
                res.data.count === 1 ? "Turno agendado." : `${res.data.count} turnos agendados.`,
              );
              setFields((f) => ({ ...f, startsAt: "" }));
              if (res.data.newPatient) {
                // El paciente nuevo ya aparece en la lista: queda elegido.
                setCreated(res.data.newPatient);
                setPatientId(res.data.newPatient.id);
                setNewPatient({ name: "", contact: "" });
              }
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-patient`}>Paciente</Label>
            <select
              id={`${uid}-patient`}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              className={selectClass}
              required
            >
              <option value="">Elegí…</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.withoutApp ? " (sin la app)" : ""}
                </option>
              ))}
              <option value={NEW}>+ Paciente nuevo, sin la app</option>
            </select>
            {selectedPatient?.withoutApp && (
              <p className="text-muted-foreground text-xs">
                No tiene la app.{" "}
                <Link
                  href={`/pro/pacientes/${selectedPatient.id}`}
                  className="text-primary underline underline-offset-2"
                >
                  Invitalo desde su ficha
                </Link>
              </p>
            )}
          </div>
          {patientId === NEW && (
            <div className="bg-muted/60 grid gap-3 rounded-xl p-3 sm:col-span-3 sm:grid-cols-2">
              <p className="text-muted-foreground text-sm sm:col-span-2">
                Para alguien que no usa la app (o todavía no): queda en tu agenda y podés llevar su
                historia clínica. Después lo podés invitar desde su ficha.
              </p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${uid}-new-name`}>Nombre del paciente</Label>
                <Input
                  id={`${uid}-new-name`}
                  value={newPatient.name}
                  maxLength={120}
                  required
                  onChange={(e) => setNewPatient((v) => ({ ...v, name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`${uid}-new-contact`}>Contacto (opcional)</Label>
                <Input
                  id={`${uid}-new-contact`}
                  value={newPatient.contact}
                  maxLength={300}
                  placeholder="Teléfono o mail"
                  onChange={(e) => setNewPatient((v) => ({ ...v, contact: e.target.value }))}
                />
              </div>
            </div>
          )}
          <AppointmentFields value={fields} onChange={setFields} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-repeat`}>Repetir</Label>
            <select
              id={`${uid}-repeat`}
              value={repeatWeeks}
              onChange={(e) => setRepeatWeeks(Number(e.target.value))}
              className={selectClass}
            >
              <option value={1}>Solo este turno</option>
              {[4, 8, 12, 26].map((n) => (
                <option key={n} value={n}>
                  Todas las semanas, {n === 26 ? "6 meses" : `${n} semanas`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Agendando…" : "Agendar"}
            </Button>
            <FieldError>{error}</FieldError>
            {done && (
              <span role="status" className="text-primary text-sm">
                {done}
                {created && (
                  <>
                    {" "}
                    {created.name} todavía no tiene la app:{" "}
                    <Link
                      href={`/pro/pacientes/${created.id}`}
                      className="underline underline-offset-2"
                    >
                      ver su ficha e invitarlo
                    </Link>
                    .
                  </>
                )}
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export type AgendaRowItem = {
  id: string;
  startsAt: string;
  durationMin: number;
  modality: Modality;
  place: string | null;
  status: "SCHEDULED" | "CANCELLED";
  cancelledBy: "PATIENT" | "PROFESSIONAL" | null;
  inSeries: boolean;
  patientId: string;
  patientName: string;
  withoutApp: boolean;
};

export function AgendaRow({ item }: { item: AgendaRowItem }) {
  const [editing, setEditing] = useState(false);
  const [fields, setFields] = useState<Fields>({
    startsAt: toLocalInputValue(new Date(item.startsAt)),
    durationMin: item.durationMin,
    modality: item.modality,
    place: item.place ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const startsAt = new Date(item.startsAt);
  const ends = new Date(startsAt.getTime() + item.durationMin * 60_000);
  const cancelled = item.status === "CANCELLED";

  const cancel = (scope: "one" | "following") => {
    const what =
      scope === "following"
        ? `este turno de ${item.patientName} y todos los siguientes de la serie`
        : `el turno de ${item.patientName}`;
    if (!confirm(`¿Cancelar ${what}?${item.withoutApp ? "" : " Lo va a ver en la app."}`)) return;
    start(async () => {
      const res = await cancelAppointment(item.id, scope);
      if (!res.ok) setError(res.error);
    });
  };

  return (
    <li
      className={cn(
        "bg-card flex flex-col gap-2 rounded-2xl border p-4",
        cancelled && item.cancelledBy === "PATIENT" && "border-danger/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span
          className={cn(
            "font-semibold tabular-nums",
            cancelled && "text-muted-foreground line-through",
          )}
        >
          {formatTime(startsAt)}–{formatTime(ends)}
        </span>
        <Link href={`/pro/pacientes/${item.patientId}`} className="font-medium hover:underline">
          {item.patientName}
        </Link>
        {item.withoutApp && <Badge>Sin la app</Badge>}
        <span className="text-muted-foreground flex items-center gap-1 text-sm">
          {item.modality === "ONLINE" ? (
            <Video className="size-4" aria-hidden />
          ) : (
            <MapPin className="size-4" aria-hidden />
          )}
          {MODALITY_LABEL[item.modality]}
          {item.place && <span className="max-w-64 truncate">· {item.place}</span>}
        </span>
        {cancelled && (
          <span
            className={cn(
              "text-sm font-medium",
              item.cancelledBy === "PATIENT" ? "text-danger" : "text-muted-foreground",
            )}
          >
            {item.cancelledBy === "PATIENT" ? "Avisó que no puede venir" : "Cancelado"}
          </span>
        )}
        {!cancelled && (
          <span className="ml-auto flex flex-wrap gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing((v) => !v)}
              aria-expanded={editing}
            >
              <Pencil aria-hidden /> Cambiar
            </Button>
            <Button variant="ghost" size="sm" disabled={pending} onClick={() => cancel("one")}>
              <X aria-hidden /> {item.inSeries ? "Cancelar este" : "Cancelar turno"}
            </Button>
            {item.inSeries && (
              <Button
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => cancel("following")}
              >
                Cancelar este y los siguientes
              </Button>
            )}
          </span>
        )}
      </div>
      {editing && (
        <form
          className="grid gap-3 border-t pt-3 sm:grid-cols-3"
          aria-label={`Cambiar turno de ${item.patientName}`}
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await updateAppointment({ id: item.id, ...fields });
              if (!res.ok) return setError(res.error);
              setError(null);
              setEditing(false);
            });
          }}
        >
          <AppointmentFields value={fields} onChange={setFields} />
          <div className="flex items-end gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Guardar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cerrar
            </Button>
          </div>
        </form>
      )}
      <FieldError>{error}</FieldError>
    </li>
  );
}
