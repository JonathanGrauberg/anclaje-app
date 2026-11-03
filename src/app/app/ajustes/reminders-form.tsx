"use client";

import { useState, useTransition } from "react";
import { PushDevice } from "@/components/push-device";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { saveReminderSettings } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

const DAYS = [
  { n: 1, short: "L", label: "lunes" },
  { n: 2, short: "M", label: "martes" },
  { n: 3, short: "M", label: "miércoles" },
  { n: 4, short: "J", label: "jueves" },
  { n: 5, short: "V", label: "viernes" },
  { n: 6, short: "S", label: "sábado" },
  { n: 0, short: "D", label: "domingo" },
];

export function RemindersForm({
  vapidKey,
  initial,
}: {
  vapidKey: string | null;
  initial: { enabled: boolean; time: string; days: number[] };
}) {
  const [settings, setSettings] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save(next: typeof settings) {
    setSettings(next);
    setStatus(null);
    start(async () => {
      const res = await saveReminderSettings(next);
      if (!res.ok) return setError(res.error);
      setError(null);
      setStatus("Guardado.");
    });
  }

  const toggleDay = (n: number) =>
    save({
      ...settings,
      days: settings.days.includes(n)
        ? settings.days.filter((d) => d !== n)
        : [...settings.days, n],
    });

  return (
    <div className="bg-card flex flex-col gap-4 rounded-2xl border p-4">
      <PushDevice
        vapidKey={vapidKey}
        onEnabled={() => !settings.enabled && save({ ...settings, enabled: true })}
      />

      <div className="flex items-center justify-between gap-4 border-t pt-4">
        <label htmlFor="rem-enabled">
          <span className="block font-medium">Recordarme registrar cómo estoy</span>
          <span className="text-muted-foreground text-sm">
            Un aviso amable, como mucho uno por día. Nunca dice qué registraste.
          </span>
        </label>
        <Switch
          id="rem-enabled"
          checked={settings.enabled}
          onCheckedChange={(enabled) => save({ ...settings, enabled })}
          disabled={pending}
        />
      </div>

      {settings.enabled && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="rem-time">Hora</Label>
            <Input
              id="rem-time"
              type="time"
              className="w-36"
              value={settings.time}
              onChange={(e) => setSettings({ ...settings, time: e.target.value })}
              onBlur={(e) =>
                /^\d{2}:\d{2}$/.test(e.target.value) && save({ ...settings, time: e.target.value })
              }
            />
          </div>
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Días</legend>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d) => {
                const on = settings.days.includes(d.n);
                return (
                  <button
                    key={d.n}
                    type="button"
                    aria-pressed={on}
                    aria-label={d.label}
                    onClick={() => toggleDay(d.n)}
                    className={cn(
                      "focus-visible:ring-ring size-10 rounded-full border text-sm font-medium focus-visible:ring-2 focus-visible:outline-none",
                      on ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
                    )}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      )}

      <FieldError>{error}</FieldError>
      {status && (
        <p role="status" className="text-muted-foreground text-sm">
          {status}
        </p>
      )}
    </div>
  );
}
