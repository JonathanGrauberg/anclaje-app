"use client";

import { RotateCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { restoreManagedPatient } from "@/lib/actions/patients";
import { formatDate } from "@/lib/dates";

/** Pacientes sin la app dados de baja: su historia se guarda y se pueden reactivar. */
export function ArchivedPatients({
  patients,
}: {
  patients: { id: string; name: string; archivedAt: string | null }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2">
        {patients.map((p) => (
          <li
            key={p.id}
            className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
          >
            <div>
              <p className="font-medium">{p.name}</p>
              {p.archivedAt && (
                <p className="text-muted-foreground text-sm">
                  Dado de baja el {formatDate(new Date(p.archivedAt))}
                </p>
              )}
            </div>
            <Button
              size="sm"
              variant="soft"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await restoreManagedPatient(p.id);
                  setError(res.ok ? null : res.error);
                })
              }
            >
              <RotateCcw /> Reactivar
            </Button>
          </li>
        ))}
      </ul>
      <FieldError>{error}</FieldError>
    </div>
  );
}
