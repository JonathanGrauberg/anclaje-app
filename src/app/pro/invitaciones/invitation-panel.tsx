"use client";

import { Check, Copy, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { createInvitation, deleteInvitation } from "@/lib/actions/invitations";
import { formatDate } from "@/lib/dates";

type Invitation = {
  id: string;
  code: string;
  rawCode: string;
  expiresAt: string;
  state: "pending" | "used" | "expired";
  usedBy: string | null;
};

const STATE_LABEL = { pending: "Sin usar", used: "Usada", expired: "Vencida" } as const;

export function InvitationPanel({
  invitations,
  baseUrl,
}: {
  invitations: Invitation[];
  baseUrl: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const linkFor = (inv: Invitation) => `${baseUrl}/vincular/${inv.rawCode}`;

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 2000);
    } catch {
      setError("No pudimos copiar. Seleccioná el texto y copialo a mano.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-card flex flex-col gap-3 rounded-2xl border p-5">
        <p className="text-muted-foreground text-sm">
          Pasale a tu paciente el link o el código. Al abrirlo va a leer el consentimiento informado
          y decidir si acepta. Hasta que no acepte, no ves nada.
        </p>
        <Button
          className="self-start"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await createInvitation();
              if (!res.ok) setError(res.error);
            })
          }
        >
          <Plus /> {pending ? "Generando…" : "Generar código"}
        </Button>
        <FieldError>{error}</FieldError>
      </div>

      {invitations.length > 0 && (
        <ul className="flex flex-col gap-2">
          {invitations.map((inv) => (
            <li
              key={inv.id}
              className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <code className="font-mono text-lg font-semibold tracking-widest">
                    {inv.code}
                  </code>
                  <Badge
                    className={inv.state === "pending" ? "bg-primary-soft text-primary" : undefined}
                  >
                    {STATE_LABEL[inv.state]}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                  {inv.state === "used"
                    ? `La usó ${inv.usedBy ?? "un paciente"}`
                    : inv.state === "expired"
                      ? `Venció el ${formatDate(new Date(inv.expiresAt))}`
                      : `Vence el ${formatDate(new Date(inv.expiresAt))}`}
                </p>
              </div>
              {inv.state === "pending" && (
                <div className="flex items-center gap-1">
                  <Button variant="soft" size="sm" onClick={() => copy(linkFor(inv), inv.id)}>
                    {copied === inv.id ? <Check /> : <Copy />}
                    {copied === inv.id ? "Copiado" : "Copiar link"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Borrar invitación ${inv.code}`}
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await deleteInvitation(inv.id);
                        if (!res.ok) setError(res.error);
                      })
                    }
                  >
                    <Trash2 />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
