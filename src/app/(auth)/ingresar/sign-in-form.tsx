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

export function SignInForm({
  next,
  googleEnabled,
}: {
  next: string | null;
  googleEnabled: boolean;
}) {
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
    router.replace(next ?? "/");
    router.refresh();
  }

  async function sendMagicLink() {
    setError(null);
    const ok = await form.trigger("email");
    if (!ok) return;
    const { error } = await signIn.magicLink({
      email: form.getValues("email"),
      callbackURL: next ?? "/",
    });
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
            <div className="flex items-baseline justify-between gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Link
                href="/recuperar"
                className="text-primary text-sm underline-offset-2 hover:underline"
              >
                ¿Te la olvidaste?
              </Link>
            </div>
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

        {googleEnabled && (
          <div className="flex flex-col gap-2 border-t pt-5">
            <Button
              variant="soft"
              type="button"
              onClick={() =>
                signIn.social({
                  provider: "google",
                  callbackURL: "/pro",
                  newUserCallbackURL: "/alta-profesional",
                  errorCallbackURL: "/ingresar?error=google",
                })
              }
            >
              <GoogleIcon /> Entrar con Google
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Solo para psicólogas y psicólogos. La primera vez te pedimos tu matrícula.
            </p>
          </div>
        )}

        <p className="text-muted-foreground text-center text-sm">
          ¿No tenés cuenta?{" "}
          <Link
            href={next ? `/registrarse?next=${encodeURIComponent(next)}` : "/registrarse"}
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Creala acá
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4">
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.8-3.8h-4v3.1A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
      />
    </svg>
  );
}
