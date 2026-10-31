"use client";

import { Download, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { deleteMyAccount } from "@/lib/actions/account";

export function DataSection() {
  return (
    <div className="bg-card flex flex-col gap-4 rounded-2xl border p-4">
      <div className="flex flex-col gap-2">
        <p className="font-medium">Descargar mis datos</p>
        <p className="text-muted-foreground text-sm">
          Todo lo que registraste y recibiste en Sentir. El PDF es para leer; el JSON sirve para
          llevarlo a otro lado. Ojo: el archivo no está protegido, guardalo en un lugar seguro.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="soft" size="sm">
            <a href="/app/ajustes/exportar?formato=pdf" download>
              <Download /> PDF
            </a>
          </Button>
          <Button asChild variant="soft" size="sm">
            <a href="/app/ajustes/exportar?formato=json" download>
              <Download /> JSON
            </a>
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t pt-4">
        <p className="font-medium">Borrar mi cuenta</p>
        <p className="text-muted-foreground text-sm">
          Se borra todo: tus registros, tu diario, lo que compartiste y tu vínculo con tu psicóloga.
          No se puede deshacer.
        </p>
        <DeleteAccountButton />
      </div>
    </div>
  );
}

function DeleteAccountButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="self-start">
          <Trash2 /> Borrar mi cuenta
        </Button>
      </SheetTrigger>
      <SheetContent
        title="¿Borrar tu cuenta para siempre?"
        description="Se borran todos tus registros, tu diario, tus autorregistros, las devoluciones, el plan de calma y tus respuestas. Tu psicóloga deja de ver todo. Si querés guardar algo, descargá tus datos antes."
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await deleteMyAccount({ password, confirmation });
              if (!res.ok) return setError(res.error);
              router.replace("/ingresar?cuenta=borrada");
              router.refresh();
            });
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="del-password">Tu contraseña</Label>
            <Input
              id="del-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="del-confirm">
              Escribí <strong>BORRAR</strong> para confirmar
            </Label>
            <Input
              id="del-confirm"
              autoComplete="off"
              autoCapitalize="characters"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              required
            />
          </div>
          <FieldError>{error}</FieldError>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              type="submit"
              variant="danger"
              size="lg"
              className="flex-1"
              disabled={pending || confirmation !== "BORRAR" || !password}
            >
              {pending ? "Borrando…" : "Borrar mi cuenta"}
            </Button>
            <SheetClose asChild>
              <Button type="button" variant="outline" size="lg" className="flex-1">
                Cancelar
              </Button>
            </SheetClose>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
