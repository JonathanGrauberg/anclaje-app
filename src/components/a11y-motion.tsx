"use client";

import { MotionConfig } from "motion/react";
import { useSyncExternalStore } from "react";

// Las animaciones de `motion` (rueda, transiciones) no las frena el CSS: si la persona eligió
// "Sin animaciones" en /accesibilidad, se las apaga acá. Si no, respeta lo del sistema.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-motion"] });
  return () => observer.disconnect();
}
const getReduced = () => document.documentElement.dataset.motion === "reduce";

export function A11yMotion({ children }: { children: React.ReactNode }) {
  const reduced = useSyncExternalStore(subscribe, getReduced, () => false);
  return <MotionConfig reducedMotion={reduced ? "always" : "user"}>{children}</MotionConfig>;
}
