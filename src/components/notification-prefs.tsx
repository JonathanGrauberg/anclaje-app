"use client";

import { useState, useTransition } from "react";
import { FieldError } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { saveNotificationPref } from "@/lib/actions/notifications";
import type { NotifyKind } from "@/lib/push-messages";

export type NotificationPrefItem = { kind: NotifyKind; label: string; hint: string };

/** Interruptores de cada tipo de aviso al celular. Se guarda al tocar. */
export function NotificationPrefs({
  items,
  initial,
}: {
  items: NotificationPrefItem[];
  initial: Partial<Record<NotifyKind, boolean>>;
}) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function toggle(kind: NotifyKind, enabled: boolean) {
    setValues((v) => ({ ...v, [kind]: enabled }));
    start(async () => {
      const res = await saveNotificationPref({ kind, enabled });
      if (!res.ok) {
        setValues((v) => ({ ...v, [kind]: !enabled }));
        setError(res.error);
      } else setError(null);
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {items.map((it) => (
        <div key={it.kind} className="flex items-center justify-between gap-4">
          <label htmlFor={`notify-${it.kind}`}>
            <span className="block font-medium">{it.label}</span>
            <span className="text-muted-foreground text-sm">{it.hint}</span>
          </label>
          <Switch
            id={`notify-${it.kind}`}
            checked={values[it.kind] ?? false}
            disabled={pending}
            onCheckedChange={(next) => toggle(it.kind, next)}
          />
        </div>
      ))}
      <FieldError>{error}</FieldError>
    </div>
  );
}
