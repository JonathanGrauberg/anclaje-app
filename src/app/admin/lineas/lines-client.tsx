"use client";

import { Plus, Trash2 } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { deleteCrisisLine, saveCrisisLine } from "@/lib/actions/admin";
import type { CrisisLineInput } from "@/lib/validation/admin";

type Line = Required<Omit<CrisisLineInput, "id">> & { id?: string };

const empty = (sortOrder: number): Line => ({
  name: "",
  phone: "",
  whatsapp: "",
  description: "",
  region: "",
  sortOrder,
  active: true,
});

export function CrisisLinesEditor({ lines }: { lines: Line[] }) {
  const [adding, setAdding] = useState(false);
  const next = lines.reduce((m, l) => Math.max(m, l.sortOrder), 0) + 1;

  return (
    <div className="flex flex-col gap-4">
      {lines.map((l) => (
        <LineForm key={l.id} line={l} />
      ))}
      {adding ? (
        <LineForm line={empty(next)} onDone={() => setAdding(false)} />
      ) : (
        <div>
          <Button variant="soft" onClick={() => setAdding(true)}>
            <Plus aria-hidden /> Agregar línea
          </Button>
        </div>
      )}
    </div>
  );
}

function LineForm({ line, onDone }: { line: Line; onDone?: () => void }) {
  const uid = useId();
  const [value, setValue] = useState(line);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const set = <K extends keyof Line>(k: K, v: Line[K]) => {
    setSaved(false);
    setValue((s) => ({ ...s, [k]: v }));
  };
  const isNew = !line.id;

  return (
    <Card>
      <CardContent>
        <form
          className="flex flex-col gap-3"
          aria-label={isNew ? "Nueva línea de ayuda" : `Línea ${line.name}`}
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await saveCrisisLine(value);
              if (!res.ok) return setError(res.error);
              setError(null);
              setSaved(true);
              onDone?.();
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-name`}>Nombre</Label>
              <Input
                id={`${uid}-name`}
                value={value.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-phone`}>Teléfono</Label>
              <Input
                id={`${uid}-phone`}
                inputMode="tel"
                value={value.phone}
                onChange={(e) => set("phone", e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-wa`}>WhatsApp (opcional)</Label>
              <Input
                id={`${uid}-wa`}
                inputMode="tel"
                placeholder="+54 343 …"
                value={value.whatsapp}
                onChange={(e) => set("whatsapp", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-desc`}>Descripción (opcional)</Label>
              <Input
                id={`${uid}-desc`}
                value={value.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-region`}>Región (opcional)</Label>
              <Input
                id={`${uid}-region`}
                value={value.region}
                onChange={(e) => set("region", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`${uid}-order`}>Orden</Label>
              <Input
                id={`${uid}-order`}
                type="number"
                min={0}
                max={999}
                value={value.sortOrder}
                onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch
              id={`${uid}-active`}
              checked={value.active}
              onCheckedChange={(v) => set("active", v)}
            />
            <Label htmlFor={`${uid}-active`}>Visible para pacientes</Label>
          </div>
          <FieldError>{error}</FieldError>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : isNew ? "Agregar" : "Guardar"}
            </Button>
            {isNew ? (
              <Button type="button" size="sm" variant="ghost" onClick={onDone}>
                Cancelar
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  if (!confirm(`¿Borrar la línea “${line.name}”?`)) return;
                  start(async () => {
                    const res = await deleteCrisisLine(line.id!);
                    if (!res.ok) setError(res.error);
                  });
                }}
              >
                <Trash2 aria-hidden /> Borrar
              </Button>
            )}
            {saved && !isNew && (
              <span role="status" className="text-primary text-sm">
                Guardado
              </span>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
