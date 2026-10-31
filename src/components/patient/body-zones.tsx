"use client";

import { BODY_ZONES, type BodyZoneId } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Chips para marcar dónde se siente en el cuerpo. */
export function BodyZonePicker({
  value,
  onChange,
  legend = "¿Dónde lo sentís en el cuerpo?",
}: {
  value: BodyZoneId[];
  onChange: (v: BodyZoneId[]) => void;
  legend?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {BODY_ZONES.map((zone) => {
          const on = value.includes(zone.id);
          return (
            <button
              key={zone.id}
              type="button"
              aria-pressed={on}
              onClick={() =>
                onChange(on ? value.filter((z) => z !== zone.id) : [...value, zone.id])
              }
              className={cn(
                "rounded-full border px-3.5 py-2 text-sm transition-colors",
                on
                  ? "border-primary bg-primary-soft text-primary font-medium"
                  : "bg-card hover:bg-muted",
              )}
            >
              {zone.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
