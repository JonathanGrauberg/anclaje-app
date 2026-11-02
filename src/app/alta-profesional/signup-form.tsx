"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { completeProfessionalSignup } from "@/lib/actions/professional-signup";
import { signOut } from "@/lib/auth-client";
import { JURISDICTIONS, type Jurisdiction } from "@/lib/licenses";

const selectClass = "border-input bg-card h-11 rounded-xl border px-3 text-sm";

export function ProfessionalSignupForm({
  defaultName,
  email,
}: {
  defaultName: string;
  email: string;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(defaultName);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction | "">("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [declaration, setDeclaration] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardContent className="p-6">
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              setError(null);
              const res = await completeProfessionalSignup({
                displayName,
                licenseJurisdiction: jurisdiction as Jurisdiction,
                licenseNumber,
                declaration: declaration as true,
              });
              if (!res.ok) return setError(res.error);
              router.replace("/pro");
              router.refresh();
            });
          }}
        >
          <p className="text-muted-foreground text-sm">
            Entraste con <span className="text-foreground font-medium">{email}</span>.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pro-name">Cómo te ven tus pacientes</Label>
            <Input
              id="pro-name"
              value={displayName}
              maxLength={120}
              placeholder="Lic. Nombre Apellido"
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
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
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pro-license">Número de matrícula</Label>
              <Input
                id="pro-license"
                inputMode="numeric"
                autoComplete="off"
                value={licenseNumber}
                maxLength={30}
                onChange={(e) => setLicenseNumber(e.target.value)}
                required
              />
            </div>
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
            {pending ? "Guardando…" : "Entrar al panel"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={async () => {
              await signOut();
              router.replace("/ingresar");
            }}
          >
            No soy profesional, salir
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
