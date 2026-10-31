"use client";

import { ArrowLeft, ArrowRight, ChevronDown, Info, Quote } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { AnimatedNumber } from "@/components/animated-number";
import { EmotionWheel } from "@/components/emotion-wheel/emotion-wheel";
import { IntensityList } from "@/components/emotion-wheel/intensity-list";
import type { EmotionTreeNode } from "@/components/emotion-wheel/types";
import { useEmotionIndex } from "@/components/emotion-wheel/use-emotion-index";
import { BodyZonePicker } from "@/components/patient/body-zones";
import { ShareControl, type ShareValue } from "@/components/patient/share-control";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/misc";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { completeCbtRecord, saveCbtDraft } from "@/lib/actions/cbt";
import type { BodyZoneId } from "@/lib/constants";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/dates";
import type { DistortionDTO } from "@/lib/queries/common";
import { cn } from "@/lib/utils";

export type CbtWizardState = {
  occurredAt: string; // valor de datetime-local en hora de Buenos Aires
  situation: string;
  thought: string;
  beliefBefore: number | null;
  distortionIds: string[];
  emotions: { nodeId: string; intensityBefore: number; intensityAfter: number | null }[];
  bodyZones: BodyZoneId[];
  behavior: string;
  alternative: string;
  beliefAfter: number | null;
  share: ShareValue;
};

const STEPS = [
  "Situación",
  "Pensamiento",
  "Emoción",
  "Conducta",
  "Otra mirada",
  "¿Y ahora?",
  "Compartir",
] as const;
const TOTAL = STEPS.length;
const AUTOSAVE_MS = 1200;

const GUIDE_QUESTIONS = [
  "¿Qué evidencia tengo a favor de este pensamiento? ¿Y en contra?",
  "¿Qué le diría a una amiga o un amigo que piensa esto?",
  "¿Qué es lo peor que podría pasar? ¿Y lo mejor? ¿Y lo más probable?",
  "¿Hay otra forma de mirar lo que pasó?",
];

