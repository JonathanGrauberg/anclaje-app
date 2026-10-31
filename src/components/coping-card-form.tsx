"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { ActionResult } from "@/lib/actions/result";
import { cn } from "@/lib/utils";
import {
  COPING_CARD_LABELS,
  type CopingCardInput,
  type CopingCardTypeValue,
} from "@/lib/validation/pro";

export type CopingCardValue = {
  id?: string;
  type: CopingCardTypeValue;
  technique?: "BREATHING" | "GROUNDING" | "OTHER" | null;
  title: string;
  body: string;
  phone: string;
  whatsapp: boolean;
};

const TECHNIQUE_LABELS = {
  BREATHING: "Respiración guiada",
  GROUNDING: "Grounding 5-4-3-2-1",
  OTHER: "Otra",
} as const;

const TITLE_HINT: Record<CopingCardTypeValue, string> = {
  TECHNIQUE: "Ej.: Respiración 4-4-6",
  PHRASE: "Ej.: Esto que siento va a pasar",
  ACTIVITY: "Ej.: Salir a caminar diez minutos",
  CONTACT: "Ej.: Mi hermana Ana",
};

/** Formulario de una ficha del plan de calma (lo usan la profesional y el paciente). */
export function CopingCardForm({
  initial,
  types,
  onSave,
  onDone,
  submitLabel = "Guardar",
}: {
  initial?: CopingCardValue;
  types: readonly CopingCardTypeValue[];
  onSave: (input: CopingCardInput) => Promise<ActionResult<unknown>>;
  onDone?: () => void;
  submitLabel?: string;
}) {
  const [value, setValue] = useState<CopingCardValue>(
    initial ?? { type: types[0], technique: null, title: "", body: "", phone: "", whatsapp: false },
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const set = (patch: Partial<CopingCardValue>) => setValue((v) => ({ ...v, ...patch }));
  const idp = value.id ?? "new";

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await onSave({
            ...value,
            technique: value.type === "TECHNIQUE" ? (value.technique ?? "OTHER") : null,
          });
          if (!res.ok) return setError(res.error);
          setError(null);
          if (!initial)
            setValue((v) => ({ ...v, title: "", body: "", phone: "", whatsapp: false }));
          onDone?.();
        });
      }}
    >
      {types.length > 1 && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1.5 text-sm font-medium">Tipo</legend>
          {types.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={value.type === t}
              onClick={() => set({ type: t })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm transition-colors",
                value.type === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted",
              )}
            >
              {COPING_CARD_LABELS[t]}
            </button>
          ))}
        </fieldset>
      )}

      {value.type === "TECHNIQUE" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`cc-tech-${idp}`}>Técnica</Label>
          <select
            id={`cc-tech-${idp}`}
            className="border-input bg-card h-11 rounded-xl border px-3"
            value={value.technique ?? "OTHER"}
            onChange={(e) => set({ technique: e.target.value as CopingCardValue["technique"] })}
          >
            {Object.entries(TECHNIQUE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
          <p className="text-muted-foreground text-xs">
            Respiración y grounding usan el ejercicio interactivo de la app con este título y
            descripción.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`cc-title-${idp}`}>
          {value.type === "CONTACT" ? "Nombre" : value.type === "PHRASE" ? "Frase" : "Título"}
        </Label>
        <Input
          id={`cc-title-${idp}`}
          value={value.title}
          maxLength={120}
          placeholder={TITLE_HINT[value.type]}
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`cc-body-${idp}`}>Detalle (opcional)</Label>
        <Textarea
          id={`cc-body-${idp}`}
          className="min-h-20"
          value={value.body}
          maxLength={500}
          onChange={(e) => set({ body: e.target.value })}
        />
      </div>

      {value.type === "CONTACT" && (
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor={`cc-phone-${idp}`}>Teléfono</Label>
            <Input
              id={`cc-phone-${idp}`}
              type="tel"
              inputMode="tel"
              value={value.phone}
              maxLength={30}
              placeholder="+54 9 11 1234-5678"
              onChange={(e) => set({ phone: e.target.value })}
            />
          </div>
          <label className="flex h-12 items-center gap-2 text-sm">
            <Switch checked={value.whatsapp} onCheckedChange={(whatsapp) => set({ whatsapp })} />
            Tiene WhatsApp
          </label>
        </div>
      )}

      <FieldError>{error}</FieldError>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !value.title.trim()}>
          {pending ? "Guardando…" : submitLabel}
        </Button>
        {onDone && initial && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
