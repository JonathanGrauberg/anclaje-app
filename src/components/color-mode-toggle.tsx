"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";
import { COLOR_MODE_KEY, type ColorMode } from "@/lib/color-mode";
import { cn } from "@/lib/utils";

const THEME_COLOR: Record<ColorMode, string> = { light: "#faf7f2", dark: "#16151b" };

function applyMode(mode: ColorMode) {
  const root = document.documentElement;
  if (mode === "dark") root.dataset.mode = "dark";
  else delete root.dataset.mode;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[mode]);
  try {
    if (mode === "dark") localStorage.setItem(COLOR_MODE_KEY, "dark");
    else localStorage.removeItem(COLOR_MODE_KEY);
  } catch {
    // Sin almacenamiento (modo privado): el cambio dura hasta recargar.
  }
}

// El modo vive en <html data-mode>; lo observamos para que todos los botones coincidan.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-mode"] });
  return () => observer.disconnect();
}
const getMode = (): ColorMode =>
  document.documentElement.dataset.mode === "dark" ? "dark" : "light";
const getServerMode = (): ColorMode => "light";

/** Botón sol/luna para pasar de modo claro a oscuro y volver. */
export function ColorModeToggle({ className }: { className?: string }) {
  const mode = useSyncExternalStore(subscribe, getMode, getServerMode);

  const next: ColorMode = mode === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Pasar a modo oscuro" : "Pasar a modo claro";
  const Icon = mode === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        applyMode(next);
      }}
      className={cn(
        "hover:bg-muted focus-visible:ring-ring inline-flex size-9 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none",
        className,
      )}
    >
      <Icon className="size-[1.15rem]" aria-hidden />
    </button>
  );
}
