import { LighthouseMark } from "@/components/logo";
import { BRAND, LIGHTHOUSE } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** Pantalla de carga: el faro con su luz girando. Sin movimiento si la persona lo pidió así. */
export function LighthouseLoader({
  label = "Cargando…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const { cx, cy } = LIGHTHOUSE.lamp;
  return (
    <div
      role="status"
      className={cn("flex flex-col items-center justify-center gap-3 py-16", className)}
    >
      <LighthouseMark className="size-20">
        <g className="lh-beam" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <path
            d={`M${cx} ${cy} L${cx + 34} ${cy - 8} Q${cx + 37} ${cy} ${cx + 34} ${cy + 8} Z`}
            fill={BRAND.light}
            opacity="0.45"
          />
        </g>
        <circle className="lh-glow" cx={cx} cy={cy} r="7.5" fill={BRAND.light} opacity="0.25" />
      </LighthouseMark>
      <p className="text-muted-foreground text-sm">{label}</p>
    </div>
  );
}
