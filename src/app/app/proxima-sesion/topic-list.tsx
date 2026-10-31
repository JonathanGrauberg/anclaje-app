"use client";

import { Check, Link2, MessageCircleHeart, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/misc";
import { addSessionTopic, deleteSessionTopic, setTopicDiscussed } from "@/lib/actions/topics";
import { formatRelative } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Topic = {
  id: string;
  text: string;
  createdAt: string;
  discussed: boolean;
  href: string | null;
};

export function TopicList({ topics }: { topics: Topic[] }) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [optimistic, apply] = useOptimistic(
    topics,
    (state, action: { type: "toggle" | "delete"; id: string }) =>
      action.type === "delete"
        ? state.filter((t) => t.id !== action.id)
        : state.map((t) => (t.id === action.id ? { ...t, discussed: !t.discussed } : t)),
  );

  const pendingTopics = optimistic.filter((t) => !t.discussed);
  const discussed = optimistic.filter((t) => t.discussed);

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setError(null);
    start(async () => {
      const res = await addSessionTopic({ text });
      if (!res.ok) return setError(res.error);
      setText("");
    });
  }

  function toggle(t: Topic) {
    start(async () => {
      apply({ type: "toggle", id: t.id });
      const res = await setTopicDiscussed(t.id, !t.discussed);
      if (!res.ok) setError(res.error);
    });
  }

  function remove(t: Topic) {
    start(async () => {
      apply({ type: "delete", id: t.id });
      const res = await deleteSessionTopic(t.id);
      if (!res.ok) setError(res.error);
    });
  }

  const item = (t: Topic) => (
    <motion.li
      key={t.id}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-card flex items-start gap-3 rounded-2xl border p-3"
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={t.discussed}
        aria-label={
          t.discussed ? `Marcar "${t.text}" como pendiente` : `Marcar "${t.text}" como hablado`
        }
        onClick={() => toggle(t)}
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          t.discussed
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input hover:border-primary",
        )}
      >
        {t.discussed && <Check className="size-4" aria-hidden />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={cn("whitespace-pre-wrap", t.discussed && "text-muted-foreground line-through")}
        >
          {t.text}
        </p>
        <p className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
          {formatRelative(new Date(t.createdAt))}
          {t.href && (
            <Link
              href={t.href}
              className="inline-flex items-center gap-1 underline-offset-2 hover:underline"
            >
              <Link2 className="size-3" aria-hidden /> ver entrada
            </Link>
          )}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => remove(t)}
        aria-label={`Borrar "${t.text}"`}
      >
        <Trash2 />
      </Button>
    </motion.li>
  );

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={add} className="flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Algo que quieras hablar…"
          aria-label="Nuevo tema"
          maxLength={500}
        />
        <Button
          type="submit"
          size="icon"
          className="size-12"
          disabled={pending || !text.trim()}
          aria-label="Agregar"
        >
          <Plus />
        </Button>
      </form>
      <FieldError>{error}</FieldError>

      {optimistic.length === 0 ? (
        <EmptyState icon={<MessageCircleHeart />} title="Nada anotado todavía">
          A veces en la sesión se nos olvida lo que queríamos decir. Anotalo acá, o desde cualquier
          entrada con “Agregar a la próxima sesión”.
        </EmptyState>
      ) : (
        <>
          <section aria-labelledby="pending-title">
            <h2 id="pending-title" className="mb-3 font-semibold">
              Pendientes{" "}
              {pendingTopics.length > 0 && (
                <span className="text-muted-foreground">({pendingTopics.length})</span>
              )}
            </h2>
            {pendingTopics.length === 0 ? (
              <p className="text-muted-foreground">No hay temas pendientes.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                <AnimatePresence initial={false}>{pendingTopics.map(item)}</AnimatePresence>
              </ul>
            )}
          </section>
          {discussed.length > 0 && (
            <section aria-labelledby="done-title">
              <h2 id="done-title" className="text-muted-foreground mb-3 font-semibold">
                Ya lo hablamos
              </h2>
              <ul className="flex flex-col gap-2">
                <AnimatePresence initial={false}>{discussed.map(item)}</AnimatePresence>
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
