"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { addManagedPatient } from "@/lib/actions/patients";

/** Cargar un paciente que no usa la app: queda para la agenda y la historia clínica. */
export function AddManagedPatientForm() {
  const uid = useId();
  const router = useRouter();
  const [values, setValues] = useState({ name: "", contact: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="bg-card grid gap-3 rounded-2xl border p-5 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addManagedPatient(values);
          if (!res.ok) return setError(res.error);
          router.push(`/pro/pacientes/${res.data.id}`);
        });
      }}
    >
      <p className="text-muted-foreground text-sm sm:col-span-2">
        Para pacientes que no van a usar la app (o todavía no): les das turnos y llevás su historia
        clínica. Cuando quieras, desde su ficha lo invitás y todo pasa a su cuenta.
      </p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-name`}>Nombre</Label>
        <Input
          id={`${uid}-name`}
          value={values.name}
          maxLength={120}
          required
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-contact`}>Contacto (opcional)</Label>
        <Input
          id={`${uid}-contact`}
          value={values.contact}
          maxLength={300}
          placeholder="Teléfono o mail"
          onChange={(e) => setValues((v) => ({ ...v, contact: e.target.value }))}
        />
      </div>
      <FieldError>{error}</FieldError>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Agregar paciente"}
        </Button>
      </div>
    </form>
  );
}
