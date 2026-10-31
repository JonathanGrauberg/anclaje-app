import { cn } from "@/lib/utils";

/** Logo: una flor de seis pétalos con los colores de la rueda. */
export function Logo({ className, withText = false }: { className?: string; withText?: boolean }) {
  const colors = ["#F5A9BC", "#A9D9B4", "#C6B5E6", "#FFC690", "#F9E08A", "#C8CED8"];
  return (
    <span className="inline-flex items-center gap-2">
      <svg viewBox="0 0 64 64" className={cn("size-8", className)} aria-hidden>
        {colors.map((c, i) => (
          <ellipse
            key={c}
            cx="32"
            cy="17"
            rx="10"
            ry="15"
            fill={c}
            opacity="0.92"
            transform={`rotate(${i * 60} 32 32)`}
          />
        ))}
        <circle cx="32" cy="32" r="7" fill="var(--card)" />
      </svg>
      {withText && <span className="text-lg font-semibold tracking-tight">Sentir</span>}
      {!withText && <span className="sr-only">Sentir</span>}
    </span>
  );
}
