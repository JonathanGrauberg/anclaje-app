"use client";

import { MailCheck } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { requestAppointment } from "@/lib/actions/appointment-requests";
import { cn } from "@/lib/utils";

type Modality = "IN_PERSON" | "ONLINE" | "ANY";

export function RequestForm({
  slug,
  inPerson,
  online,
  name: proName,
}: {
  slug: string;
  inPerson: boolean;
  online: boolean;
  name: string;
}) {
  const uid = useId();
  const [v, setV] = useState({ name: "", email: "", phone: "", message: "", website: "" });
  const [modality, setModality] = useState<Modality>("ANY");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const field = (k: keyof typeof v) => ({
    id: `${uid}-${k}`,
    value: v[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setV((x) => ({ ...x, [k]: e.target.value })),
  });

  if (sentTo)
    return (
      <div role="status" className="bg-primary-soft flex flex-col gap-2 rounded-2xl p-4 text-sm">
        <p className="text-primary flex items-center gap-2 font-semibold">
          <MailCheck className="size-5" aria-hidden /> Falta un paso
        </p>
        <p>
          Te mandamos un mail a <strong>{sentTo}</strong>. Tocá el link para confirmar y tu
          solicitud le llega a {proName}. Si no lo ves, revisá Spam o Promociones.
        </p>
      </div>
    );

  const both = inPerson && online;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await requestAppointment({
            slug,
            ...v,
            modality,
            consent: consent as true,
          });
          if (!res.ok) return setError(res.error);
          setSentTo(v.email.trim());
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-name`}>Tu nombre</Label>
        <Input {...field("name")} autoComplete="name" maxLength={120} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-email`}>Tu mail</Label>
        <Input {...field("email")} type="email" autoComplete="email" maxLength={200} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-phone`}>Teléfono (opcional)</Label>
        <Input {...field("phone")} type="tel" autoComplete="tel" maxLength={40} />
      </div>
      {both && (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">¿Cómo preferís?</legend>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["ANY", "Me da igual"],
                ["IN_PERSON", "Presencial"],
                ["ONLINE", "Online"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                aria-pressed={modality === id}
                onClick={() => setModality(id)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm",
                  modality === id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-message`}>Mensaje (opcional)</Label>
        <Textarea
          {...field("message")}
          maxLength={600}
          className="min-h-20"
          placeholder="Días u horarios que te quedan bien. No hace falta contar el motivo."
        />
      </div>
      {/* Trampa para bots: invisible para las personas. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label>
          No completar
          <input tabIndex={-1} autoComplete="off" {...field("website")} />
        </label>
      </div>
      <label className="flex cursor-pointer items-start gap-2 text-xs">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="accent-primary mt-0.5 size-4 shrink-0"
        />
        <span>Acepto que Anclaje le mande estos datos a {proName} para que me contacte.</span>
      </label>
      <FieldError>{error}</FieldError>
      <Button type="submit" size="lg" disabled={pending || !consent}>
        {pending ? "Enviando…" : "Pedir turno"}
      </Button>
    </form>
  );
}
