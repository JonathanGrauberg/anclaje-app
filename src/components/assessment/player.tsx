"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, HeartHandshake } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CrisisLineList } from "@/components/patient/help-button";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/misc";
import { Slider } from "@/components/ui/slider";
import { toScoringInput, toScreens, type AnswerMap } from "@/lib/assessments/doc";
import type { CrisisLineDTO } from "@/lib/queries/common";
import { scoreAssessment } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { AssessmentDoc, DocQuestion } from "@/lib/validation/assessment";

export type PlayerAnswer = {
  valueNumber?: number | null;
  optionIds?: string[];
  text?: string;
  valueDate?: string | null;
};
export type PlayerAnswers = Record<string, PlayerAnswer | undefined>;

export type CompleteResult = {
  critical: boolean;
  closingMessage: string | null;
  score: { total: number | null; label: string | null; text: string | null } | null;
};

type ActionRes<T> = { ok: true; data: T } | { ok: false; error: string };

function isAnswered(q: DocQuestion, a: PlayerAnswer | undefined) {
  if (q.type === "INFO") return true;
  if (!a) return false;
  return (
    (a.optionIds?.length ?? 0) > 0 ||
    (a.valueNumber !== null && a.valueNumber !== undefined) ||
    !!a.text?.trim() ||
    !!a.valueDate
  );
}

/**
 * Cuestionario "una pregunta (o bloque) por pantalla". En modo vista previa no guarda nada y
 * calcula el puntaje en el cliente; en modo real guarda cada respuesta y cierra en el servidor.
 */
export function AssessmentPlayer({
  doc,
  initialAnswers = {},
  crisisLines = [],
  preview = false,
  onAnswer,
  onComplete,
  exitHref = "/app/tareas",
}: {
  doc: AssessmentDoc;
  initialAnswers?: PlayerAnswers;
  crisisLines?: CrisisLineDTO[];
  preview?: boolean;
  onAnswer?: (questionId: string, answer: PlayerAnswer) => Promise<ActionRes<unknown>>;
  onComplete?: () => Promise<ActionRes<CompleteResult>>;
  exitHref?: string;
}) {
  const screens = useMemo(() => toScreens(doc.questions), [doc.questions]);
  const [answers, setAnswers] = useState<PlayerAnswers>(initialAnswers);
  // -1 = presentación; screens.length = cierre.
  const firstPending = screens.findIndex((s) =>
    s.some((q) => !isAnswered(q, initialAnswers[q.key])),
  );
  const resumed = Object.keys(initialAnswers).length > 0;
  const [index, setIndex] = useState(
    resumed ? (firstPending === -1 ? screens.length : firstPending) : -1,
  );
  const [dir, setDir] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [result, setResult] = useState<CompleteResult | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const screen = index >= 0 && index < screens.length ? screens[index] : null;
  const canNext = !screen || screen.every((q) => !q.required || isAnswered(q, answers[q.key]));

  function update(q: DocQuestion, a: PlayerAnswer, debounce = false) {
    setAnswers((prev) => ({ ...prev, [q.key]: a }));
    setError(null);
    if (!onAnswer) return;
    const send = () =>
      onAnswer(q.key, a).then((res) => {
        if (!res.ok) setError(res.error);
      });
    clearTimeout(timers.current.get(q.key));
    if (debounce) timers.current.set(q.key, setTimeout(send, 700));
    else void send();
  }

  function go(to: number) {
    setDir(to > index ? 1 : -1);
    setIndex(to);
    setError(null);
  }

  async function finish() {
    setFinishing(true);
    setError(null);
    if (preview || !onComplete) {
      const map: AnswerMap = Object.fromEntries(
        Object.entries(answers).map(([k, a]) => [
          k,
          { valueNumber: a?.valueNumber, optionKeys: a?.optionIds },
        ]),
      );
      const r = scoreAssessment(toScoringInput(doc, map));
      setResult({
        critical: r.criticalKeys.length > 0,
        closingMessage: doc.closingMessage,
        score: {
          total: r.total,
          label: r.totalRange?.label ?? null,
          text: r.totalRange?.text ?? null,
        },
      });
    } else {
      // Esperar a que salgan los textos que estaban por guardarse.
      timers.current.forEach((t) => clearTimeout(t));
      await Promise.all(
        Object.entries(answers)
          .filter(([key]) => timers.current.has(key))
          .map(([key, a]) => onAnswer?.(key, a!)),
      );
      timers.current.clear();
      const res = await onComplete();
      if (!res.ok) setError(res.error);
      else setResult(res.data);
    }
    setFinishing(false);
  }

  if (result)
    return (
      <ResultScreen result={result} preview={preview} lines={crisisLines} exitHref={exitHref} />
    );

  const progress = screens.length
    ? (Math.max(0, Math.min(index, screens.length)) / screens.length) * 100
    : 0;

  return (
    <div className="flex flex-col gap-5">
      <Progress value={progress} label="Avance del cuestionario" />
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.section
          key={index}
          custom={dir}
          initial={{ opacity: 0, x: 30 * dir }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 * dir }}
          transition={{ duration: 0.2 }}
          className="flex min-h-64 flex-col gap-5"
          aria-live="polite"
        >
          {index === -1 && (
            <div className="flex flex-col gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
              {doc.instructions && (
                <p className="leading-relaxed whitespace-pre-wrap">{doc.instructions}</p>
              )}
              {doc.referencePeriod && (
                <p className="bg-primary-soft text-primary rounded-2xl p-3 text-sm">
                  Pensá en {doc.referencePeriod}.
                </p>
              )}
              <p className="text-muted-foreground text-sm">
                {screens.length} {screens.length === 1 ? "pantalla" : "pantallas"}. Se guarda a
                medida que respondés: podés dejarlo y seguir después.
              </p>
            </div>
          )}
          {screen?.map((q) => (
            <QuestionView
              key={q.key}
              q={q}
              compact={screen.length > 1}
              answer={answers[q.key]}
              onChange={update}
            />
          ))}
          {index === screens.length && (
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold">Listo, llegaste al final</h2>
              <p className="text-muted-foreground">
                Si querés, volvé atrás para revisar. Cuando lo envíes ya no se puede cambiar.
              </p>
            </div>
          )}
        </motion.section>
      </AnimatePresence>
      <FieldError>{error}</FieldError>
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => go(index - 1)} disabled={index === -1}>
          <ArrowLeft /> Atrás
        </Button>
        {index < screens.length ? (
          <Button onClick={() => go(index + 1)} disabled={!canNext} size="lg">
            {index === -1 ? "Empezar" : "Seguir"} <ArrowRight />
          </Button>
        ) : (
          <Button onClick={finish} disabled={finishing} size="lg">
            <Check /> {finishing ? "Enviando…" : "Enviar"}
          </Button>
        )}
      </div>
    </div>
  );
}

