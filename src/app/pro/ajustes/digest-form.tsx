"use client";

import { useState, useTransition } from "react";
import { FieldError } from "@/components/ui/input";
import { saveDigestFrequency } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

type Frequency = "DAILY" | "WEEKLY" | "NEVER";

const OPTIONS: { value: Frequency; label: string; hint: string }[] = [
  { value: "DAILY", label: "Todos los días", hint: "A partir de las 8" },
  { value: "WEEKLY", label: "Una vez por semana", hint: "Los lunes a partir de las 8" },
  { value: "NEVER", label: "Nunca", hint: "Lo ves cuando entrás" },
];

export function DigestForm({ initial }: { initial: Frequency }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function choose(next: Frequency) {
    const prev = value;
    setValue(next);
    setSaved(false);
    start(async () => {
      const res = await saveDigestFrequency(next);
      if (!res.ok) {
        setValue(prev);
        return setError(res.error);
      }
      setError(null);
      setSaved(true);
    });
  }

  return (
    <fieldset className="flex flex-col gap-2" disabled={pending}>
      <legend className="sr-only">Frecuencia del resumen</legend>
      <div className="bg-card divide-y rounded-2xl border">
        {OPTIONS.map((o) => (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-center gap-3 p-4",
              value === o.value && "bg-primary-soft/50",
            )}
          >
            <input
              type="radio"
              name="digest"
              value={o.value}
              checked={value === o.value}
              onChange={() => choose(o.value)}
              className="accent-primary size-4"
            />
            <span>
              <span className="block font-medium">{o.label}</span>
              <span className="text-muted-foreground text-sm">{o.hint}</span>
            </span>
          </label>
        ))}
      </div>
      <FieldError>{error}</FieldError>
      {saved && (
        <p role="status" className="text-muted-foreground text-sm">
          Guardado.
        </p>
      )}
    </fieldset>
  );
}
