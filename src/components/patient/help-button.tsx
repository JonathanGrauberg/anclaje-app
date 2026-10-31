"use client";

import { HeartHandshake, LifeBuoy, Phone } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DISCLAIMER } from "@/lib/constants";
import type { CrisisLineDTO } from "@/lib/queries/common";
import { telHref } from "@/lib/utils";

export function CrisisLineList({ lines }: { lines: CrisisLineDTO[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {lines.map((line) => (
        <li key={line.id}>
          <a
            href={telHref(line.phone)}
            className="bg-background hover:bg-muted flex items-center gap-4 rounded-2xl border p-4 transition-colors"
          >
            <span className="bg-danger-soft text-danger flex size-11 shrink-0 items-center justify-center rounded-full">
              <Phone className="size-5" aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="text-lg font-semibold tabular-nums">{line.phone}</span>
              <span className="text-sm">{line.name}</span>
              {(line.description || line.region) && (
                <span className="text-muted-foreground text-xs">
                  {[line.description, line.region].filter(Boolean).join(" · ")}
                </span>
              )}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Botón de ayuda urgente: fijo, discreto y siempre accesible. */
export function HelpButton({ lines }: { lines: CrisisLineDTO[] }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="bg-card/95 text-danger fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-lg backdrop-blur transition-transform hover:scale-[1.03]"
          aria-label="Ayuda urgente"
        >
          <LifeBuoy className="size-5" aria-hidden />
          Ayuda
        </button>
      </SheetTrigger>
      <SheetContent
        title="¿Necesitás ayuda ahora?"
        description="Si estás en peligro o sentís que no podés más, llamá. Es gratis y te atienden personas."
      >
        <CrisisLineList lines={lines} />
        <SheetClose asChild>
          <Button asChild variant="soft" size="lg" className="mt-4 w-full">
            <Link href="/app/plan-de-calma">
              <HeartHandshake /> Ver mi plan de calma
            </Link>
          </Button>
        </SheetClose>
        <p className="text-muted-foreground mt-4 text-xs leading-relaxed">{DISCLAIMER}</p>
      </SheetContent>
    </Sheet>
  );
}
