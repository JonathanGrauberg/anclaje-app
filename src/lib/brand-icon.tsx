import { ImageResponse } from "next/og";

// Ícono de la app (la flor del logo) en PNG, para el manifest y la pantalla de inicio.
const PETALS = ["#F5A9BC", "#A9D9B4", "#C6B5E6", "#FFC690", "#F9E08A", "#C8CED8"];
const BG = "#faf7f2";

function flowerSvg() {
  const petals = PETALS.map(
    (c, i) =>
      `<ellipse cx="32" cy="17" rx="10" ry="15" fill="${c}" opacity="0.92" transform="rotate(${i * 60} 32 32)"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${petals}<circle cx="32" cy="32" r="7" fill="${BG}"/></svg>`;
}

/** `safe` = proporción del lienzo que ocupa la flor (los íconos "maskable" necesitan margen). */
export function brandIcon(size: number, safe = 0.78) {
  const inner = Math.round(size * safe);
  const src = `data:image/svg+xml;utf8,${encodeURIComponent(flowerSvg())}`;
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
