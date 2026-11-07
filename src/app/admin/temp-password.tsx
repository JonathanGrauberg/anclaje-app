"use client";

import { Check, Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { accessMessage, type AccessMessageKind } from "@/lib/admin-messages";

/**
 * Muestra una contraseña temporal una sola vez, con botones para copiarla sola o dentro de un
 * mensaje listo para mandar por WhatsApp.
 */
export function TempPassword({
  email,
  password,
  name,
  kind,
}: {
  email: string;
  password: string;
  name: string;
  kind: AccessMessageKind;
}) {
  const [copied, setCopied] = useState<"pw" | "msg" | null>(null);
  // Solo se monta después de crear la cuenta o generar la contraseña (nunca en el servidor).
  const origin = window.location.origin;
  const message = (pw = password) => accessMessage({ kind, name, email, password: pw, origin });

  async function copy(what: "pw" | "msg") {
    await navigator.clipboard.writeText(what === "pw" ? password : message());
    setCopied(what);
  }

  return (
    <div role="status" className="bg-primary-soft flex flex-col gap-3 rounded-2xl p-4 text-sm">
      <p>
        Contraseña temporal para <strong>{email}</strong>:
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="bg-card rounded-lg px-3 py-1.5 font-mono text-base">{password}</code>
        <Button type="button" size="sm" variant="outline" onClick={() => copy("pw")}>
          {copied === "pw" ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied === "pw" ? "Copiada" : "Copiar"}
        </Button>
        <Button type="button" size="sm" onClick={() => copy("msg")}>
          {copied === "msg" ? <Check aria-hidden /> : <MessageCircle aria-hidden />}
          {copied === "msg" ? "Mensaje copiado" : "Copiar mensaje para WhatsApp"}
        </Button>
      </div>
      <details className="bg-card rounded-xl px-3 py-2">
        <summary className="cursor-pointer font-medium">Ver el mensaje</summary>
        <p className="mt-2 whitespace-pre-line">
          {message("••••••")}
        </p>
      </details>
      <p className="text-muted-foreground">
        No la vas a poder ver de nuevo. Pasala por WhatsApp u otro canal que no sea el mismo email.
        El mensaje ya le pide que la cambie en Ajustes cuando entre.
      </p>
    </div>
  );
}
