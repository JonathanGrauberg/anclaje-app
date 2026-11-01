import { ImageResponse } from "next/og";
import { BRAND, lighthouseSvg } from "@/lib/brand";

// Ícono de la app (el faro del logo) en PNG, para el manifest, la pestaña y la pantalla de inicio.
const BG = BRAND.bg;

/** `safe` = proporción del lienzo que ocupa el faro (los íconos "maskable" necesitan margen). */
export function brandIcon(size: number, safe = 0.78) {
  const inner = Math.round(size * safe);
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(lighthouseSvg())}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BG,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) */}
      <img src={src} width={inner} height={inner} alt="" />
    </div>,
    { width: size, height: size },
  );
}
