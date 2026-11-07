"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { createLead } from "@/lib/actions/leads";
import { PROVINCES } from "@/lib/validation/leads";

const selectClass = "border-input bg-card h-11 rounded-xl border px-3 text-sm";

export function LeadForm() {
  const [v, setV] = useState({
    name: "",
    email: "",
    phone: "",
    province: "Entre Ríos",
    message: "",
    website: "",
  });
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) =>
    setV((s) => ({ ...s, [k]: e.target.value }));

  if (done) {
    return (
      <div
        role="status"
        className="bg-card flex flex-col items-center gap-3 rounded-3xl border p-8 text-center"
      >
        <CheckCircle2 className="text-primary size-10" aria-hidden />
        <p className="text-lg font-semibold">¡Gracias, {v.name.split(" ")[0]}!</p>
        <p className="text-muted-foreground max-w-sm">
          Te escribimos en estos días para mostrarte cómo funciona. Si no querés esperar, ya podés
          crear tu cuenta.
        </p>
        <Link
          href="/registrarse?tipo=profesional"
          className="bg-primary text-primary-foreground rounded-full px-5 py-2.5 font-semibold"
        >
          Crear mi cuenta
        </Link>
      </div>
    );
  }

  return (
    <form
      className="bg-card grid gap-4 rounded-3xl border p-6 sm:grid-cols-2 sm:p-8"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const res = await createLead({ ...v, consent: consent as true });
          if (!res.ok) return setError(res.error);
          setDone(true);
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-name">Nombre y apellido</Label>
        <Input
          id="lead-name"
          autoComplete="name"
          value={v.name}
          onChange={set("name")}
          required
          maxLength={120}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-email">Mail</Label>
        <Input
          id="lead-email"
          type="email"
          autoComplete="email"
          value={v.email}
          onChange={set("email")}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-phone">WhatsApp (opcional)</Label>
        <Input
          id="lead-phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          placeholder="343 …"
          value={v.phone}
          onChange={set("phone")}
          maxLength={40}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="lead-province">Provincia</Label>
        <select
          id="lead-province"
          className={selectClass}
          value={v.province}
          onChange={set("province")}
        >
          {PROVINCES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <Label htmlFor="lead-msg">¿Algo que quieras contarnos? (opcional)</Label>
        <Textarea
          id="lead-msg"
          rows={3}
          value={v.message}
          onChange={set("message")}
          maxLength={1000}
          placeholder="Por ejemplo, cuántos pacientes ves por semana o qué te gustaría resolver."
        />
      </div>
      {/* Trampa para bots: oculta para personas y lectores de pantalla. */}
      <div className="hidden" aria-hidden>
        <label htmlFor="lead-website">Sitio web</label>
        <input
          id="lead-website"
          tabIndex={-1}
          autoComplete="off"
          value={v.website}
          onChange={set("website")}
        />
      </div>
      <label className="flex items-start gap-3 text-sm sm:col-span-2">
        <input
          type="checkbox"
          className="accent-primary mt-1 size-4"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          required
        />
        <span>
          Acepto que el equipo de Anclaje me escriba para darme acceso. No compartimos tus datos con
          nadie.
        </span>
      </label>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <FieldError>{error}</FieldError>
        <Button type="submit" size="lg" disabled={pending} className="sm:w-fit">
          {pending ? "Enviando…" : "Quiero probar Anclaje"}
        </Button>
      </div>
    </form>
  );
}
