"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

/** Cambiar la contraseña (cierra las otras sesiones abiertas). */
export function ChangePasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="bg-card flex flex-col gap-4 rounded-2xl border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setDone(false);
        if (next.length < 8)
          return setError("La nueva contraseña tiene que tener al menos 8 caracteres.");
        if (next.length > 128) return setError("La nueva contraseña es demasiado larga.");
        if (next !== confirm) return setError("Las contraseñas nuevas no coinciden.");
        start(async () => {
          const { error } = await authClient.changePassword({
            currentPassword: current,
            newPassword: next,
            revokeOtherSessions: true,
          });
          if (error) {
            return setError(
              error.status === 429
                ? "Muchos intentos seguidos. Esperá un minuto."
                : "La contraseña actual no es correcta.",
            );
          }
          setError(null);
          setDone(true);
          setCurrent("");
          setNext("");
          setConfirm("");
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-current">Contraseña actual</Label>
        <Input
          id="pw-current"
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-new">Contraseña nueva</Label>
        <Input
          id="pw-new"
          type="password"
          autoComplete="new-password"
          aria-describedby="pw-new-hint"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
        />
        <p id="pw-new-hint" className="text-muted-foreground text-xs">
          Al menos 8 caracteres. Se cierran tus otras sesiones abiertas.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-confirm">Repetí la contraseña nueva</Label>
        <Input
          id="pw-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      <FieldError>{error}</FieldError>
      {done && (
        <p role="status" className="text-primary text-sm">
          Listo, cambiaste tu contraseña.
        </p>
      )}
      <Button type="submit" className="self-start" disabled={pending || !current || !next}>
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </Button>
    </form>
  );
}
