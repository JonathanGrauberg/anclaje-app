"use client";

import { Lock, Users } from "lucide-react";
import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import {
  INTENTION_LABELS,
  INTENTIONS,
  type IntentionValue,
  type VisibilityValue,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ShareValue = { visibility: VisibilityValue; intention: IntentionValue | null };

/** Interruptor "Compartir con mi psicóloga" + elección de intención. */
export function ShareControl({
  value,
  onChange,
  hasProfessional = true,
  compact = false,
}: {
  value: ShareValue;
  onChange: (v: ShareValue) => void;
  hasProfessional?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const shared = value.visibility === "SHARED";

  return (
    <div className={cn("bg-card flex flex-col gap-3 rounded-2xl border", compact ? "p-3" : "p-4")}>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="flex items-start gap-3">
          <span
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full",
              shared ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground",
            )}
            aria-hidden
          >
            {shared ? <Users className="size-4" /> : <Lock className="size-4" />}
          </span>
          <span>
            <span className="block font-medium">Compartir con mi psicóloga</span>
            <span className="text-muted-foreground block text-sm">
              {shared
                ? hasProfessional
                  ? "Tu psicóloga lo va a poder ver."
                  : "Cuando te vincules con tu psicóloga, lo va a poder ver."
                : "Solo vos podés verlo."}
            </span>
          </span>
        </label>
        <Switch
          id={id}
          checked={shared}
          onCheckedChange={(on) =>
            onChange({
              visibility: on ? "SHARED" : "PRIVATE",
              intention: on ? (value.intention ?? "JUST_FYI") : null,
            })
          }
        />
      </div>
      {shared && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">¿Para qué lo compartís?</legend>
          <div className="flex flex-wrap gap-2">
            {INTENTIONS.map((intention) => (
              <label
                key={intention}
                className={cn(
                  "has-[:focus-visible]:ring-ring/40 cursor-pointer rounded-full border px-3.5 py-2 text-sm transition-colors has-[:focus-visible]:ring-3",
                  value.intention === intention
                    ? "border-primary bg-primary-soft text-primary font-medium"
                    : "hover:bg-muted",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-intention`}
                  value={intention}
                  checked={value.intention === intention}
                  onChange={() => onChange({ visibility: "SHARED", intention })}
                  className="sr-only"
                />
                {INTENTION_LABELS[intention]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
