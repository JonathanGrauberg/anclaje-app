"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { signUp } from "@/lib/auth-client";
import { signUpSchema, type SignUpInput } from "@/lib/validation/auth";

export function SignUpForm({ next }: { next: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit({ name, email, password }: SignUpInput) {
    setError(null);
    const { error } = await signUp.email({ name, email, password });
    if (error) {
      setError(
        error.status === 429
          ? "Muchos intentos seguidos. Esperá un minuto."
          : error.code === "USER_ALREADY_EXISTS" ||
              error.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL"
            ? "Ya hay una cuenta con ese email. ¿Querés ingresar?"
            : "No pudimos crear la cuenta. Probá de nuevo en un rato.",
      );
      return;
    }
    router.replace(next ?? "/app");
    router.refresh();
  }

  const field = (
    id: keyof SignUpInput,
    label: string,
    type: string,
    autoComplete: string,
    hint?: string,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        aria-invalid={!!errors[id]}
        aria-describedby={hint ? `${id}-hint` : undefined}
        {...form.register(id)}
      />
      {hint && (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      <FieldError>{errors[id]?.message}</FieldError>
    </div>
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Creá tu cuenta</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Lo que escribas es tuyo. Vos decidís qué compartir con tu psicóloga.
          </p>
        </div>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
          {field("name", "¿Cómo te gusta que te digan?", "text", "given-name")}
          {field("email", "Email", "email", "email")}
          {field("password", "Contraseña", "password", "new-password", "Al menos 8 caracteres.")}
          {field("confirm", "Repetí la contraseña", "password", "new-password")}
          <FieldError>{error}</FieldError>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Creando…" : "Crear cuenta"}
          </Button>
        </form>
        <p className="text-muted-foreground text-center text-sm">
          ¿Ya tenés cuenta?{" "}
          <Link
            href={next ? `/ingresar?next=${encodeURIComponent(next)}` : "/ingresar"}
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Ingresá
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
