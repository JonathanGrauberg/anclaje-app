import { LighthouseMark } from "@/components/logo";
import { BRAND, LIGHTHOUSE } from "@/lib/brand";

/** El faro grande de la portada, con la luz barriendo (la misma animación que la carga). */
export function HeroLighthouse() {
  const { cx, cy } = LIGHTHOUSE.lamp;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px]" aria-hidden>
      <div className="bg-sun-soft absolute inset-[12%] rounded-full blur-3xl" />
      <div className="bg-sky-soft absolute inset-x-[4%] bottom-[6%] h-1/3 rounded-full blur-2xl" />
      <LighthouseMark className="relative size-full">
        <g className="lh-beam" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          <path
            d={`M${cx} ${cy} L${cx + 46} ${cy - 13} Q${cx + 50} ${cy} ${cx + 46} ${cy + 13} Z`}
            fill={BRAND.light}
            opacity="0.38"
          />
        </g>
        <circle className="lh-glow" cx={cx} cy={cy} r="8" fill={BRAND.light} opacity="0.3" />
      </LighthouseMark>
    </div>
  );
}
