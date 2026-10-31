"use client";

import { animate, useMotionValue, useMotionValueEvent } from "motion/react";
import { useEffect, useState } from "react";

/** Número que cuenta suavemente de `from` a `to` (para el antes/después). */
export function AnimatedNumber({
  from,
  to,
  suffix = "",
  delay = 0.3,
}: {
  from: number;
  to: number;
  suffix?: string;
  delay?: number;
}) {
  const value = useMotionValue(from);
  const [shown, setShown] = useState(from);
  useMotionValueEvent(value, "change", (v) => setShown(Math.round(v)));

  useEffect(() => {
    value.set(from);
    const controls = animate(value, to, { duration: 1.2, delay, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [from, to, delay, value]);

  return (
    <span className="tabular-nums" aria-label={`${to}${suffix}`}>
      {shown}
      {suffix}
    </span>
  );
}
