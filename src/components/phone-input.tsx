"use client";

import { useState } from "react";
import { Input, Label } from "@/components/ui/input";
import {
  buildPhone,
  formatNational,
  nationalDigits,
  PHONE_COUNTRIES,
  phoneHint,
  splitPhone,
} from "@/lib/phone";
import { cn } from "@/lib/utils";

/** Celular con el país aparte ([+54] [11 2345 6789]) y la cuenta de números a la vista. */
export function PhoneInput({
  id,
  label,
  country,
  value,
  onChange,
  description,
}: {
  id: string;
  label: string;
  country: string;
  value: string;
  onChange: (v: { country: string; value: string }) => void;
  description?: string;
}) {
  const c = PHONE_COUNTRIES.find((x) => x.code === country);
  const count = nationalDigits(country, value).length;
  const max = c?.digits[1] ?? 15;
  const check = value.replace(/\D/g, "") ? buildPhone(country, value) : null;
  // El error se muestra recién al salir del campo, no mientras se escribe.
  const [touched, setTouched] = useState(false);
  const invalid = touched && !!check && !check.ok;
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <select
          aria-label="País"
          className="border-input bg-card h-11 shrink-0 rounded-xl border px-2 text-sm"
          value={country}
          onChange={(e) => onChange({ country: e.target.value, value })}
        >
          {PHONE_COUNTRIES.map((x) => (
            <option key={x.code} value={x.code}>
              {x.name} +{x.code}
            </option>
          ))}
        </select>
        <div className="relative min-w-0 flex-1">
          <Input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={c?.example}
            value={value}
            maxLength={24}
            aria-invalid={invalid}
            aria-describedby={`${id}-hint`}
            className="pr-14"
            onBlur={() => {
              setTouched(true);
              // Si está bien, lo dejamos escrito limpio (sin 0 ni 15), para que se aprenda.
              if (check?.ok) {
                const s = splitPhone(check.value);
                onChange({ country, value: formatNational(s.code, s.national) });
              }
            }}
            onChange={(e) =>
              onChange({ country, value: e.target.value.replace(/[^\d\s()-]/g, "") })
            }
          />
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs tabular-nums",
              check?.ok ? "text-primary" : "text-muted-foreground",
            )}
          >
            {count}/{max}
          </span>
        </div>
      </div>
      <p
        id={`${id}-hint`}
        className={cn("text-xs", invalid ? "text-danger" : "text-muted-foreground")}
      >
        {invalid && check && !check.ok ? check.error : phoneHint(country)}
        {description && !invalid ? ` ${description}` : ""}
      </p>
    </div>
  );
}
