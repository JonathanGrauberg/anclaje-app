"use client";

import { ChevronDown, HeartHandshake, History, Sparkles } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { EmotionWheel } from "@/components/emotion-wheel/emotion-wheel";
import { IntensityList } from "@/components/emotion-wheel/intensity-list";
import type { EmotionPick, EmotionTreeNode } from "@/components/emotion-wheel/types";
import { pathLabel, useEmotionIndex } from "@/components/emotion-wheel/use-emotion-index";
import { AddToSessionButton } from "@/components/patient/add-to-session";
import { BodyZonePicker } from "@/components/patient/body-zones";
import { ShareControl, type ShareValue } from "@/components/patient/share-control";
import { Button } from "@/components/ui/button";
import { FieldError, Textarea } from "@/components/ui/input";
import { saveEmotionEntry } from "@/lib/actions/emotions";
import type { BodyZoneId, VisibilityValue } from "@/lib/constants";

const DEFAULT_INTENSITY = 5;

export function EmotionCheckIn({
  tree,
  defaultVisibility,
  hasProfessional,
}: {
  tree: EmotionTreeNode[];
  defaultVisibility: VisibilityValue;
  hasProfessional: boolean;
}) {
  const index = useEmotionIndex(tree);
  const initialShare: ShareValue = {
    visibility: defaultVisibility,
    intention: defaultVisibility === "SHARED" ? "JUST_FYI" : null,
  };
  const [picks, setPicks] = useState<EmotionPick[]>([]);
  const [bodyZones, setBodyZones] = useState<BodyZoneId[]>([]);
  const [note, setNote] = useState("");
  const [share, setShare] = useState<ShareValue>(initialShare);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ id: string; high: boolean; summary: string } | null>(null);
  const [pending, start] = useTransition();

  function toggle(nodeId: string) {
    setPicks((p) =>
      p.some((x) => x.nodeId === nodeId)
        ? p.filter((x) => x.nodeId !== nodeId)
        : [...p, { nodeId, intensity: DEFAULT_INTENSITY }],
    );
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await saveEmotionEntry({ picks, bodyZones, note: note || undefined, share });
      if (!res.ok) return setError(res.error);
      const summary = picks.map((p) => index.get(p.nodeId)?.node.label).join(", ");
      setSaved({ ...res.data, summary });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function reset() {
    setPicks([]);
    setBodyZones([]);
    setNote("");
    setShare(initialShare);
    setShowDetails(false);
    setSaved(null);
  }

  if (saved) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-5 py-6 text-center"
        aria-live="polite"
      >
        <motion.div
          initial={{ scale: 0.6, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 12 }}
          className="bg-primary-soft text-primary flex size-20 items-center justify-center rounded-full"
        >
          <Sparkles className="size-9" aria-hidden />
        </motion.div>
        <div>
          <h1 className="text-2xl font-semibold">Listo, quedó registrado</h1>
          <p className="text-muted-foreground mt-1">{saved.summary}</p>
        </div>

        {saved.high && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-accent text-accent-foreground w-full rounded-3xl p-5 text-left"
          >
            <p className="text-lg font-semibold">Parece que está siendo intenso.</p>
            <p className="mt-1 text-sm">
              ¿Querés ver tu plan de calma? Tiene cosas que te pueden ayudar ahora.
            </p>
            <Button asChild className="mt-4" variant="default">
              <Link href="/app/plan-de-calma">
                <HeartHandshake /> Ver mi plan de calma
              </Link>
            </Button>
          </motion.div>
        )}

        <AddToSessionButton
          sourceType="EMOTION"
          sourceId={saved.id}
          suggestion={`Me sentí ${saved.summary.toLowerCase()}`}
          variant="outline"
        />
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Registrar otra cosa</Button>
          <Button asChild variant="ghost">
            <Link href="/app">Volver al inicio</Link>
          </Button>
        </div>
      </motion.section>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">¿Qué estás sintiendo?</h1>
          <p className="text-muted-foreground">Podés elegir más de una. Casi nunca es una sola.</p>
        </div>
        <Button asChild variant="ghost" size="icon" aria-label="Ver lo que registré">
          <Link href="/app/rueda/historial">
            <History />
          </Link>
        </Button>
      </header>

      <EmotionWheel tree={tree} selected={picks.map((p) => p.nodeId)} onToggle={toggle} />

      {picks.length > 0 && (
        <section aria-labelledby="intensity-title" className="flex flex-col gap-3">
          <h2 id="intensity-title" className="text-lg font-semibold">
            ¿Con qué intensidad?
          </h2>
          <IntensityList
            index={index}
            items={picks}
            onChange={(nodeId, intensity) =>
              setPicks((p) => p.map((x) => (x.nodeId === nodeId ? { ...x, intensity } : x)))
            }
            onRemove={toggle}
          />
        </section>
      )}

      {picks.length > 0 && (
        <section className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setShowDetails((s) => !s)}
            aria-expanded={showDetails}
            className="bg-card flex items-center justify-between rounded-2xl border px-4 py-3 text-left font-medium"
          >
            <span>
              Sumar detalles <span className="text-muted-foreground font-normal">(opcional)</span>
            </span>
            <ChevronDown
              className={`size-5 transition-transform ${showDetails ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          <AnimatePresence initial={false}>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="flex flex-col gap-5 overflow-hidden"
              >
                <BodyZonePicker value={bodyZones} onChange={setBodyZones} />
                <div className="flex flex-col gap-2">
                  <label htmlFor="note" className="font-medium">
                    ¿Querés anotar algo?
                  </label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    placeholder="Qué pasó, dónde estabas…"
                    className="min-h-20"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <ShareControl
            value={share}
            onChange={setShare}
            hasProfessional={hasProfessional}
            compact
          />
        </section>
      )}

      <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 pr-28">
        <FieldError>{error}</FieldError>
        <Button
          size="lg"
          className="w-full shadow-lg"
          disabled={picks.length === 0 || pending}
          onClick={save}
          aria-describedby={picks.length === 0 ? "save-hint" : undefined}
        >
          {pending ? "Guardando…" : picks.length === 0 ? "Elegí una emoción" : "Guardar"}
        </Button>
        {picks.length === 0 && (
          <span id="save-hint" className="sr-only">
            Elegí al menos una emoción para guardar
          </span>
        )}
      </div>

      {picks.length > 0 && (
        <p className="sr-only" aria-live="polite">
          Elegiste: {picks.map((p) => pathLabel(index, p.nodeId)).join("; ")}
        </p>
      )}
    </div>
  );
}
