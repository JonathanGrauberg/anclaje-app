"use client";

import { BookHeart, CalendarDays, House, Settings } from "lucide-react";
import { motion, MotionConfig } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Inicio", icon: House },
  { href: "/app/diario", label: "Diario", icon: BookHeart },
  { href: "/app/turnos", label: "Turnos", icon: CalendarDays },
  { href: "/app/ajustes", label: "Ajustes", icon: Settings },
];

// Medidas de la barra (px). La muesca es un círculo recortado del borde de arriba con una máscara,
// y el círculo dorado de la sección activa flota adentro. Las dos cosas se mueven con un resorte.
const SLOT = 64;
const PAD = 12;
const BAR_W = items.length * SLOT + PAD * 2;
const BAR_H = 58;
const BUBBLE = 48;
const BUBBLE_TOP = -18; // cuánto sobresale el círculo por arriba de la barra
const NOTCH_R = 31;
const spring = { type: "spring", stiffness: 380, damping: 32 } as const;

/** Barra del diseño "nuevo": angosta y flotante, con muesca que sigue a la sección activa. */
export function BottomNav() {
  const pathname = usePathname();
  const activeIndex = items.findIndex(({ href }) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href),
  );
  const hasActive = activeIndex >= 0;
  const cx = PAD + SLOT * Math.max(activeIndex, 0) + SLOT / 2;
  const notchY = BUBBLE_TOP + BUBBLE / 2;

  return (
    <MotionConfig reducedMotion="user">
      <nav
        aria-label="Secciones"
        className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex justify-center"
      >
        <div className="pointer-events-auto relative" style={{ width: BAR_W, height: BAR_H }}>
          {/* La barra, con el recorte */}
          <motion.div
            aria-hidden
            className="bg-block-night dark:bg-block-forest absolute inset-0 rounded-[1.6rem] shadow-[0_14px_30px_-12px_rgba(15,25,24,0.55)]"
            initial={false}
            animate={{ "--notch-x": `${cx}px` } as Record<string, string>}
            transition={spring}
            style={
              hasActive
                ? {
                    maskImage: `radial-gradient(circle ${NOTCH_R}px at var(--notch-x) ${notchY}px, transparent ${NOTCH_R - 0.5}px, #000 ${NOTCH_R}px)`,
                    WebkitMaskImage: `radial-gradient(circle ${NOTCH_R}px at var(--notch-x) ${notchY}px, transparent ${NOTCH_R - 0.5}px, #000 ${NOTCH_R}px)`,
                  }
                : undefined
            }
          />

          {/* El círculo dorado de la sección activa */}
          {hasActive && (
            <motion.span
              aria-hidden
              className="bg-block-sun text-block-sun-foreground pointer-events-none absolute left-0 flex items-center justify-center rounded-full shadow-md"
              style={{ width: BUBBLE, height: BUBBLE, top: BUBBLE_TOP }}
              initial={false}
              animate={{ x: cx - BUBBLE / 2 }}
              transition={spring}
            >
              {(() => {
                const Icon = items[activeIndex].icon;
                return <Icon className="size-5" />;
              })()}
            </motion.span>
          )}

          <ul className="relative flex h-full" style={{ paddingInline: PAD }}>
            {items.map(({ href, label, icon: Icon }, i) => {
              const active = i === activeIndex;
              return (
                <li key={href} style={{ width: SLOT }}>
                  <Link
                    href={href}
                    aria-label={label}
                    aria-current={active ? "page" : undefined}
                    className="focus-visible:ring-block-sun flex h-full flex-col items-center justify-center rounded-2xl text-white/70 transition-colors outline-none hover:text-white focus-visible:ring-2"
                  >
                    {active ? (
                      // El ícono está en el círculo; acá queda el nombre, debajo de la muesca.
                      <span className="mt-auto mb-2 text-[11px] font-semibold text-white">
                        {label}
                      </span>
                    ) : (
                      <Icon className={cn("size-[1.2rem]")} aria-hidden />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </MotionConfig>
  );
}
