"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { cancelSubscription, startSubscription } from "@/lib/actions/billing";
import { cn } from "@/lib/utils";

export type PlanOption = {
  id: string;
  label: string;
  monthly: string;
  detail: string;
  discount: number;
};

/** Elegir plan y pasar a pagar a Mercado Pago. */
export function PlanPicker({
  plans,
  firstChargeNote,
}: {
  plans: PlanOption[];
  firstChargeNote: string | null;
}) {
  const [plan, setPlan] = useState("anual");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await startSubscription({ plan });
          if (!res.ok) return setError(res.error);
          window.location.href = res.data.url;
        });
      }}
    >
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">Elegí tu plan</legend>
        {plans.map((p) => (
          <label
            key={p.id}
            className={cn(
              "bg-card flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition-colors",
              "focus-within:ring-ring focus-within:ring-2",
              plan === p.id ? "border-primary" : "border-border hover:border-primary/40",
            )}
          >
            <input
              type="radio"
              name="plan"
              value={p.id}
              checked={plan === p.id}
              onChange={() => setPlan(p.id)}
              className="accent-primary size-5"
            />
            <span className="flex flex-1 flex-col">
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                {p.label}
                {p.discount > 0 && (
                  <span className="bg-sun-soft rounded-full px-2 py-0.5 text-xs font-semibold">
                    {p.discount} % menos
                  </span>
                )}
              </span>
              <span className="text-muted-foreground text-sm">{p.detail}</span>
            </span>
            <span className="text-right">
              <span className="block text-lg font-semibold tabular-nums">{p.monthly}</span>
              <span className="text-muted-foreground text-xs">por mes</span>
            </span>
          </label>
        ))}
      </fieldset>

      {firstChargeNote && <p className="text-sm">{firstChargeNote}</p>}
      <FieldError>{error}</FieldError>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Abriendo Mercado Pago…" : "Pagar con Mercado Pago"} <ExternalLink />
      </Button>
      <p className="text-muted-foreground text-center text-xs">
        En Mercado Pago elegís con qué pagar: tarjeta o dinero en cuenta. El débito es automático en
        cada período y lo podés cancelar cuando quieras desde acá.
      </p>
    </form>
  );
}

export function CancelPlanButton({ until }: { until: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `¿Cancelar tu plan? No se te va a cobrar más.${until ? ` Podés seguir usando el panel hasta el ${until}.` : ""} Tus pacientes y tus datos quedan como están.`,
            )
          )
            return;
          setError(null);
          start(async () => {
            const res = await cancelSubscription();
            if (!res.ok) return setError(res.error);
            router.refresh();
          });
        }}
      >
        {pending ? "Cancelando…" : "Cancelar plan"}
      </Button>
      <FieldError>{error}</FieldError>
    </div>
  );
}
