"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { signUpProfessional } from "@/lib/actions/professional-signup";
import { signIn } from "@/lib/auth-client";
import { JURISDICTIONS, type Jurisdiction } from "@/lib/licenses";

const selectClass = "border-input bg-card h-11 rounded-xl border px-3 text-sm";

/** Alta de una profesional: sus datos, su matrícula y su contraseña. Entra directo al panel. */
export function ProSignUpForm() {
  const router = useRouter();
  const [v, setV] = useState({
    fullName: "",
    displayName: "",
    email: "",
    password: "",
    confirm: "",
    licenseNumber: "",
  });
  const [displayTouched, setDisplayTouched] = useState(false);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | "">("");
  const [declaration, setDeclaration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setV((s) => ({
      ...s,
      [k]: value,
      // Sugerimos "Lic. Nombre Apellido" mientras no lo cambie a mano.
      ...(k === "fullName" && !displayTouched && { displayName: value ? `Lic. ${value}` : "" }),
    }));
    if (k === "displayName") setDisplayTouched(true);
  };

  const field = (
    k: keyof typeof v,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
    hint?: string,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`pro-${k}`}>{label}</Label>
      <Input
        id={`pro-${k}`}
        value={v[k]}
        onChange={set(k)}
        aria-describedby={hint ? `pro-${k}-hint` : undefined}
        required
        {...props}
      />
      {hint && (
        <p id={`pro-${k}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
    </div>
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-5 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Creá tu cuenta profesional</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Te lleva un minuto. Después invitás a tus pacientes desde tu panel.
          </p>
        </div>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setError(null);
              const res = await signUpProfessional({
                ...v,
                licenseJurisdiction: jurisdiction as Jurisdiction,
                declaration: declaration as true,
              });
              if (!res.ok) return setError(res.error);
              const { error: signInError } = await signIn.email({
                email: res.data.email,
                password: v.password,
              });
              router.replace(signInError ? "/ingresar" : "/pro");
              router.refresh();
            });
          }}
        >
          {field("fullName", "Nombre y apellido", { autoComplete: "name", maxLength: 120 })}
          {field(
            "displayName",
            "Cómo te ven tus pacientes",
            { maxLength: 120, placeholder: "Lic. Nombre Apellido" },
            "Puede ser tu nombre con el título o como te dicen en consultorio.",
          )}
          {field("email", "Email", { type: "email", autoComplete: "email" })}
          {field(
            "password",
            "Contraseña",
            { type: "password", autoComplete: "new-password", minLength: 8 },
            "Al menos 8 caracteres.",
          )}
          {field("confirm", "Repetí la contraseña", {
            type: "password",
            autoComplete: "new-password",
          })}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pro-jurisdiction">Matriculada/o en</Label>
              <select
                id="pro-jurisdiction"
                className={selectClass}
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
                required
              >
                <option value="">Elegí…</option>
                {JURISDICTIONS.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            {field("licenseNumber", "Número de matrícula", {
              inputMode: "numeric",
              autoComplete: "off",
              maxLength: 30,
            })}
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              className="accent-primary mt-1 size-4"
              checked={declaration}
              onChange={(e) => setDeclaration(e.target.checked)}
              required
            />
            <span>
              Declaro que soy psicóloga/o, que la matrícula es mía y está vigente. Sé que el equipo
              de Anclaje la puede verificar con el colegio.
            </span>
          </label>
          <FieldError>{error}</FieldError>
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Creando tu cuenta…" : "Crear mi cuenta"}
          </Button>
        </form>
        <p className="text-muted-foreground text-center text-sm">
          ¿Ya tenés cuenta?{" "}
          <Link
            href="/ingresar"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Ingresá
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
