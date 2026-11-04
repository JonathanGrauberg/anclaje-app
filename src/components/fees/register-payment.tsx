"use client";

import { Check, HandCoins } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { createPayment } from "@/lib/actions/fees";
import { dayKey } from "@/lib/dates";
import { formatAmount, formatMoney, parseAmount, PAYMENT_METHODS } from "@/lib/fees";
import { cn } from "@/lib/utils";

export type PayService = { id: string; name: string; price: number };
/** patientId → (serviceId → precio especial) */
export type PatientPriceMap = Record<string, Record<string, number>>;

const OTHER = "__other";
const selectClass = "border-input bg-card h-11 rounded-xl border px-3 text-base";

/** Botón "Registrar cobro" que abre el formulario (con o sin el paciente ya elegido). */
export function RegisterPayment({
  patients,
  services,
  patientPrices,
  lastServices = {},
  fixedPatientId,
  variant = "default",
  size = "md",
}: {
  patients: { id: string; name: string }[];
  services: PayService[];
  patientPrices: PatientPriceMap;
  /** patientId → último servicio que se le cobró (se propone de nuevo). */
  lastServices?: Record<string, string>;
  fixedPatientId?: string;
  variant?: "default" | "soft" | "outline";
  size?: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);
  const fixed = fixedPatientId ? patients.find((p) => p.id === fixedPatientId) : undefined;
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant={variant} size={size}>
          <HandCoins aria-hidden /> Registrar cobro
        </Button>
      </SheetTrigger>
      <SheetContent
        title={fixed ? `Cobro de ${fixed.name}` : "Registrar cobro"}
        description="Queda solo para vos. El paciente no lo ve."
      >
        <PaymentForm
          patients={patients}
          services={services}
          patientPrices={patientPrices}
          lastServices={lastServices}
          fixedPatientId={fixedPatientId}
          onDone={() => setOpen(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function PaymentForm({
  patients,
  services,
  patientPrices,
  lastServices,
  fixedPatientId,
  onDone,
}: {
  patients: { id: string; name: string }[];
  services: PayService[];
  patientPrices: PatientPriceMap;
  lastServices: Record<string, string>;
  fixedPatientId?: string;
  onDone: () => void;
}) {
  const uid = useId();
  const today = dayKey(new Date());
  const [patientId, setPatientId] = useState(fixedPatientId ?? "");
  const serviceFor = (pid: string) => {
    const last = lastServices[pid];
    return services.some((x) => x.id === last) ? last : (services[0]?.id ?? OTHER);
  };
  const priceOf = (pid: string, sid: string) => {
    const s = services.find((x) => x.id === sid);
    if (!s) return null;
    return patientPrices[pid]?.[s.id] ?? s.price;
  };
  const [serviceId, setServiceId] = useState(() => serviceFor(fixedPatientId ?? ""));
  const [amount, setAmount] = useState(() => {
    const p = priceOf(fixedPatientId ?? "", serviceFor(fixedPatientId ?? ""));
    return p === null ? "" : formatAmount(p);
  });
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [paidOn, setPaidOn] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Al cambiar paciente o servicio, sugerimos el precio que corresponde (se puede cambiar).
  const suggest = (pid: string, sid: string) => {
    const p = priceOf(pid, sid);
    if (p !== null) setAmount(formatAmount(p));
  };

  const special = serviceId !== OTHER && patientPrices[patientId]?.[serviceId] !== undefined;

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-4 text-center" role="status">
        <span className="bg-primary-soft text-primary grid size-12 place-items-center rounded-full">
          <Check className="size-6" aria-hidden />
        </span>
        <p className="font-medium">Listo, anotamos {done}.</p>
        <div className="flex gap-2">
          <Button
            variant="soft"
            onClick={() => {
              setDone(null);
              if (!fixedPatientId) setPatientId("");
            }}
          >
            Registrar otro
          </Button>
          <Button variant="ghost" onClick={onDone}>
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const value = parseAmount(amount);
        if (!patientId) return setError("Elegí un paciente");
        if (!value) return setError("Escribí cuánto te pagó");
        start(async () => {
          const res = await createPayment({
            patientId,
            serviceId: serviceId === OTHER ? null : serviceId,
            amount: value,
            method,
            paidOn,
          });
          if (!res.ok) return setError(res.error);
          setError(null);
          setDone(formatMoney(value));
        });
      }}
    >
      {!fixedPatientId && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-patient`}>Paciente</Label>
          <select
            id={`${uid}-patient`}
            value={patientId}
            onChange={(e) => {
              const pid = e.target.value;
              const sid = lastServices[pid] ? serviceFor(pid) : serviceId;
              setPatientId(pid);
              setServiceId(sid);
              suggest(pid, sid);
            }}
            className={selectClass}
            required
          >
            <option value="">Elegí…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-service`}>¿Por qué?</Label>
        <select
          id={`${uid}-service`}
          value={serviceId}
          onChange={(e) => {
            setServiceId(e.target.value);
            suggest(patientId, e.target.value);
          }}
          className={selectClass}
        >
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
          <option value={OTHER}>Otro</option>
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-amount`}>¿Cuánto te pagó?</Label>
        <div className="relative">
          <span
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
            aria-hidden
          >
            $
          </span>
          <Input
            id={`${uid}-amount`}
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => {
              const v = parseAmount(amount);
              if (v) setAmount(formatAmount(v));
            }}
            className="pl-8 tabular-nums"
            aria-describedby={`${uid}-amount-hint`}
          />
        </div>
        <p id={`${uid}-amount-hint`} className="text-muted-foreground text-xs">
          {special ? "Es el precio especial de este paciente. " : ""}Si te pagó otro monto,
          cambialo.
        </p>
      </div>

      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">¿Cómo te pagó?</legend>
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={method === m.id}
              onClick={() => setMethod(m.id)}
              className={cn(
                "focus-visible:ring-ring/40 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:ring-3 focus-visible:outline-none",
                method === m.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted",
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-date`}>Fecha</Label>
        <Input
          id={`${uid}-date`}
          type="date"
          value={paidOn}
          max={today}
          onChange={(e) => setPaidOn(e.target.value)}
          required
        />
      </div>

      <FieldError>{error}</FieldError>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar cobro"}
      </Button>
    </form>
  );
}
