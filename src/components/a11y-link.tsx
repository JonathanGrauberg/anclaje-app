import { Accessibility } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Botón al lado de la luna que lleva a /accesibilidad (letra, contraste, animaciones). */
export function A11yLink({ className }: { className?: string }) {
  return (
    <Link
      href="/accesibilidad"
      aria-label="Accesibilidad"
      title="Accesibilidad"
      className={cn(
        "hover:bg-muted focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      <Accessibility className="size-[1.15rem]" aria-hidden />
    </Link>
  );
}
