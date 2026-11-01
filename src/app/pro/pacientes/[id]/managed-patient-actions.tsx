"use client";

import { Check, Copy, Pencil, UserMinus, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { createInvitation } from "@/lib/actions/invitations";
import { removeManagedPatient, updateManagedPatient } from "@/lib/actions/patients";
import { formatCode } from "@/lib/invitations";

/** Paciente sin la app: invitarlo (sus turnos e historia pasan a su cuenta) o editar sus datos. */
export function ManagedPatientActions({
  patientId,
  name,
  contact,
  baseUrl,
}: {
  patientId: string;
  name: string;
  contact: string;
  baseUrl: string;
}) {
  const uid = useId();
  const router = useRouter();
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({ name, contact });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const link = code ? `${baseUrl}/vincular/${code}` : "";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null);
              const res = await createInvitation(patientId);
              if (!res.ok) return setError(res.error);
              setCode(res.data.code);
            })
          }
        >
          <UserPlus /> Invitar a la app
        </Button>
        <Button
          size="sm"
          variant="soft"
          aria-expanded={editing}
          onClick={() => setEditing((e) => !e)}
        >
          <Pencil /> Editar datos
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (
              !confirm(
                `¿Dar de baja a ${name}? Se cancelan sus turnos futuros. Si tiene historia clínica, se guarda y lo podés reactivar desde "Agregar paciente"; si no, se borra.`,
              )
            )
              return;
            start(async () => {
              const res = await removeManagedPatient(patientId);
              if (!res.ok) return setError(res.error);
              router.push(res.data.archived ? "/pro?baja=archivado" : "/pro?baja=borrado");
            });
          }}
        >
          <UserMinus /> Dar de baja
        </Button>
      </div>

      {code && (
        <div className="bg-card flex flex-col gap-2 rounded-2xl border p-4 text-sm" role="status">
          <p>
            Pasale este código o el link a {name}. Cuando cree su cuenta y acepte, sus turnos y su
            historia clínica quedan en su cuenta. Vence en 7 días.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="font-mono text-lg font-semibold tracking-widest">
              {formatCode(code)}
            </code>
            <Button
              size="sm"
              variant="soft"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setError("No pudimos copiar. Seleccioná el link y copialo a mano.");
                }
              }}
            >
              {copied ? <Check /> : <Copy />} {copied ? "Copiado" : "Copiar link"}
            </Button>
          </div>
          <p className="text-muted-foreground break-all">{link}</p>
        </div>
      )}

      {editing && (
        <form
          className="bg-card grid max-w-xl gap-3 rounded-2xl border p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await updateManagedPatient({ patientId, ...values });
              if (!res.ok) return setError(res.error);
              setError(null);
              setEditing(false);
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-name`}>Nombre</Label>
            <Input
              id={`${uid}-name`}
              value={values.name}
              maxLength={120}
              required
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${uid}-contact`}>Contacto (opcional)</Label>
            <Input
              id={`${uid}-contact`}
              value={values.contact}
              maxLength={300}
              placeholder="Teléfono o mail"
              onChange={(e) => setValues((v) => ({ ...v, contact: e.target.value }))}
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </form>
      )}
      <FieldError>{error}</FieldError>
    </div>
  );
}
