"use client";

import { Lock, Users } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { ActionResult } from "@/lib/actions/result";
import { INTENTION_LABELS } from "@/lib/constants";
import { ShareControl, type ShareValue } from "./share-control";

/** Insignia "Privado / Compartido" que abre una hoja para cambiarlo (dejar de compartir incluido). */
export function ShareEditor({
  value,
  action,
  hasProfessional,
}: {
  value: ShareValue;
  action: (share: ShareValue) => Promise<ActionResult<unknown>>;
  hasProfessional: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shared = value.visibility === "SHARED";

  return (
    <Sheet open={open} onOpenChange={(o) => (setOpen(o), o && (setDraft(value), setError(null)))}>
      <SheetTrigger asChild>
        <button
          type="button"
          className={
            shared
              ? "bg-primary-soft text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              : "bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
          }
          aria-label={`${shared ? `Compartido${value.intention ? `: ${INTENTION_LABELS[value.intention]}` : ""}` : "Privado"}. Cambiar`}
          title={shared && value.intention ? INTENTION_LABELS[value.intention] : undefined}
        >
          {shared ? (
            <Users className="size-3.5" aria-hidden />
          ) : (
            <Lock className="size-3.5" aria-hidden />
          )}
          {shared ? "Compartido" : "Privado"}
        </button>
      </SheetTrigger>
      <SheetContent title="¿Quién lo ve?" description="Podés cambiarlo cuando quieras.">
        <ShareControl value={draft} onChange={setDraft} hasProfessional={hasProfessional} />
        <FieldError>{error}</FieldError>
        <Button
          className="mt-4 w-full"
          size="lg"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await action(draft);
              if (!res.ok) return setError(res.error);
              setOpen(false);
            })
          }
        >
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
