"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Muestra una contraseña temporal una sola vez, con botón para copiarla. */
export function TempPassword({ email, password }: { email: string; password: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="bg-primary-soft flex flex-col gap-2 rounded-2xl p-4 text-sm">
      <p>
        Contraseña temporal para <strong>{email}</strong>:
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="bg-card rounded-lg px-3 py-1.5 font-mono text-base">{password}</code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(password);
            setCopied(true);
          }}
        >
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? "Copiada" : "Copiar"}
        </Button>
      </div>
      <p className="text-muted-foreground">
        No la vas a poder ver de nuevo. Pasala por un canal seguro (no por el mismo email) y pedile
        que la cambie en Ajustes apenas ingrese.
      </p>
    </div>
  );
}
