import { BRAND, LIGHTHOUSE } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** El faro dibujado (sin texto). `children` se dibuja detrás, por ejemplo la luz que gira. */
export function LighthouseMark({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const L = LIGHTHOUSE;
  return (
    <svg viewBox="0 0 64 64" className={cn("text-primary overflow-visible", className)} aria-hidden>
      {children}
      <g fill="currentColor" stroke="currentColor" strokeLinejoin="round">
        <path d={L.roof} strokeWidth="1.2" />
        <rect {...L.gallery} stroke="none" />
        <path d={L.towerTop} strokeWidth="1" />
        <path d={L.towerBottom} strokeWidth="1" />
      </g>
      <circle {...L.lamp} fill={BRAND.light} />
      <path d={L.waves} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** Logo de .anclaje: el faro y, si se pide, el nombre (el punto dorado repite la luz del faro). */
export function Logo({ className, withText = false }: { className?: string; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LighthouseMark className={cn("size-8", className)} />
      {withText ? (
        <span className="text-lg font-semibold tracking-tight">
          {/* El punto es un punto de verdad (el de la tipografía), en dorado: como .budgets. */}
          <span style={{ color: BRAND.light }}>.</span>anclaje
        </span>
      ) : (
        <span className="sr-only">Anclaje</span>
      )}
    </span>
  );
}
