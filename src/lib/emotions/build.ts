// Convierte el JSON editable de la rueda (prisma/data/emotions.json) en filas de EmotionNode.
// Lo usa el seed; está acá para poder testearlo.

export type EmotionJson = {
  families: {
    id?: string;
    label: string;
    color: string;
    children: {
      id?: string;
      label: string;
      color?: string;
      children: (string | { id?: string; label: string; color?: string })[];
    }[];
  }[];
};

export type EmotionNodeRow = {
  id: string;
  parentId: string | null;
  level: number;
  label: string;
  color: string;
  sortOrder: number;
};

export function slugify(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Mezcla un color hex con blanco. amount 0 = igual, 1 = blanco. */
export function lighten(hex: string, amount: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

export function buildEmotionRows(json: EmotionJson): EmotionNodeRow[] {
  const rows: EmotionNodeRow[] = [];
  json.families.forEach((family, i) => {
    const familyId = family.id ?? slugify(family.label);
    rows.push({
      id: familyId,
      parentId: null,
      level: 1,
      label: family.label,
      color: family.color,
      sortOrder: i,
    });
    family.children.forEach((secondary, j) => {
      const secondaryId = `${familyId}.${secondary.id ?? slugify(secondary.label)}`;
      rows.push({
        id: secondaryId,
        parentId: familyId,
        level: 2,
        label: secondary.label,
        color: secondary.color ?? lighten(family.color, 0.25),
        sortOrder: j,
      });
      secondary.children.forEach((tertiary, k) => {
        const t = typeof tertiary === "string" ? { label: tertiary } : tertiary;
        rows.push({
          id: `${secondaryId}.${t.id ?? slugify(t.label)}`,
          parentId: secondaryId,
          level: 3,
          label: t.label,
          color: ("color" in t && t.color) || lighten(family.color, 0.45),
          sortOrder: k,
        });
      });
    });
  });
  return rows;
}
