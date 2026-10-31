"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useReducer, useState } from "react";
import { Button } from "@/components/ui/button";

const PHASES = [
  { label: "Inhalá", seconds: 4, scale: 1 },
  { label: "Exhalá", seconds: 6, scale: 0.55 },
] as const;

type BreathState = { phase: number; left: number; cycles: number };
const INITIAL_BREATH: BreathState = { phase: 0, left: PHASES[0].seconds, cycles: 0 };

/** Respiración guiada: un círculo que se agranda al inhalar y se achica al exhalar. */
export function BreathingExercise({
  title = "Respiración 4-6",
  hint,
}: {
  title?: string;
  hint?: string | null;
}) {
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(false);
  const [{ phase, left, cycles }, tick] = useReducer(
    (s: BreathState, action: "tick" | "reset"): BreathState => {
      if (action === "reset") return INITIAL_BREATH;
      if (s.left > 1) return { ...s, left: s.left - 1 };
      const next = (s.phase + 1) % PHASES.length;
      return { phase: next, left: PHASES[next].seconds, cycles: s.cycles + (next === 0 ? 1 : 0) };
    },
    INITIAL_BREATH,
  );

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => tick("tick"), 1000);
    return () => clearInterval(t);
  }, [running]);

  const current = PHASES[phase];

  return (
    <div className="bg-card flex flex-col items-center gap-5 rounded-3xl border p-6">
      <div className="self-stretch">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm">
          {hint ?? "Seguí el círculo con la respiración."}
        </p>
      </div>
      <div className="relative flex size-56 items-center justify-center" aria-hidden={!running}>
        <div className="bg-primary-soft absolute inset-0 rounded-full" />
        <motion.div
          className="bg-primary/30 absolute size-full rounded-full"
          initial={false}
          animate={{ scale: running ? current.scale : 0.55 }}
          transition={{
            duration: reduced ? 0 : running ? current.seconds : 0.6,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="bg-primary/50 absolute size-1/2 rounded-full"
          initial={false}
          animate={{ scale: running ? current.scale * 1.2 : 0.8 }}
          transition={{
            duration: reduced ? 0 : running ? current.seconds : 0.6,
            ease: "easeInOut",
          }}
        />
        <div className="relative text-center" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={running ? current.label : "idle"}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="text-2xl font-semibold"
            >
              {running ? current.label : "Cuando quieras"}
            </motion.p>
          </AnimatePresence>
          {running && <p className="text-3xl font-light tabular-nums">{left}</p>}
        </div>
      </div>
      {cycles > 0 && (
        <p className="text-muted-foreground text-sm">
          {cycles} {cycles === 1 ? "respiración" : "respiraciones"}
        </p>
      )}
      <div className="flex gap-2">
        <Button onClick={() => setRunning((r) => !r)} size="lg">
          {running ? <Pause /> : <Play />} {running ? "Pausar" : "Empezar"}
        </Button>
        {(running || cycles > 0) && (
          <Button
            variant="ghost"
            size="lg"
            onClick={() => {
              setRunning(false);
              tick("reset");
            }}
          >
            <RotateCcw /> Reiniciar
          </Button>
        )}
      </div>
    </div>
  );
}

const GROUNDING = [
  { n: 5, text: "cosas que ves" },
  { n: 4, text: "cosas que podés tocar" },
  { n: 3, text: "cosas que escuchás" },
  { n: 2, text: "cosas que podés oler" },
  { n: 1, text: "cosa que podés saborear" },
];

/** Grounding 5-4-3-2-1, de a un paso. */
export function Grounding({ title = "Grounding 5-4-3-2-1" }: { title?: string }) {
  const [step, setStep] = useState(-1);
  const done = step >= GROUNDING.length;

  return (
    <div className="bg-card flex flex-col gap-4 rounded-3xl border p-6">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm">
          Para volver al presente usando los sentidos.
        </p>
      </div>
      <div className="flex min-h-28 items-center justify-center text-center" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            {step < 0 ? (
              <p className="text-muted-foreground">Mirá a tu alrededor. Vamos de a poco.</p>
            ) : done ? (
              <p className="text-xl font-semibold">Bien. Estás acá, ahora.</p>
            ) : (
              <>
                <p className="text-primary text-5xl font-semibold">{GROUNDING[step].n}</p>
                <p className="mt-1 text-xl">{GROUNDING[step].text}</p>
                <p className="text-muted-foreground mt-2 text-sm">
                  Nombralas en voz baja, sin apuro.
                </p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex justify-center gap-2">
        {done ? (
          <Button variant="outline" onClick={() => setStep(-1)}>
            <RotateCcw /> De nuevo
          </Button>
        ) : (
          <Button onClick={() => setStep((s) => s + 1)}>
            {step < 0 ? "Empezar" : "Listo, sigo"}
          </Button>
        )}
      </div>
    </div>
  );
}
