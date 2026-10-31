"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { ActionResult } from "@/lib/actions/result";

/** Borrar con confirmación. */
export function DeleteButton({
  action,
  what = "este registro",
  redirectTo,
}: {
  action: () => Promise<ActionResult<unknown>>;
  what?: string;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Borrar ${what}`}>
          <Trash2 />
        </Button>
      </SheetTrigger>
      <SheetContent title={`¿Borrar ${what}?`} description="No se puede deshacer.">
        <FieldError>{error}</FieldError>
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await action();
                if (!res.ok) return setError(res.error);
                setOpen(false);
                if (redirectTo) router.push(redirectTo);
              })
            }
          >
            {pending ? "Borrando…" : "Sí, borrar"}
          </Button>
          <SheetClose asChild>
            <Button variant="outline" size="lg" className="flex-1">
              Cancelar
            </Button>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  );
}
