"use client";

import { Check, Plus, Trash2 } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/input";
import { deleteServicePrice, saveServicePrice, setPatientPrice } from "@/lib/actions/fees";
import { formatAmount, formatMoney, parseAmount } from "@/lib/fees";
import { cn } from "@/lib/utils";

type Service = { id: string; name: string; price: number };

/** Input de monto que guarda solo al salir del campo (o con Enter). */
function MoneyInput({
  value,
  placeholder,
  label,
  onSave,
  allowEmpty = false,
}: {
  value: number | null;
  placeholder?: string;
  label: string;
  onSave: (v: number | null) => Promise<string | null>;
  allowEmpty?: boolean;
}) {
  const [text, setText] = useState(value === null ? "" : formatAmount(value));
  const [state, setState] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const commit = () => {
    const parsed = parseAmount(text);
    if (parsed === null && !allowEmpty) {
      setText(value === null ? "" : formatAmount(value));
      return;
    }
    setText(parsed === null ? "" : formatAmount(parsed));
    if (parsed === value) return;
    start(async () => {
      const err = await onSave(parsed);
      setError(err);
      setState(err ? "error" : "saved");
      if (!err) setTimeout(() => setState("idle"), 1500);
    });
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <span
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm"
          aria-hidden
        >
          $
        </span>
        <Input
          aria-label={label}
          inputMode="numeric"
          autoComplete="off"
          value={text}
          placeholder={placeholder}
          disabled={pending}
          aria-invalid={state === "error" || undefined}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="h-10 pr-8 pl-7 text-right tabular-nums"
        />
        {state === "saved" && (
          <Check
            className="text-primary absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
            aria-label="Guardado"
          />
        )}
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

/** Grilla de la lista de precios: se edita directo, cada cambio se guarda solo. */
export function PricesEditor({ services }: { services: Service[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      <div className="bg-card overflow-hidden rounded-2xl border">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground bg-muted/40 text-left">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                Servicio
              </th>
              <th scope="col" className="w-40 px-2 py-2 text-right font-medium sm:w-48">
                Precio
              </th>
              <th scope="col" className="w-12 px-2 py-2">
                <span className="sr-only">Borrar</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="px-2 py-1.5">
                  <NameInput service={s} />
                </td>
                <td className="px-2 py-1.5">
                  <MoneyInput
                    value={s.price}
                    label={`Precio de ${s.name}`}
                    onSave={async (price) => {
                      const res = await saveServicePrice({
                        id: s.id,
                        name: s.name,
                        price: price ?? 0,
                      });
                      return res.ok ? null : res.error;
                    }}
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Borrar ${s.name}`}
                    disabled={pending}
                    onClick={() => {
                      if (
                        !confirm(`¿Borrar "${s.name}" de tu lista? Los cobros ya anotados quedan.`)
                      )
                        return;
                      start(async () => {
                        const res = await deleteServicePrice(s.id);
                        setError(res.ok ? null : res.error);
                      });
                    }}
                  >
                    <Trash2 />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <NewServiceRow />
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}

function NameInput({ service }: { service: Service }) {
  const [name, setName] = useState(service.name);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <input
        aria-label="Nombre del servicio"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed === service.name) return;
          start(async () => {
            const res = await saveServicePrice({
              id: service.id,
              name: trimmed,
              price: service.price,
            });
            if (!res.ok) {
              setError(res.error);
              setName(service.name);
            } else setError(null);
          });
        }}
        className="focus-visible:border-ring focus-visible:ring-ring/25 hover:border-input w-full rounded-lg border border-transparent bg-transparent px-2 py-2 focus-visible:ring-3 focus-visible:outline-none"
      />
      <FieldError>{error}</FieldError>
    </div>
  );
}

function NewServiceRow() {
  const uid = useId();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="bg-muted/30 flex flex-wrap items-start gap-2 border-t p-3"
      onSubmit={(e) => {
        e.preventDefault();
        const value = parseAmount(price);
        if (value === null) return setError("Poné el precio");
        start(async () => {
          const res = await saveServicePrice({ name, price: value });
          if (!res.ok) return setError(res.error);
          setError(null);
          setName("");
          setPrice("");
        });
      }}
    >
      <Input
        id={`${uid}-name`}
        aria-label="Nuevo servicio"
        placeholder="Agregar otro (ej. Supervisión)"
        value={name}
        maxLength={80}
        onChange={(e) => setName(e.target.value)}
        className="h-10 min-w-0 flex-1 basis-48 text-sm"
      />
      <Input
        aria-label="Precio del nuevo servicio"
        placeholder="$ 0"
        inputMode="numeric"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        className="h-10 w-32 text-right text-sm tabular-nums"
      />
      <Button
        type="submit"
        variant="soft"
        size="sm"
        className="h-10"
        disabled={pending || !name.trim()}
      >
        <Plus /> Agregar
      </Button>
      {error && (
        <div className="basis-full">
          <FieldError>{error}</FieldError>
        </div>
      )}
    </form>
  );
}

/** Precios para un paciente: el de la lista y, si querés, uno especial para él. */
export function PatientPricesEditor({
  patientId,
  services,
  special,
}: {
  patientId: string;
  services: Service[];
  special: Record<string, number>;
}) {
  return (
    <div className="bg-card overflow-x-auto rounded-2xl border">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground bg-muted/40 text-left">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">
              Servicio
            </th>
            <th scope="col" className="hidden px-2 py-2 text-right font-medium sm:table-cell">
              Tu lista
            </th>
            <th scope="col" className="w-40 px-2 py-2 text-right font-medium sm:w-48">
              Para este paciente
            </th>
          </tr>
        </thead>
        <tbody>
          {services.map((s) => {
            const own = special[s.id];
            return (
              <tr key={s.id} className="border-t">
                <td className="px-4 py-1.5">
                  {s.name}
                  <span className="text-muted-foreground block text-xs sm:hidden">
                    Lista: {formatMoney(s.price)}
                  </span>
                </td>
                <td
                  className={cn(
                    "text-muted-foreground hidden px-2 py-1.5 text-right tabular-nums sm:table-cell",
                    own !== undefined && "line-through",
                  )}
                >
                  {formatMoney(s.price)}
                </td>
                <td className="px-2 py-1.5">
                  <MoneyInput
                    value={own ?? null}
                    allowEmpty
                    placeholder={formatAmount(s.price)}
                    label={`Precio de ${s.name} para este paciente`}
                    onSave={async (price) => {
                      const res = await setPatientPrice({ patientId, serviceId: s.id, price });
                      return res.ok ? null : res.error;
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
