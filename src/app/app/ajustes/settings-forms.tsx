"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { unlinkProfessional, updateSharingDefaults } from "@/lib/actions/link";
import type { VisibilityValue } from "@/lib/constants";
import { normalizeCode } from "@/lib/invitations";

export function CodeEntry() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="bg-card flex flex-col gap-2 rounded-2xl border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const normalized = normalizeCode(code);
        if (!normalized)
          return setError("El código tiene 8 letras y números, por ejemplo ABCD-2345");
        router.push(`/vincular/${normalized}`);
      }}
    >
      <Label htmlFor="link-code">Tengo un código de invitación</Label>
      <div className="flex gap-2">
        <Input
          id="link-code"
          value={code}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="ABCD-2345"
          className="font-mono tracking-widest uppercase"
          onChange={(e) => {
            setCode(e.target.value);
            setError(null);
          }}
        />
        <Button type="submit" variant="soft" className="h-12" disabled={!code.trim()}>
          Seguir
        </Button>
      </div>
      <FieldError>{error}</FieldError>
    </form>
  );
}

export function UnlinkButton({ linkId, name }: { linkId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          Desvincularme
        </Button>
      </SheetTrigger>
      <SheetContent
        title={`¿Desvincularte de ${name}?`}
        description="Desde ese momento deja de ver todo lo tuyo, incluso lo que ya habías compartido. Tus registros siguen siendo tuyos. Para volver a vincularte vas a necesitar un código nuevo."
      >
        <FieldError>{error}</FieldError>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await unlinkProfessional(linkId);
                if (!res.ok) return setError(res.error);
                setOpen(false);
              })
            }
          >
            {pending ? "Desvinculando…" : "Sí, desvincularme"}
          </Button>
          <SheetClose asChild>
            <Button variant="outline" size="lg" className="flex-1">
              Cancelar
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}

type Defaults = { journal: VisibilityValue; emotions: VisibilityValue; cbt: VisibilityValue };

const MODULES: { key: keyof Defaults; label: string; hint: string }[] = [
  { key: "emotions", label: "Rueda de las emociones", hint: "Tus registros de lo que sentís" },
  { key: "cbt", label: "Autorregistros", hint: "Solo los que terminás" },
  { key: "journal", label: "Diario íntimo", hint: "Recomendado: privado" },
];

export function SharingDefaultsForm({ initial }: { initial: Defaults }) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [, start] = useTransition();

  function toggle(key: keyof Defaults, shared: boolean) {
    const next = { ...value, [key]: shared ? "SHARED" : "PRIVATE" } as Defaults;
    setValue(next);
    setSaved(false);
    start(async () => {
      const res = await updateSharingDefaults(next);
      if (!res.ok) {
        setValue(value);
        return setError(res.error);
      }
      setError(null);
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <ul className="bg-card divide-y rounded-2xl border">
        {MODULES.map((m) => (
          <li key={m.key} className="flex items-center justify-between gap-4 p-4">
            <label htmlFor={`def-${m.key}`}>
              <span className="block font-medium">{m.label}</span>
              <span className="text-muted-foreground text-sm">
                {value[m.key] === "SHARED" ? "Se comparte" : "Privado"} · {m.hint}
              </span>
            </label>
            <Switch
              id={`def-${m.key}`}
              checked={value[m.key] === "SHARED"}
              onCheckedChange={(c) => toggle(m.key, c)}
            />
          </li>
        ))}
      </ul>
      <FieldError>{error}</FieldError>
      {saved && (
        <p role="status" className="text-muted-foreground text-sm">
          Guardado.
        </p>
      )}
    </div>
  );
}
