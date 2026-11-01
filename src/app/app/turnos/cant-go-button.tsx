"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { cancelMyAppointment } from "@/lib/actions/appointments";

export function CantGoButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="-ml-2 flex flex-col items-start gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("¿Le avisamos a tu psicóloga que no podés ir a este turno?")) return;
          start(async () => {
            const res = await cancelMyAppointment(id);
            if (!res.ok) setError(res.error);
          });
        }}
      >
        {pending ? "Avisando…" : "No puedo ir"}
      </Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}
