"use client";

import { Check, MessageSquare } from "lucide-react";
import { useOptimistic, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Textarea } from "@/components/ui/input";
import { updateTaskProgress } from "@/lib/actions/patient-plan";
import { formatDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  from: string;
  dueAt: string | null;
  done: boolean;
  comment: string;
};

export function TaskList({ tasks }: { tasks: Task[] }) {
  const [, start] = useTransition();
  const [optimistic, setDone] = useOptimistic(
    tasks,
    (state, { id, done }: { id: string; done: boolean }) =>
      state.map((t) => (t.id === id ? { ...t, done } : t)),
  );

  return (
    <ul className="flex flex-col gap-3">
      {optimistic.map((t) => (
        <li key={t.id} className="bg-card flex flex-col gap-3 rounded-3xl border p-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              role="checkbox"
              aria-checked={t.done}
              aria-label={
                t.done ? `Marcar “${t.title}” como pendiente` : `Marcar “${t.title}” como hecha`
              }
              onClick={() =>
                start(async () => {
                  setDone({ id: t.id, done: !t.done });
                  await updateTaskProgress({ id: t.id, done: !t.done });
                })
              }
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                t.done ? "bg-primary border-primary text-primary-foreground" : "border-input",
              )}
            >
              {t.done && <Check className="size-5" />}
            </button>
            <div className="min-w-0">
              <p
                className={cn(
                  "text-lg font-medium",
                  t.done && "text-muted-foreground line-through",
                )}
              >
                {t.title}
              </p>
              <p className="text-muted-foreground text-sm">
                De {t.from}
                {t.dueAt && ` · para el ${formatDate(new Date(t.dueAt))}`}
              </p>
              {t.description && <p className="mt-2 whitespace-pre-wrap">{t.description}</p>}
            </div>
          </div>
          <TaskComment task={t} />
        </li>
      ))}
    </ul>
  );
}

function TaskComment({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState(task.comment);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <div className="flex flex-col gap-1 pl-11">
        {task.comment && (
          <p className="bg-muted rounded-xl p-3 text-sm whitespace-pre-wrap">{task.comment}</p>
        )}
        <Button variant="ghost" size="sm" className="self-start" onClick={() => setOpen(true)}>
          <MessageSquare /> {task.comment ? "Editar comentario" : "Contale cómo te fue"}
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-2 pl-11"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateTaskProgress({ id: task.id, done: task.done, comment });
          if (!res.ok) return setError(res.error);
          setOpen(false);
        });
      }}
    >
      <Label htmlFor={`tc-${task.id}`}>Tu comentario (lo ve tu psicóloga)</Label>
      <Textarea
        id={`tc-${task.id}`}
        value={comment}
        maxLength={2000}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Cómo te fue, qué te costó, qué notaste…"
      />
      <FieldError>{error}</FieldError>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
