"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { acceptInvitation } from "@/lib/actions/link";

export function AcceptForm({ code, professionalName }: { code: string; professionalName: string }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!checked) return;
        start(async () => {
          const res = await acceptInvitation({ code, accepted: true });
          if (!res.ok) return setError(res.error);
          router.replace("/app/ajustes?vinculado=1");
          router.refresh();
        });
      }}
    >
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          className="accent-primary mt-0.5 size-5 shrink-0"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
        />
        <span>
          Leí y entiendo lo de arriba. Quiero vincularme con {professionalName} y que vea lo que yo
          elija compartir.
        </span>
      </label>
      <FieldError>{error}</FieldError>
      <Button type="submit" size="lg" disabled={!checked || pending}>
        {pending ? "Vinculando…" : "Aceptar y vincularme"}
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        Podés desvincularte cuando quieras desde Ajustes.
      </p>
    </form>
  );
}
