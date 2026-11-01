"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { saveClinicalRecord } from "@/lib/actions/pro";
import { formatRelative } from "@/lib/dates";
import { CLINICAL_RECORD_FIELDS, type ClinicalRecordField } from "@/lib/validation/pro";

export type ClinicalRecordValues = Record<ClinicalRecordField, string> & {
  treatmentStartedAt: string;
};

export function ClinicalRecordForm({
  patientId,
  initial,
  updatedAt,
}: {
  patientId: string;
  initial: ClinicalRecordValues;
  updatedAt: string | null;
}) {
  const [values, setValues] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState(updatedAt);
  const [pending, start] = useTransition();
  const set = (k: keyof ClinicalRecordValues, v: string) => {
    setDirty(true);
    setValues((s) => ({ ...s, [k]: v }));
  };

  return (
    <Card>
      <CardContent>
        <form
          className="flex flex-col gap-4"
          aria-label="Ficha de la historia clínica"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveClinicalRecord({ patientId, ...values });
              if (!res.ok) return setError(res.error);
              setError(null);
              setDirty(false);
              setSavedAt(new Date().toISOString());
            });
          }}
        >
          <div className="flex max-w-xs flex-col gap-1.5">
            <Label htmlFor="hc-start">Inicio del tratamiento</Label>
            <Input
              id="hc-start"
              type="date"
              value={values.treatmentStartedAt}
              onChange={(e) => set("treatmentStartedAt", e.target.value)}
            />
          </div>
          {CLINICAL_RECORD_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`hc-${f.key}`}>{f.label}</Label>
              {f.key === "emergencyContact" ? (
                <Input
                  id={`hc-${f.key}`}
                  value={values[f.key]}
                  maxLength={500}
                  placeholder="Nombre, vínculo y teléfono"
                  onChange={(e) => set(f.key, e.target.value)}
                />
              ) : (
                <Textarea
                  id={`hc-${f.key}`}
                  value={values[f.key]}
                  rows={f.key === "reason" || f.key === "plan" ? 4 : 3}
                  maxLength={20_000}
                  onChange={(e) => set(f.key, e.target.value)}
                />
              )}
            </div>
          ))}
          <FieldError>{error}</FieldError>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={pending || !dirty}>
              {pending ? "Guardando…" : "Guardar ficha"}
            </Button>
            <span role="status" className="text-muted-foreground text-sm">
              {dirty
                ? "Hay cambios sin guardar"
                : savedAt
                  ? `Guardada ${formatRelative(new Date(savedAt))}`
                  : ""}
            </span>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