function QuestionView({
  q,
  answer,
  onChange,
  compact,
}: {
  q: DocQuestion;
  answer: PlayerAnswer | undefined;
  onChange: (q: DocQuestion, a: PlayerAnswer, debounce?: boolean) => void;
  compact: boolean;
}) {
  const titleId = `q-${q.key}`;
  if (q.type === "INFO") {
    return (
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold">{q.text || "Título"}</h2>
        {q.helpText && <p className="text-muted-foreground whitespace-pre-wrap">{q.helpText}</p>}
      </div>
    );
  }
  const selected = answer?.optionIds ?? [];
  const toggle = (id: string) => {
    if (q.type === "MULTIPLE_CHOICE") {
      const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
      onChange(q, { optionIds: next });
    } else onChange(q, { optionIds: [id] });
  };

  return (
    <fieldset
      aria-labelledby={titleId}
      className={cn("flex flex-col gap-3", compact && "bg-card rounded-2xl border p-4")}
    >
      <legend id={titleId} className={cn("font-semibold", compact ? "text-base" : "text-xl")}>
        {q.text || "Pregunta sin texto"}
        {!q.required && (
          <span className="text-muted-foreground ml-2 text-sm font-normal">(opcional)</span>
        )}
      </legend>
      {q.helpText && <p className="text-muted-foreground -mt-1 text-sm">{q.helpText}</p>}

      {(q.type === "SINGLE_CHOICE" ||
        q.type === "MULTIPLE_CHOICE" ||
        q.type === "YES_NO" ||
        q.type === "LIKERT") && (
        <div
          role={q.type === "MULTIPLE_CHOICE" ? "group" : "radiogroup"}
          aria-labelledby={titleId}
          className={cn(
            "flex gap-2",
            q.type === "LIKERT" && compact
              ? "flex-wrap"
              : q.type === "YES_NO"
                ? "flex-row"
                : "flex-col",
          )}
        >
          {q.options.map((o) => {
            const on = selected.includes(o.key);
            return (
              <button
                key={o.key}
                type="button"
                role={q.type === "MULTIPLE_CHOICE" ? "checkbox" : "radio"}
                aria-checked={on}
                onClick={() => toggle(o.key)}
                className={cn(
                  "min-h-12 rounded-2xl border px-4 py-2.5 text-left transition-colors",
                  q.type === "YES_NO" && "flex-1 text-center",
                  q.type === "LIKERT" && compact && "flex-1 text-center text-sm",
                  on
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card hover:bg-muted",
                )}
              >
                {o.label || "Opción"}
              </button>
            );
          })}
        </div>
      )}

      {(q.type === "SLIDER" || q.type === "PERCENTAGE") && (
        <NumberSlider
          q={q}
          value={answer?.valueNumber ?? null}
          onChange={(v) => onChange(q, { valueNumber: v })}
        />
      )}

      {q.type === "NUMBER" && (
        <Input
          type="number"
          inputMode="decimal"
          aria-labelledby={titleId}
          min={q.config.min}
          max={q.config.max}
          value={answer?.valueNumber ?? ""}
          onChange={(e) =>
            onChange(
              q,
              { valueNumber: e.target.value === "" ? null : Number(e.target.value) },
              true,
            )
          }
          className="max-w-48"
        />
      )}
      {q.type === "SHORT_TEXT" && (
        <Input
          aria-labelledby={titleId}
          maxLength={300}
          value={answer?.text ?? ""}
          onChange={(e) => onChange(q, { text: e.target.value }, true)}
        />
      )}
      {q.type === "LONG_TEXT" && (
        <Textarea
          aria-labelledby={titleId}
          maxLength={5000}
          value={answer?.text ?? ""}
          onChange={(e) => onChange(q, { text: e.target.value }, true)}
        />
      )}
      {q.type === "DATE" && (
        <Input
          type="date"
          aria-labelledby={titleId}
          className="max-w-56"
          value={answer?.valueDate ?? ""}
          onChange={(e) => onChange(q, { valueDate: e.target.value || null })}
        />
      )}
    </fieldset>
  );
}

