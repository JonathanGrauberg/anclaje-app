"use client";

import { Check, Mail, MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { sendLeadSignupLink } from "@/lib/actions/leads";
import { signupMessage } from "@/lib/admin-messages";

/**
 * Para un interesado: mandarle desde Anclaje el mail con el link para crear su cuenta, o copiar
 * el mismo mensaje para WhatsApp.
 */
export function SignupLink({
  leadId,
  name,
  sentAt,
}: {
  leadId: string;
  name: string;
  sentAt: string | null;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <Button
          size="sm"
          variant={sentAt ? "outline" : "default"}
          disabled={pending}
          onClick={() => {
            if (sentAt && !confirm("Ya le mandaste el mail. ¿Mandarlo de nuevo?")) return;
            start(async () => {
              setError(null);
              const res = await sendLeadSignupLink(leadId);
              if (!res.ok) setError(res.error);
            });
          }}
        >
          <Mail aria-hidden />
          {pending ? "Mandando…" : sentAt ? "Mandar de nuevo" : "Mandar mail para crear cuenta"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const url = `${window.location.origin}/registrarse?tipo=profesional`;
            await navigator.clipboard.writeText(signupMessage({ name, url }));
            setCopied(true);
          }}
        >
          {copied ? <Check aria-hidden /> : <MessageCircle aria-hidden />}
          {copied ? "Copiado" : "Copiar para WhatsApp"}
        </Button>
      </div>
      {sentAt && <p className="text-muted-foreground text-xs">Mail enviado el {sentAt}.</p>}
      {error && <p className="text-danger text-xs">{error}</p>}
    </div>
  );
}
