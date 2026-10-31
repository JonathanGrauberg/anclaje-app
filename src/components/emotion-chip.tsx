import { intensityWord, type EmotionIndex } from "@/lib/emotions/tree";
import { cn } from "@/lib/utils";

/** Chip de emoción con su color de la rueda e intensidad opcional. Sirve en servidor y cliente. */
export function EmotionChip({
  index,
  nodeId,
  intensity,
  className,
}: {
  index: EmotionIndex;
  nodeId: string;
  intensity?: number | null;
  className?: string;
}) {
  const e = index.get(nodeId);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-medium text-[var(--wheel-text)]",
        className,
      )}
      style={{ background: e?.node.color ?? "var(--muted)" }}
      title={e?.path.map((n) => n.label).join(" › ")}
    >
      {e?.node.label ?? "Emoción"}
      {intensity != null && (
        <span
          className="rounded-full bg-white/60 px-1.5 text-xs tabular-nums"
          aria-label={`intensidad ${intensity}, ${intensityWord(intensity)}`}
        >
          {intensity}
        </span>
      )}
    </span>
  );
}
