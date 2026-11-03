"use client";

import { useId, useState, useTransition } from "react";
import { FieldError, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { saveAppointmentEmails, saveAppointmentReminders } from "@/lib/actions/notifications";

/** Interruptor del recordatorio de turnos por mail (profesional: para sus pacientes; paciente: para sí). */
export function AppointmentEmailToggle({
  side,
  initial,
  label,
}: {
  side: "pro" | "patient";
  initial: boolean;
  label: string;
}) {
  const id = useId();
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="bg-card flex flex-col gap-2 rounded-2xl border p-4">
      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={id} className="font-normal">
          {label}
        </Label>
        <Switch
          id={id}
          checked={value}
          disabled={pending}
          onCheckedChange={(next) => {
            setValue(next);
            start(async () => {
              const save = side === "pro" ? saveAppointmentReminders : saveAppointmentEmails;
              const res = await save(next);
              if (!res.ok) {
                setValue(!next);
                setError(res.error);
              } else setError(null);
            });
          }}
        />
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
