// Dibujo del logo de .anclaje: un faro minimalista sobre el agua, en una grilla de 64×64.
// La luz del faro es el mismo punto dorado que va delante de "anclaje".
// Lo usan el componente <Logo>, los íconos PNG y la animación de carga.

export const BRAND = {
  ink: "#426f64",
  inkDark: "#8fc4b5",
  light: "#fcc107", // dorado, el mismo de webi y .budgets
  bg: "#faf7f2",
} as const;

export const LIGHTHOUSE = {
  roof: "M26.5 15 L32 9 L37.5 15 Z",
  lamp: { cx: 32, cy: 20.2, r: 4.6 },
  gallery: { x: 24, y: 26, width: 16, height: 2.8, rx: 1.4 },
  // La torre va en dos partes: el hueco entre ellas es la franja del faro.
  towerTop: "M26.6 30.6 H37.4 L38.8 40 H25.2 Z",
  towerBottom: "M24.7 43.2 H39.3 L40.9 54 H23.1 Z",
  waves: "M12 58.5 Q17 55.5 22 58.5 T32 58.5 T42 58.5 T52 58.5",
} as const;

/** El faro como texto SVG (para los íconos PNG, que no usan React). */
export function lighthouseSvg(ink: string = BRAND.ink) {
  const L = LIGHTHOUSE;
  const g = L.gallery;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">`,
    `<path d="${L.roof}" fill="${ink}" stroke="${ink}" stroke-width="1.2" stroke-linejoin="round"/>`,
    `<circle cx="${L.lamp.cx}" cy="${L.lamp.cy}" r="${L.lamp.r}" fill="${BRAND.light}"/>`,
    `<rect x="${g.x}" y="${g.y}" width="${g.width}" height="${g.height}" rx="${g.rx}" fill="${ink}"/>`,
    `<path d="${L.towerTop}" fill="${ink}" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>`,
    `<path d="${L.towerBottom}" fill="${ink}" stroke="${ink}" stroke-width="1" stroke-linejoin="round"/>`,
    `<path d="${L.waves}" fill="none" stroke="${ink}" stroke-width="2.6" stroke-linecap="round"/>`,
    `</svg>`,
  ].join("");
}
