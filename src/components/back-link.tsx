import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * "Volver" a la pantalla madre. Va a una ruta fija (no al historial): si la pantalla se abrió
 * desde un aviso o un link, igual lleva a un lugar con sentido.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "text-muted-foreground hover:text-foreground hover:bg-muted -ml-2 inline-flex h-10 w-fit items-center gap-1 rounded-full pr-3 pl-1.5 text-sm font-medium transition-colors",
        className,
      )}
    >
      <ChevronLeft className="size-5" aria-hidden />
      <span className="sr-only">Volver a </span>
      {label}
    </Link>
  );
}
