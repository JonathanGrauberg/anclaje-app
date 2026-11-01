"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation/auth";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });
  const { errors, isSubmitting } = form.formState;

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <h1 className="text-2xl font-semibold">Elegí una contraseña nueva</h1>
        <form
          noValidate
          className="flex flex-col gap-4"
          onSubmit={form.handleSubmit(async ({ password }) => {
            setError(null);
            const { error } = await authClient.resetPassword({ newPassword: password, token });
            if (error) {
              return setError(
                error.status === 429
                  ? "Muchos intentos seguidos. Esperá un minuto."
                  : "El link venció o ya se usó. Pedí uno nuevo desde “¿Te la olvidaste?”.",
              );
            }
            router.replace("/ingresar?contrasena=cambiada");
          })}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña nueva</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm">Repetila</Label>
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={!!errors.confirm}
              {...form.register("confirm")}
            />
            <FieldError>{errors.confirm?.message}</FieldError>
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : "Guardar contraseña"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
