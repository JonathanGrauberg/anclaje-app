// Plantillas del sistema: estructura y puntaje de instrumentos conocidos.
// IMPORTANTE: NO incluimos la redacción de los ítems ni de las opciones (son textos validados con
// sus propias condiciones de uso). Quedan como TODO para que la profesional copie la versión en
// español validada que tenga autorizada. Publicar con un TODO está bloqueado en el armador.

type Range = { min: number; max: number; label: string; color: string };

export type TemplateDef = {
  slug: string;
  title: string;
  description: string;
  sourceNote: string;
  referencePeriod: string;
  items: number;
  criticalItem?: { index: number; minValue: number };
  extraUnscoredItem?: boolean;
  ranges: Range[];
};

const COLORS = ["#A9D9B4", "#F9E08A", "#FFC690", "#F5A9BC", "#E38A9E"];

export const TEMPLATES: TemplateDef[] = [
  {
    slug: "phq9",
    title: "PHQ-9 (plantilla)",
    description: "Cuestionario de salud del paciente, 9 ítems. Puntaje 0–27.",
    sourceNote:
      "PHQ-9 (Kroenke, Spitzer y Williams). Antes de usarlo, verificá la versión en español validada y sus condiciones de uso.",
    referencePeriod: "las últimas 2 semanas",
    items: 9,
    criticalItem: { index: 9, minValue: 1 },
    extraUnscoredItem: true,
    ranges: [
      { min: 0, max: 4, label: "Mínima", color: COLORS[0] },
      { min: 5, max: 9, label: "Leve", color: COLORS[1] },
      { min: 10, max: 14, label: "Moderada", color: COLORS[2] },
      { min: 15, max: 19, label: "Moderadamente severa", color: COLORS[3] },
      { min: 20, max: 27, label: "Severa", color: COLORS[4] },
    ],
  },
  {
    slug: "gad7",
    title: "GAD-7 (plantilla)",
    description: "Escala de ansiedad generalizada, 7 ítems. Puntaje 0–21.",
    sourceNote:
      "GAD-7 (Spitzer, Kroenke, Williams y Löwe). Antes de usarlo, verificá la versión en español validada y sus condiciones de uso.",
    referencePeriod: "las últimas 2 semanas",
    items: 7,
    ranges: [
      { min: 0, max: 4, label: "Mínima", color: COLORS[0] },
      { min: 5, max: 9, label: "Leve", color: COLORS[1] },
      { min: 10, max: 14, label: "Moderada", color: COLORS[2] },
      { min: 15, max: 21, label: "Severa", color: COLORS[4] },
    ],
  },
];
