// Geometría de la rueda. Ángulos en grados, 0° = arriba, sentido horario.

export const R = {
  center: 50,
  ring1: [54, 106] as const,
  ring2: [110, 150] as const,
  ring3: [154, 188] as const,
  view: 190,
};

export function polar(r: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [r * Math.cos(a), r * Math.sin(a)];
}

const f = (n: number) => n.toFixed(2);

/** Sector de anillo entre radios r0–r1 y ángulos a0–a1 (a1 - a0 < 360). */
export function arcPath(r0: number, r1: number, a0: number, a1: number) {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = polar(r1, a0);
  const [x1, y1] = polar(r1, a1);
  const [x2, y2] = polar(r0, a1);
  const [x3, y3] = polar(r0, a0);
  return [
    `M ${f(x0)} ${f(y0)}`,
    `A ${r1} ${r1} 0 ${large} 1 ${f(x1)} ${f(y1)}`,
    `L ${f(x2)} ${f(y2)}`,
    `A ${r0} ${r0} 0 ${large} 0 ${f(x3)} ${f(y3)}`,
    "Z",
  ].join(" ");
}

export type Segment = { a0: number; a1: number; mid: number };

/** n segmentos de `size` grados, centrados en `center`. */
export function layoutAround(n: number, size: number, center: number): Segment[] {
  const total = n * size;
  const start = center - total / 2;
  return Array.from({ length: n }, (_, i) => {
    const a0 = start + i * size;
    return { a0, a1: a0 + size, mid: a0 + size / 2 };
  });
}

/** Rotación para que el texto siga el arco y nunca quede cabeza abajo. */
export function labelRotation(mid: number) {
  const m = ((mid % 360) + 360) % 360;
  return m > 90 && m < 270 ? m + 180 : m;
}

/** Parte un texto en 1–2 líneas y elige un tamaño que entre en el ancho disponible. */
export function fitLabel(text: string, maxWidth: number, baseSize: number, minSize = 9) {
  const charW = 0.56;
  const width = (s: string, size: number) => s.length * size * charW;
  if (width(text, baseSize) <= maxWidth) return { lines: [text], size: baseSize };
  const words = text.split(" ");
  if (words.length > 1) {
    // Mejor corte: el que deja las dos líneas más parejas.
    let best = { lines: [text], longest: Infinity };
    for (let i = 1; i < words.length; i++) {
      const lines = [words.slice(0, i).join(" "), words.slice(i).join(" ")];
      const longest = Math.max(...lines.map((l) => l.length));
      if (longest < best.longest) best = { lines, longest };
    }
    const size = Math.max(minSize, Math.min(baseSize, maxWidth / (best.longest * charW)));
    return { lines: best.lines, size };
  }
  return { lines: [text], size: Math.max(minSize, maxWidth / (text.length * charW)) };
}