function NumberSlider({
  q,
  value,
  onChange,
}: {
  q: DocQuestion;
  value: number | null;
  onChange: (v: number) => void;
}) {
  const pct = q.type === "PERCENTAGE";
  const min = pct ? 0 : (q.config.min ?? 0);
  const max = pct ? 100 : (q.config.max ?? 10);
  const step = pct ? 5 : (q.config.step ?? 1);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-3xl font-semibold tabular-nums" aria-hidden>
        {value === null ? "–" : `${value}${pct ? " %" : ""}`}
      </p>
      <Slider
        label={q.text || "Valor"}
        min={min}
        max={max}
        step={step}
        value={value ?? Math.round((min + max) / 2)}
        onValueChange={onChange}
        valueText={(v) => `${v}${pct ? " por ciento" : ""}`}
      />
      <div className="text-muted-foreground flex justify-between text-xs" aria-hidden>
        <span>{q.config.minLabel ?? min}</span>
        <span>{q.config.maxLabel ?? max}</span>
      </div>
      {value === null && (
        <p className="text-muted-foreground text-center text-sm">Mové el control para responder.</p>
      )}
    </div>
  );
}

function ResultScreen({
  result,
  preview,
  lines,
  exitHref,
}: {
  result: CompleteResult;
  preview: boolean;
  lines: CrisisLineDTO[];
  exitHref: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-5"
    >
      <div className="bg-primary-soft text-primary flex size-14 items-center justify-center rounded-full">
        <Check className="size-7" aria-hidden />
      </div>
      <h2 className="text-2xl font-semibold">Gracias por tomarte este tiempo</h2>
      <p className="leading-relaxed whitespace-pre-wrap">
        {result.closingMessage || "Tu psicóloga lo va a ver y lo van a poder charlar en sesión."}
      </p>
      {result.score && result.score.total !== null && (
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-muted-foreground text-sm">
            {preview ? "Puntaje (vista previa)" : "Tu resultado"}
          </p>
          <p className="text-2xl font-semibold tabular-nums">
            {result.score.total}
            {result.score.label && (
              <span className="ml-2 text-base font-medium">· {result.score.label}</span>
            )}
          </p>
          {result.score.text && (
            <p className="text-muted-foreground mt-1 text-sm">{result.score.text}</p>
          )}
        </div>
      )}
      {result.critical && (
        <section
          className="flex flex-col gap-3 rounded-3xl border p-4"
          aria-labelledby="critical-title"
        >
          <h3 id="critical-title" className="flex items-center gap-2 text-lg font-semibold">
            <HeartHandshake className="text-primary size-5" aria-hidden />
            Algunas respuestas nos dicen que puede ser un momento difícil
          </h3>
          {preview ? (
            <p className="text-muted-foreground text-sm">
              Vista previa: acá el paciente ve un acceso a su plan de calma y las líneas de ayuda.
            </p>
          ) : (
            <>
              <p className="text-muted-foreground">
                No tenés que atravesarlo sin ayuda. Si sentís que no podés más, llamá: te atienden
                personas, gratis y a cualquier hora.
              </p>
              <CrisisLineList lines={lines} />
              <Button asChild variant="soft">
                <Link href="/app/plan-de-calma">Ir a mi plan de calma</Link>
              </Button>
            </>
          )}
        </section>
      )}
      {!preview && (
        <Button asChild variant="outline">
          <Link href={exitHref}>Volver</Link>
        </Button>
      )}
    </motion.div>
  );
}
