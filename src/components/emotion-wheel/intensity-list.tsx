"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Slider } from "@/components/ui/slider";
import { intensityWord, type EmotionIndex } from "@/lib/emotions/tree";

type Item = { nodeId: string; intensity: number };

/** Emociones elegidas, cada una con su intensidad 1–10. */
export function IntensityList({
  index,
  items,
  onChange,
  onRemove,
  question = "¿Con qué intensidad?",
}: {
  index: EmotionIndex;
  items: Item[];
  onChange: (nodeId: string, intensity: number) => void;
  onRemove?: (nodeId: string) => void;
  question?: string;
}) {
  return (
    <ul className="flex flex-col gap-3" aria-label="Emociones elegidas">
      <AnimatePresence initial={false}>
        {items.map(({ nodeId, intensity }) => {
          const entry = index.get(nodeId);
          if (!entry) return null;
          const { node, path, family } = entry;
          return (
            <motion.li
              key={nodeId}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="bg-card rounded-2xl border p-4"
              style={{ borderLeft: `6px solid ${family.color}` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{node.label}</p>
                  {path.length > 1 && (
                    <p className="text-muted-foreground text-xs">
                      {path
                        .slice(0, -1)
                        .map((n) => n.label)
                        .join(" › ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-right">
                    <span className="block text-2xl leading-none font-semibold tabular-nums">
                      {intensity}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {intensityWord(intensity)}
                    </span>
                  </span>
                  {onRemove && (
                    <button
                      type="button"
                      onClick={() => onRemove(nodeId)}
                      className="text-muted-foreground hover:bg-muted -mr-2 ml-1 rounded-full p-2"
                      aria-label={`Quitar ${node.label}`}
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
              <Slider
                className="mt-2"
                min={1}
                max={10}
                step={1}
                value={intensity}
                onValueChange={(v) => onChange(nodeId, v)}
                color={family.color}
                label={`${question} ${node.label}`}
                valueText={(v) => `${v} de 10, ${intensityWord(v)}`}
              />
              <div className="text-muted-foreground flex justify-between text-xs" aria-hidden>
                <span>1</span>
                <span>10</span>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </ul>
  );
}
