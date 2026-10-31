// Constantes de dominio compartidas entre cliente y servidor.
// Los valores coinciden con los enums de prisma/schema.prisma.

export const VISIBILITIES = ["PRIVATE", "SHARED"] as const;
export type VisibilityValue = (typeof VISIBILITIES)[number];

export const INTENTIONS = ["DISCUSS_IN_SESSION", "WANT_FEEDBACK", "JUST_FYI"] as const;
export type IntentionValue = (typeof INTENTIONS)[number];

export const INTENTION_LABELS: Record<IntentionValue, string> = {
  DISCUSS_IN_SESSION: "Quiero hablarlo en sesión",
  WANT_FEEDBACK: "Me gustaría una devolución",
  JUST_FYI: "Solo para que lo veas",
};

export const BODY_ZONES = [
  { id: "cabeza", label: "Cabeza" },
  { id: "cara", label: "Cara / mandíbula" },
  { id: "garganta", label: "Garganta" },
  { id: "pecho", label: "Pecho" },
  { id: "estomago", label: "Estómago" },
  { id: "hombros", label: "Hombros / cuello" },
  { id: "espalda", label: "Espalda" },
  { id: "manos", label: "Manos" },
  { id: "piernas", label: "Piernas" },
  { id: "todo", label: "Todo el cuerpo" },
] as const;
export type BodyZoneId = (typeof BODY_ZONES)[number]["id"];
export const BODY_ZONE_IDS = BODY_ZONES.map((z) => z.id) as [BodyZoneId, ...BodyZoneId[]];

export const HIGH_INTENSITY = 8;

export const DISCLAIMER =
  "Esta app no es un servicio de urgencias. Tu psicóloga revisa lo que compartís según lo que acuerden, no en tiempo real.";
