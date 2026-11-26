"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useMemo, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  A11Y_KEY,
  a11yAttributes,
  DEFAULT_A11Y,
  parseA11y,
  type A11yPrefs,
  type TextSize,
} from "@/lib/a11y";
import { cn } from "@/lib/utils";

function readPrefs(): A11yPrefs {
  try {
    return parseA11y(localStorage.getItem(A11Y_KEY));
  } catch {
    return DEFAULT_A11Y;
  }
}

const ATTRS = ["data-text", "data-contrast", "data-motion", "data-font", "data-links"];
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ATTRS });
  return () => observer.disconnect();
}
// Lo que está aplicado en <html>, como texto estable para useSyncExternalStore.
const getRaw = () => {
  const d = document.documentElement;
  return JSON.stringify({
    text: d.getAttribute("data-text") ?? "normal",
    contrast: d.hasAttribute("data-contrast"),
    reduceMotion: d.hasAttribute("data-motion"),
    readableFont: d.hasAttribute("data-font"),
    underlineLinks: d.hasAttribute("data-links"),
  });
};

function applyPrefs(p: A11yPrefs) {
  const root = document.documentElement;
  for (const [attr, value] of Object.entries(a11yAttributes(p))) {
    if (value === null) root.removeAttribute(attr);
    else root.setAttribute(attr, value);
  }
  try {
    const isDefault = JSON.stringify(p) === JSON.stringify(DEFAULT_A11Y);
    if (isDefault) localStorage.removeItem(A11Y_KEY);
    else localStorage.setItem(A11Y_KEY, JSON.stringify(p));
  } catch {
    // Sin almacenamiento (modo privado): dura hasta recargar.
  }
}

const SIZES: { value: TextSize; label: string; sample: string }[] = [
  { value: "normal", label: "Normal", sample: "text-base" },
  { value: "lg", label: "Grande", sample: "text-lg" },
  { value: "xl", label: "Muy grande", sample: "text-xl" },
];

const TOGGLES: { key: Exclude<keyof A11yPrefs, "text">; label: string; hint: string }[] = [
  {
    key: "contrast",
    label: "Más contraste",
    hint: "Textos más oscuros, bordes marcados y enlaces subrayados.",
  },
  {
    key: "readableFont",
    label: "Letra más fácil de leer",
    hint: "Una tipografía pensada para baja visión y dislexia, con más espacio entre letras.",
  },
  {
    key: "underlineLinks",
    label: "Subrayar los enlaces",
    hint: "Para distinguir los enlaces sin depender del color.",
  },
  {
    key: "reduceMotion",
    label: "Sin animaciones",
    hint: "La rueda y las pantallas cambian sin movimiento.",
  },
];

export function A11ySettings() {
  const uid = useId();
  // Lo elegido vive en <html data-*> (y en localStorage): lo observamos, como el modo oscuro.
  const raw = useSyncExternalStore(subscribe, getRaw, () => "");
  const prefs = useMemo(() => parseA11y(raw || null), [raw]);

  // Cada cambio parte de lo guardado (dos toques seguidos no se pisan).
  const update = (patch: Partial<A11yPrefs> | null) =>
    applyPrefs(patch === null ? DEFAULT_A11Y : { ...readPrefs(), ...patch });
  const changed = JSON.stringify(prefs) !== JSON.stringify(DEFAULT_A11Y);

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 font-semibold">Tamaño de la letra</legend>
        <div className="grid grid-cols-3 gap-2">
          {SIZES.map((s) => (
            <label
              key={s.value}
              className={cn(
                "bg-card flex cursor-pointer flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center",
                "focus-within:ring-ring focus-within:ring-2",
                prefs.text === s.value ? "border-primary" : "border-border",
              )}
            >
              <input
                type="radio"
                name={`${uid}-size`}
                className="sr-only"
                checked={prefs.text === s.value}
                onChange={() => update({ text: s.value })}
              />
              <span className={cn("font-semibold", s.sample)} aria-hidden>
                Aa
              </span>
              <span className="text-sm">{s.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <ul className="flex flex-col gap-2">
        {TOGGLES.map((t) => (
          <li
            key={t.key}
            className="bg-card flex items-center justify-between gap-4 rounded-2xl border p-4"
          >
            <label htmlFor={`${uid}-${t.key}`} className="flex cursor-pointer flex-col">
              <span className="font-medium">{t.label}</span>
              <span className="text-muted-foreground text-sm">{t.hint}</span>
            </label>
            <Switch
              id={`${uid}-${t.key}`}
              checked={prefs[t.key]}
              onCheckedChange={(v) => update({ [t.key]: v })}
            />
          </li>
        ))}
      </ul>

      {changed && (
        <Button variant="outline" onClick={() => update(null)} className="self-start">
          <RotateCcw aria-hidden /> Volver a como estaba
        </Button>
      )}
    </div>
  );
}

/** Vuelve a la pantalla anterior (o al inicio si se entró directo). */
export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      className="text-primary hover:bg-muted flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium"
    >
      <ArrowLeft className="size-4" aria-hidden /> Volver
    </button>
  );
}
