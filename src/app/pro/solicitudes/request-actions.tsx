"use client";

import { Check, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import {
  acceptRequest,
  deleteRequest,
  markRequestContacted,
} from "@/lib/actions/appointment-requests";

export function RequestActions({
  id,
  status,
  patientId,
  name,
}: {
  id: string;
  status: "NEW" | "CONTACTED" | "ACCEPTED";
  patientId: string | null;
  name: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Algo salió mal");
      router.refresh();
    });

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {patientId ? (
          <Button asChild size="sm" variant="soft">
            <Link href={`/pro/pacientes/${patientId}`}>Ver su ficha</Link>
          </Button>
        ) : (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await acceptRequest(id);
                if (!res.ok) return setError(res.error);
                router.push(`/pro/pacientes/${res.data.patientId}`);
              })
            }
          >
            <UserPlus aria-hidden /> Agregar como paciente
          </Button>
        )}
        {status !== "ACCEPTED" && (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => run(() => markRequestContacted(id))}
          >
            <Check aria-hidden /> {status === "CONTACTED" ? "Marcar como nueva" : "Ya la contacté"}
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          aria-label={`Borrar la solicitud de ${name}`}
          onClick={() => {
            if (
              !confirm(
                `¿Borrar la solicitud de ${name}? Se borran sus datos y no se puede deshacer.`,
              )
            )
              return;
            run(() => deleteRequest(id));
          }}
        >
          <Trash2 aria-hidden /> Borrar
        </Button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
