"use client";

import { MapPin, Pencil, Video, X } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
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

export function NewAppointmentForm({
  patients,
  defaultPatientId,
}: {
  patients: { id: string; name: string }[];
  defaultPatientId?: string;
}) {
  const uid = useId();
  const [patientId, setPatientId] = useState(defaultPatientId ?? "");
  const [fields, setFields] = useState<Fields>({
    startsAt: "",
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
            start(async () => {
              const res = await createAppointment({ patientId, ...fields, repeatWeeks });
              if (!res.ok) return setError(res.error);
              setError(null);
              setDone(
                res.data.count === 1 ? "Turno agendado." : `${res.data.count} turnos agendados.`,
              );
              setFields((f) => ({ ...f, startsAt: "" }));
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
                </option>
              ))}
            </select>
          </div>
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
    if (!confirm(`¿Cancelar ${what}? Lo va a ver en la app.`)) return;
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
        <span className={cn("font-semibold tabular-nums", cancelled && "text-muted-foreground line-through")}>
          {formatTime(startsAt)}–{formatTime(ends)}
        </span>
        <Link href={`/pro/pacientes/${item.patientId}`} className="font-medium hover:underline">
          {item.patientName}
        </Link>
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
