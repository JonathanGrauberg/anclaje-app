// Accesibilidad elegida por cada persona en /accesibilidad. Como el modo oscuro, se guarda en este
// navegador (localStorage) y se aplica en <html> con atributos data-* antes de pintar. Sin nada
// elegido, la app se ve exactamente igual que siempre. Ver DECISIONES.md.

export const A11Y_KEY = "anclaje-accesibilidad";

export type TextSize = "normal" | "lg" | "xl";
export type A11yPrefs = {
  text: TextSize;
  contrast: boolean;
  reduceMotion: boolean;
  readableFont: boolean;
  underlineLinks: boolean;
};

export const DEFAULT_A11Y: A11yPrefs = {
  text: "normal",
  contrast: false,
  reduceMotion: false,
  readableFont: false,
  underlineLinks: false,
};

/** Atributos de <html> para cada preferencia (null = sacar el atributo). */
export function a11yAttributes(p: A11yPrefs): Record<string, string | null> {
  return {
    "data-text": p.text === "normal" ? null : p.text,
    "data-contrast": p.contrast ? "high" : null,
    "data-motion": p.reduceMotion ? "reduce" : null,
    "data-font": p.readableFont ? "readable" : null,
    "data-links": p.underlineLinks ? "underline" : null,
  };
}

export function parseA11y(raw: string | null): A11yPrefs {
  if (!raw) return DEFAULT_A11Y;
  try {
    const v = JSON.parse(raw) as Partial<A11yPrefs>;
    return {
      text: v.text === "lg" || v.text === "xl" ? v.text : "normal",
      contrast: v.contrast === true,
      reduceMotion: v.reduceMotion === true,
      readableFont: v.readableFont === true,
      underlineLinks: v.underlineLinks === true,
    };
  } catch {
    return DEFAULT_A11Y;
  }
}

/** Se corre en <head> antes de pintar (mismo criterio que COLOR_MODE_SCRIPT). */
export const A11Y_SCRIPT = `try{var p=JSON.parse(localStorage.getItem("${A11Y_KEY}")||"null");if(p){var d=document.documentElement.dataset;if(p.text==="lg"||p.text==="xl")d.text=p.text;if(p.contrast===true)d.contrast="high";if(p.reduceMotion===true)d.motion="reduce";if(p.readableFont===true)d.font="readable";if(p.underlineLinks===true)d.links="underline"}}catch(e){}`;