export function CbtWizard({
  id,
  initial,
  initialStep,
  tree,
  distortions,
  hasProfessional,
}: {
  id: string;
  initial: CbtWizardState;
  initialStep: number;
  tree: EmotionTreeNode[];
  distortions: DistortionDTO[];
  hasProfessional: boolean;
}) {
  const router = useRouter();
  const index = useEmotionIndex(tree);
  const [state, setState] = useState(initial);
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 1), TOTAL));
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [finishing, startFinish] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null);

  // Autoguardado en cola (nunca en paralelo, siempre la última versión).
  const latest = useRef({ state, step });
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const payload = useCallback(
    (s: CbtWizardState, currentStep: number) => ({
      id,
      currentStep,
      occurredAt: s.occurredAt ? fromLocalInputValue(s.occurredAt).toISOString() : undefined,
      situation: s.situation,
      thought: s.thought,
      beliefBefore: s.beliefBefore,
      distortionIds: s.distortionIds,
      emotions: s.emotions,
      bodyZones: s.bodyZones,
      behavior: s.behavior,
      alternative: s.alternative,
      beliefAfter: s.beliefAfter,
      share: s.share,
    }),
    [id],
  );

  const persist = useCallback(() => {
    const run = async () => {
      setSaving("saving");
      const { state: s, step: st } = latest.current;
      const res = await saveCbtDraft(payload(s, st));
      setSaving(res.ok ? "saved" : "error");
      if (!res.ok) setError(res.error);
    };
    chain.current = chain.current.then(run, run);
    return chain.current;
  }, [payload]);

  function schedule() {
    clearTimeout(timer.current);
    timer.current = setTimeout(persist, AUTOSAVE_MS);
  }

  function update(patch: Partial<CbtWizardState>) {
    setState((s) => {
      const next = { ...s, ...patch };
      latest.current = { ...latest.current, state: next };
      return next;
    });
    schedule();
  }

  function go(to: number) {
    setError(null);
    setDirection(to > step ? 1 : -1);
    setStep(to);
    latest.current = { ...latest.current, step: to };
    clearTimeout(timer.current);
    persist();
    window.scrollTo({ top: 0 });
  }

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function finish() {
    clearTimeout(timer.current);
    startFinish(async () => {
      await chain.current;
      const res = await completeCbtRecord(payload(latest.current.state, TOTAL));
      if (!res.ok) return setError(res.error);
      router.refresh();
    });
  }

  const canNext =
    step === 1
      ? state.situation.trim().length > 0
      : step === 2
        ? state.thought.trim().length > 0
        : true;

  const titles: Record<number, { q: string; hint?: string }> = {
    1: {
      q: "¿Qué pasó o dónde estabas?",
      hint: "Contalo como si fuera una foto: dónde, con quién, qué pasaba.",
    },
    2: {
      q: "¿Qué se te vino a la cabeza?",
      hint: "El pensamiento tal cual apareció, aunque suene exagerado.",
    },
    3: { q: "¿Qué sentiste?", hint: "Elegí en la rueda y marcá la intensidad de cada emoción." },
    4: { q: "¿Qué hiciste?", hint: "Lo que hiciste o tuviste ganas de hacer." },
    5: { q: "¿Qué alternativa más realista o compasiva hay para este pensamiento?" },
    6: { q: "Volvé a mirar cómo estás ahora" },
    7: { q: "¿Querés compartirlo?" },
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            Paso {step} de {TOTAL} · {STEPS[step - 1]}
          </span>
          <span aria-live="polite">
            {saving === "saving" ? "Guardando…" : saving === "saved" ? "Borrador guardado" : ""}
          </span>
        </div>
        <Progress value={(step / TOTAL) * 100} label={`Paso ${step} de ${TOTAL}`} />
      </div>

      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.section
          key={step}
          custom={direction}
          initial={{ opacity: 0, x: direction * 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -40 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="flex flex-col gap-5"
          aria-labelledby="step-title"
        >
          <div>
            <h1
              id="step-title"
              ref={heading}
              tabIndex={-1}
              className="text-2xl font-semibold tracking-tight focus:outline-none"
            >
              {titles[step].q}
            </h1>
            {titles[step].hint && <p className="text-muted-foreground mt-1">{titles[step].hint}</p>}
          </div>

          {step === 1 && (
            <>
              <Textarea
                value={state.situation}
                onChange={(e) => update({ situation: e.target.value })}
                aria-label="Situación"
                placeholder="Ej.: En el trabajo, mi jefa me pidió que rehiciera el informe delante de todos."
                className="min-h-36"
                maxLength={5000}
                autoFocus
              />
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">¿Cuándo fue?</span>
                <Input
                  type="datetime-local"
                  value={state.occurredAt}
                  max={toLocalInputValue(new Date())}
                  onChange={(e) => update({ occurredAt: e.target.value })}
                />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <Textarea
                value={state.thought}
                onChange={(e) => update({ thought: e.target.value })}
                aria-label="Pensamiento automático"
                placeholder="Ej.: «Soy un desastre, me van a echar»."
                className="min-h-28"
                maxLength={5000}
              />
              <PercentSlider
                label="¿Cuánto te lo creés?"
                value={state.beliefBefore}
                onChange={(v) => update({ beliefBefore: v })}
              />
              <DistortionPicker
                distortions={distortions}
                value={state.distortionIds}
                onChange={(distortionIds) => update({ distortionIds })}
              />
            </>
          )}

          {step === 3 && (
            <>
              <EmotionWheel
                tree={tree}
                selected={state.emotions.map((e) => e.nodeId)}
                onToggle={(nodeId) =>
                  update({
                    emotions: state.emotions.some((e) => e.nodeId === nodeId)
                      ? state.emotions.filter((e) => e.nodeId !== nodeId)
                      : [...state.emotions, { nodeId, intensityBefore: 5, intensityAfter: null }],
                  })
                }
              />
              {state.emotions.length > 0 && (
                <IntensityList
                  index={index}
                  items={state.emotions.map((e) => ({
                    nodeId: e.nodeId,
                    intensity: e.intensityBefore,
                  }))}
                  onChange={(nodeId, intensity) =>
                    update({
                      emotions: state.emotions.map((e) =>
                        e.nodeId === nodeId ? { ...e, intensityBefore: intensity } : e,
                      ),
                    })
                  }
                  onRemove={(nodeId) =>
                    update({ emotions: state.emotions.filter((e) => e.nodeId !== nodeId) })
                  }
                />
              )}
              <BodyZonePicker
                legend="¿Qué sentiste en el cuerpo?"
                value={state.bodyZones}
                onChange={(bodyZones) => update({ bodyZones })}
              />
            </>
          )}

          {step === 4 && (
            <Textarea
              value={state.behavior}
              onChange={(e) => update({ behavior: e.target.value })}
              aria-label="Qué hiciste"
              placeholder="Ej.: Me fui al baño a llorar y después no hablé con nadie."
              className="min-h-36"
              maxLength={5000}
              autoFocus
            />
          )}

          {step === 5 && (
            <>
              <ThoughtQuote thought={state.thought} />
              <details className="group bg-card rounded-2xl border">
                <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 font-medium">
                  Preguntas que pueden ayudar
                  <ChevronDown
                    className="size-5 transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <ul className="text-muted-foreground flex flex-col gap-2 px-4 pb-4">
                  {GUIDE_QUESTIONS.map((q) => (
                    <li key={q} className="flex gap-2">
                      <span aria-hidden>·</span>
                      {q}
                    </li>
                  ))}
                </ul>
              </details>
              <Textarea
                value={state.alternative}
                onChange={(e) => update({ alternative: e.target.value })}
                aria-label="Pensamiento alternativo"
                placeholder="Ej.: Me pidió cambios, no me dijo que lo hago mal. Ya me pasó antes y lo resolví."
                className="min-h-36"
                maxLength={5000}
              />
            </>
          )}

          {step === 6 && (
            <>
              <ThoughtQuote thought={state.thought} />
              <PercentSlider
                label="¿Cuánto te creés ahora el pensamiento original?"
                value={state.beliefAfter ?? state.beliefBefore}
                onChange={(v) => update({ beliefAfter: v })}
              />
              {state.emotions.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h2 className="font-medium">¿Y la intensidad de lo que sentías?</h2>
                  <IntensityList
                    index={index}
                    question="¿Con qué intensidad ahora?"
                    items={state.emotions.map((e) => ({
                      nodeId: e.nodeId,
                      intensity: e.intensityAfter ?? e.intensityBefore,
                    }))}
                    onChange={(nodeId, intensity) =>
                      update({
                        emotions: state.emotions.map((e) =>
                          e.nodeId === nodeId ? { ...e, intensityAfter: intensity } : e,
                        ),
                      })
                    }
                  />
                </div>
              )}
              <BeforeAfter state={state} index={index} />
            </>
          )}

          {step === 7 && (
            <>
              <ShareControl
                value={state.share}
                onChange={(share) => update({ share })}
                hasProfessional={hasProfessional}
              />
              <p className="text-muted-foreground text-sm">
                Hacer esto ya es un montón. Podés volver a mirarlo cuando quieras desde
                “Autorregistro”.
              </p>
            </>
          )}
        </motion.section>
      </AnimatePresence>

      <FieldError>{error}</FieldError>

      <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex gap-2 pr-28">
        {step > 1 && (
          <Button
            variant="outline"
            size="lg"
            onClick={() => go(step - 1)}
            aria-label="Atrás"
            className="shadow-lg"
          >
            <ArrowLeft />
          </Button>
        )}
        {step < TOTAL ? (
          <Button
            size="lg"
            className="flex-1 shadow-lg"
            onClick={() => go(step + 1)}
            disabled={!canNext}
          >
            Siguiente <ArrowRight />
          </Button>
        ) : (
          <Button size="lg" className="flex-1 shadow-lg" onClick={finish} disabled={finishing}>
            {finishing ? "Guardando…" : "Terminar"}
          </Button>
        )}
      </div>
    </div>
  );
}

