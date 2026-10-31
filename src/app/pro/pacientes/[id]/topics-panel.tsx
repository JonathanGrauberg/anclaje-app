"use client";

import { Check } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { markTopicDiscussedByPro } from "@/lib/actions/pro";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Topic = { id: string; text: string; createdAt: string; discussed: boolean };

export function TopicsPanel({ topics }: { topics: Topic[] }) {
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    topics,
    (state, { id, discussed }: { id: string; discussed: boolean }) =>
      state.map((t) => (t.id === id ? { ...t, discussed } : t)),
  );

  if (optimistic.length === 0) {
    return (
      <p className="text-muted-foreground bg-card rounded-2xl border p-4 text-sm">
        No anotó temas todavía.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {optimistic.map((t) => (
        <li key={t.id} className="bg-card flex items-start gap-3 rounded-2xl border p-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={t.discussed}
            aria-label={t.discussed ? "Marcar como pendiente" : "Marcar como hablado"}
            onClick={() =>
              start(async () => {
                setOptimistic({ id: t.id, discussed: !t.discussed });
                await markTopicDiscussedByPro(t.id, !t.discussed);
              })
            }
            className={cn(
              "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
              t.discussed ? "bg-primary border-primary text-primary-foreground" : "border-input",
            )}
          >
            {t.discussed && <Check className="size-4" />}
          </button>
          <div
            className={cn("min-w-0 text-sm", t.discussed && "text-muted-foreground line-through")}
          >
            <p className="break-words whitespace-pre-wrap">{t.text}</p>
            <p className="text-muted-foreground mt-0.5 text-xs no-underline">
              {formatRelative(new Date(t.createdAt))}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
