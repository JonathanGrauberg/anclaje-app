// Dibujos 2D del diseño "nuevo": la misma familia que las fotos de la landing (el sillón verde,
// la mesita, la lámpara, las plantas, el faro), en plano. Son decorativos: siempre aria-hidden.
// Usan colores fijos porque van sobre bloques de color que ya cambian con el modo oscuro.
import { BRAND, LIGHTHOUSE } from "@/lib/brand";
import { cn } from "@/lib/utils";

const C = {
  green: "#4f786e",
  greenDark: "#3d6259",
  greenLight: "#6b958a",
  night: "#1e3331",
  sage: "#a9ccc1",
  cream: "#f6efe3",
  paper: "#fffdf8",
  wood: "#c48f5e",
  woodDark: "#9c6c42",
  gold: BRAND.light,
  orange: "#f5a524",
  leaf: "#5e9a6e",
  leafDark: "#3f7a52",
  pot: "#e9dccb",
};

type Props = { className?: string };

/** El sillón verde con su almohadón, la mesita con la lámpara y una planta. */
export function ArmchairScene({ className }: Props) {
  return (
    <svg viewBox="0 0 220 140" className={cn("overflow-visible", className)} aria-hidden>
      <ellipse cx="112" cy="132" rx="98" ry="6" fill="#000" opacity="0.08" />
      {/* planta */}
      <path d="M14 104 h30 l-4 28 h-22 z" fill={C.pot} />
      <path d="M29 104 C 18 88, 6 82, 4 66 C 18 70, 27 84, 29 104 Z" fill={C.leaf} />
      <path d="M29 104 C 32 84, 26 64, 34 48 C 42 64, 36 86, 29 104 Z" fill={C.leafDark} />
      <path d="M29 104 C 38 92, 50 86, 56 72 C 44 74, 34 88, 29 104 Z" fill={C.leaf} />
      {/* sillón */}
      <rect x="62" y="122" width="6" height="12" rx="2" fill={C.woodDark} />
      <rect x="146" y="122" width="6" height="12" rx="2" fill={C.woodDark} />
      <rect x="66" y="40" width="82" height="62" rx="24" fill={C.green} />
      <rect x="62" y="98" width="90" height="26" rx="10" fill={C.greenDark} />
      <rect x="72" y="88" width="70" height="18" rx="8" fill={C.greenLight} />
      <rect x="52" y="72" width="24" height="52" rx="12" fill={C.greenDark} />
      <rect x="138" y="72" width="24" height="52" rx="12" fill={C.greenDark} />
      <rect
        x="88"
        y="62"
        width="38"
        height="28"
        rx="10"
        fill={C.cream}
        transform="rotate(-8 107 76)"
      />
      <circle cx="107" cy="76" r="4" fill={C.orange} />
      {/* mesita y lámpara */}
      <rect x="172" y="96" width="40" height="6" rx="3" fill={C.wood} />
      <rect x="178" y="102" width="4" height="30" rx="2" fill={C.woodDark} />
      <rect x="202" y="102" width="4" height="30" rx="2" fill={C.woodDark} />
      <rect x="190" y="66" width="3" height="30" fill={C.night} />
      <rect x="182" y="93" width="20" height="4" rx="2" fill={C.night} />
      <circle cx="191.5" cy="66" r="14" fill={C.gold} opacity="0.25" />
      <path d="M178 66 L184 46 H199 L205 66 Z" fill={C.cream} />
    </svg>
  );
}

/** Cuaderno abierto con una lapicera (el diario). */
export function NotebookScene({ className }: Props) {
  return (
    <svg viewBox="0 0 160 110" className={cn("overflow-visible", className)} aria-hidden>
      <ellipse cx="80" cy="102" rx="66" ry="5" fill="#000" opacity="0.1" />
      <path d="M14 30 L78 22 V96 L14 100 Z" fill={C.paper} />
      <path d="M146 30 L82 22 V96 L146 100 Z" fill={C.cream} />
      <rect x="77" y="20" width="6" height="78" rx="3" fill={C.wood} />
      {[40, 52, 64, 76].map((y) => (
        <path
          key={y}
          d={`M24 ${y} L68 ${y - 5}`}
          stroke={C.sage}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      {[40, 52, 64].map((y) => (
        <path
          key={y}
          d={`M92 ${y - 5} L136 ${y}`}
          stroke={C.sage}
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
      <circle cx="122" cy="80" r="7" fill={C.gold} />
      <g transform="rotate(-38 120 50)">
        <rect x="112" y="6" width="9" height="62" rx="4" fill={C.night} />
        <path d="M112 68 h9 l-4.5 10 z" fill={C.wood} />
        <rect x="112" y="6" width="9" height="10" rx="3" fill={C.orange} />
      </g>
    </svg>
  );
}

/** El faro de la marca sobre el agua, con el sol detrás. */
export function LighthouseScene({ className }: Props) {
  const L = LIGHTHOUSE;
  return (
    <svg viewBox="0 0 64 64" className={cn("overflow-visible", className)} aria-hidden>
      <circle cx="44" cy="22" r="16" fill={C.orange} opacity="0.9" />
      <g fill={C.paper} stroke={C.paper} strokeLinejoin="round">
        <path d={L.roof} strokeWidth="1.2" />
        <rect {...L.gallery} stroke="none" />
        <path d={L.towerTop} strokeWidth="1" />
        <path d={L.towerBottom} strokeWidth="1" />
      </g>
      <circle {...L.lamp} fill={C.gold} />
      <path d={L.waves} fill="none" stroke={C.paper} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** Una planta en maceta (para tarjetas chicas). */
export function PlantScene({ className }: Props) {
  return (
    <svg viewBox="0 0 80 100" className={cn("overflow-visible", className)} aria-hidden>
      <path d="M22 66 h36 l-5 32 h-26 z" fill={C.pot} />
      <path d="M40 66 C 26 52, 10 50, 6 30 C 24 34, 36 48, 40 66 Z" fill={C.leaf} />
      <path d="M40 66 C 44 44, 36 22, 44 2 C 54 22, 48 46, 40 66 Z" fill={C.leafDark} />
      <path d="M40 66 C 52 52, 66 48, 74 30 C 58 32, 46 46, 40 66 Z" fill={C.leaf} />
    </svg>
  );
}