function ThoughtQuote({ thought }: { thought: string }) {
  if (!thought.trim()) return null;
  return (
    <blockquote className="bg-muted flex gap-3 rounded-2xl p-4">
      <Quote className="text-muted-foreground size-5 shrink-0" aria-hidden />
      <p className="italic">{thought}</p>
    </blockquote>
  );
}

function PercentSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="bg-card rounded-2xl border p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-medium">{label}</span>
        <span className="text-2xl font-semibold tabular-nums">
          {value === null ? "—" : `${value} %`}
        </span>
      </div>
      <Slider
        className="mt-2"
        min={0}
        max={100}
        step={5}
        value={value ?? 50}
        onValueChange={onChange}
        label={label}
        valueText={(v) => `${v} por ciento`}
      />
      <div className="text-muted-foreground flex justify-between text-xs" aria-hidden>
        <span>Nada</span>
        <span>Totalmente</span>
      </div>
    </div>
  );
}

function DistortionPicker({
  distortions,
  value,
  onChange,
}: {
  distortions: DistortionDTO[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="font-medium">¿Reconocés alguna de estas trampas del pensamiento?</legend>
      <p className="text-muted-foreground mb-3 text-sm">
        Opcional. Tocá la ⓘ para ver qué es cada una.
      </p>
      <div className="flex flex-wrap gap-2">
        {distortions.map((d) => {
          const on = value.includes(d.id);
          return (
            <span
              key={d.id}
              className={cn(
                "inline-flex items-center rounded-full border transition-colors",
                on ? "border-primary bg-primary-soft text-primary" : "bg-card",
              )}
            >
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onChange(on ? value.filter((x) => x !== d.id) : [...value, d.id])}
                className={cn("rounded-l-full py-2 pr-1 pl-3.5 text-sm", on && "font-medium")}
              >
                {d.name}
              </button>
              <Sheet>
                <SheetTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground rounded-r-full py-2 pr-3 pl-1"
                    aria-label={`Qué es ${d.name}`}
                  >
                    <Info className="size-4" />
                  </button>
                </SheetTrigger>
                <SheetContent title={d.name} description={d.description}>
                  {d.example && <p className="bg-muted rounded-2xl p-4 italic">{d.example}</p>}
                  <Button
                    className="mt-4 w-full"
                    variant={on ? "outline" : "default"}
                    onClick={() =>
                      onChange(on ? value.filter((x) => x !== d.id) : [...value, d.id])
                    }
                  >
                    {on ? "Desmarcar" : "Me pasó esto"}
                  </Button>
                </SheetContent>
              </Sheet>
            </span>
          );
        })}
      </div>
    </fieldset>
  );
}

