"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { signIn } from "@/lib/auth-client";
import { signInSchema, type SignInInput } from "@/lib/validation/auth";

export function SignInForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const form = useForm<SignInInput>({ resolver: zodResolver(signInSchema) });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: SignInInput) {
    setError(null);
    const { error } = await signIn.email(values);
    if (error) {
      setError(
        error.status === 429
          ? "Muchos intentos seguidos. Esperá un minuto y probá de nuevo."
          : "El email o la contraseña no coinciden.",
      );
      return;
    }
    router.replace("/");
    router.refresh();
  }

  async function sendMagicLink() {
    setError(null);
    const ok = await form.trigger("email");
    if (!ok) return;
    const { error } = await signIn.magicLink({ email: form.getValues("email"), callbackURL: "/" });
    if (error) {
      setError(
        error.status === 429
          ? "Muchos intentos seguidos. Esperá un minuto."
          : "No pudimos mandarte el link. ¿Ya tenés cuenta con ese email?",
      );
      return;
    }
    setMagicSent(true);
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <h1 className="text-2xl font-semibold">Hola de nuevo</h1>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            <FieldError>{errors.password?.message}</FieldError>
          </div>
          <FieldError>{error}</FieldError>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? "Entrando…" : "Entrar"}
          </Button>
        </form>

        {magicSent ? (
          <p role="status" className="bg-primary-soft text-primary rounded-xl p-3 text-sm">
            Listo: si el email tiene cuenta, te llega un link para entrar. Vence en 10 minutos.
          </p>
        ) : (
          <Button variant="ghost" onClick={sendMagicLink} type="button">
            <Mail /> Prefiero que me manden un link
          </Button>
        )}

        <p className="text-muted-foreground text-center text-sm">
          ¿No tenés cuenta?{" "}
          <Link
            href="/registrarse"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Creala acá
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
