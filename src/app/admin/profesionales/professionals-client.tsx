"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, KeyRound } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import {
  createProfessional,
  resetProfessionalPassword,
  verifyProfessional,
} from "@/lib/actions/admin";
import { createProfessionalSchema, type CreateProfessionalInput } from "@/lib/validation/admin";
import { JURISDICTIONS } from "@/lib/licenses";
import { TempPassword } from "../temp-password";

type Created = { email: string; tempPassword: string; name: string };

export function CreateProfessionalForm() {
  const [created, setCreated] = useState<Created | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CreateProfessionalInput>({
    resolver: zodResolver(createProfessionalSchema),
    defaultValues: { name: "", email: "", licenseJurisdiction: "ER", licenseNumber: "" },
  });
  const { errors, isSubmitting } = form.formState;

  return (
    <div className="flex flex-col gap-4">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={form.handleSubmit(async (values) => {
          setError(null);
          const res = await createProfessional(values);
          if (!res.ok) return setError(res.error);
          setCreated({ ...res.data, name: values.name });
          form.reset({
            name: "",
            email: "",
            licenseJurisdiction: values.licenseJurisdiction,
            licenseNumber: "",
          });
        })}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pro-name">Nombre (como lo van a ver sus pacientes)</Label>
          <Input
            id="pro-name"
            autoComplete="off"
            aria-invalid={!!errors.name}
            {...form.register("name")}
          />
          <FieldError>{errors.name?.message}</FieldError>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="pro-email">Email</Label>
          <Input
            id="pro-email"
            type="email"
            autoComplete="off"
            aria-invalid={!!errors.email}
            {...form.register("email")}
          />
          <FieldError>{errors.email?.message}</FieldError>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pro-jurisdiction">Dónde está matriculada</Label>
            <select
              id="pro-jurisdiction"
              className="border-input bg-card h-12 rounded-xl border px-3 text-base"
              {...form.register("licenseJurisdiction")}
            >
              {JURISDICTIONS.map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pro-license">Matrícula (opcional)</Label>
            <Input
              id="pro-license"
              inputMode="numeric"
              autoComplete="off"
              {...form.register("licenseNumber")}
            />
            <FieldError>{errors.licenseNumber?.message}</FieldError>
          </div>
        </div>
        <FieldError>{error}</FieldError>
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creando…" : "Crear cuenta"}
          </Button>
        </div>
      </form>
      {created && (
        <TempPassword
          kind="alta"
          name={created.name}
          email={created.email}
          password={created.tempPassword}
        />
      )}
    </div>
  );
}

export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<Omit<Created, "name"> | null>(null);

  if (result)
    return (
      <TempPassword kind="nueva" name={name} email={result.email} password={result.tempPassword} />
    );
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            `¿Generar una contraseña nueva para ${name}? La actual deja de funcionar y se cierran sus sesiones.`,
          )
        )
          return;
        start(async () => {
          const res = await resetProfessionalPassword(userId);
          if (!res.ok) return alert(res.error);
          setResult(res.data);
        });
      }}
    >
      <KeyRound aria-hidden /> {pending ? "Generando…" : "Nueva contraseña"}
    </Button>
  );
}

export function VerifyButton({ professionalId, name }: { professionalId: string; name: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="soft"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Ya revisaste la matrícula de ${name} con su colegio?`)) return;
        start(async () => {
          const res = await verifyProfessional(professionalId);
          if (!res.ok) alert(res.error);
        });
      }}
    >
      <BadgeCheck aria-hidden /> {pending ? "Guardando…" : "Marcar verificada"}
    </Button>
  );
}
