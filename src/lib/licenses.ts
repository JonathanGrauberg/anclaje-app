// Matrículas de psicología: cada provincia tiene su colegio (matrícula provincial) y además
// existe la matrícula nacional (MN). La misma combinación no se puede usar dos veces.

export const JURISDICTIONS = [
  ["MN", "Nacional (MN)"],
  ["BA", "Buenos Aires"],
  ["CABA", "Ciudad de Buenos Aires"],
  ["CA", "Catamarca"],
  ["CH", "Chaco"],
  ["CT", "Chubut"],
  ["CB", "Córdoba"],
  ["CR", "Corrientes"],
  ["ER", "Entre Ríos"],
  ["FO", "Formosa"],
  ["JY", "Jujuy"],
  ["LP", "La Pampa"],
  ["LR", "La Rioja"],
  ["MZ", "Mendoza"],
  ["MI", "Misiones"],
  ["NQ", "Neuquén"],
  ["RN", "Río Negro"],
  ["SA", "Salta"],
  ["SJ", "San Juan"],
  ["SL", "San Luis"],
  ["SC", "Santa Cruz"],
  ["SF", "Santa Fe"],
  ["SE", "Santiago del Estero"],
  ["TF", "Tierra del Fuego"],
  ["TU", "Tucumán"],
] as const;

export type Jurisdiction = (typeof JURISDICTIONS)[number][0];
export const JURISDICTION_CODES = JURISDICTIONS.map(([code]) => code) as [
  Jurisdiction,
  ...Jurisdiction[],
];

export function jurisdictionName(code: string | null | undefined) {
  return JURISDICTIONS.find(([c]) => c === code)?.[1] ?? null;
}

/** "M.P. 1.234" → "1234": solo los dígitos, así no se puede repetir escribiéndola distinto. */
export function normalizeLicense(value: string) {
  return value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}
