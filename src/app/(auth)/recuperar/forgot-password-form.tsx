"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });
  const { errors, isSubmitting } = form.formState;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <div>
          <h1 className="text-2xl font-semibold">¿Te olvidaste la contraseña?</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pasa. Escribí tu email y te mandamos un link para elegir una nueva.
          </p>
        </div>
        {sent ? (
          <p role="status" className="bg-primary-soft text-primary rounded-xl p-3 text-sm">
            Listo: si ese email tiene cuenta, te llega un link en unos minutos. Vence en 1 hora.
            Fijate también en la carpeta de spam.
          </p>
        ) : (
          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={form.handleSubmit(async ({ email }) => {
              setError(null);
              const { error } = await authClient.requestPasswordReset({
                email,
                redirectTo: "/recuperar/nueva",
              });
              // Por privacidad no decimos si el email tiene cuenta o no.
              if (error?.status === 429)
                return setError("Muchos intentos seguidos. Esperá un minuto y probá de nuevo.");
              setSent(true);
            })}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...form.register("email")}
              />
              <FieldError>{errors.email?.message}</FieldError>
            </div>
            <FieldError>{error}</FieldError>
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? "Mandando…" : "Mandame el link"}
            </Button>
          </form>
        )}
        <p className="text-center text-sm">
          <Link
            href="/ingresar"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Volver a ingresar
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