function BeforeAfter({
  state,
  index,
}: {
  state: CbtWizardState;
  index: ReturnType<typeof useEmotionIndex>;
}) {
  const before = state.beliefBefore;
  const after = state.beliefAfter;
  const changedEmotions = state.emotions.filter(
    (e) => e.intensityAfter !== null && e.intensityAfter !== e.intensityBefore,
  );
  if ((before === null || after === null || before === after) && changedEmotions.length === 0)
    return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-primary-soft text-primary rounded-3xl p-5"
      aria-live="polite"
    >
      <p className="text-sm font-medium">Antes → ahora</p>
      {before !== null && after !== null && before !== after && (
        <div className="mt-2">
          <p className="text-3xl font-semibold">
            <AnimatedNumber from={before} to={before} suffix=" %" delay={0} /> →{" "}
            <AnimatedNumber from={before} to={after} suffix=" %" />
          </p>
          <p className="text-sm">cuánto te creés el pensamiento</p>
          <div className="bg-primary/15 mt-3 h-2 overflow-hidden rounded-full">
            <motion.div
              className="bg-primary h-full rounded-full"
              initial={{ width: `${before}%` }}
              animate={{ width: `${after}%` }}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </div>
      )}
      {changedEmotions.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1 text-sm">
          {changedEmotions.map((e) => (
            <li key={e.nodeId}>
              {index.get(e.nodeId)?.node.label}:{" "}
              <span className="font-semibold tabular-nums">
                {e.intensityBefore} →{" "}
                <AnimatedNumber from={e.intensityBefore} to={e.intensityAfter!} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
