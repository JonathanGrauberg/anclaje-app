"use client";

import { CheckCircle2, Circle, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { createTask, deleteTask } from "@/lib/actions/pro";
import { formatDate, formatRelative, fromLocalInputValue } from "@/lib/dates";
import { cn } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  description: string | null;
  dueAt: string | null;
  completedAt: string | null;
  comment: string | null;
  overdue: boolean;
};

export function TasksPanel({ patientId, tasks }: { patientId: string; tasks: Task[] }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <ul className="flex flex-col gap-3">
        {tasks.length === 0 && (
          <li className="text-muted-foreground bg-card rounded-2xl border p-4">
            Todavía no le propusiste tareas.
          </li>
        )}
        {tasks.map((t) => {
          const { overdue } = t;
          return (
            <li key={t.id} className="bg-card flex flex-col gap-2 rounded-2xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {t.completedAt ? (
                    <CheckCircle2
                      className="text-primary mt-0.5 size-5 shrink-0"
                      aria-label="Hecha"
                    />
                  ) : (
                    <Circle
                      className="text-muted-foreground mt-0.5 size-5 shrink-0"
                      aria-label="Pendiente"
                    />
                  )}
                  <div>
                    <p className={cn("font-medium", t.completedAt && "text-muted-foreground")}>
                      {t.title}
                    </p>
                    <p className={cn("text-sm", overdue ? "text-danger" : "text-muted-foreground")}>
                      {t.completedAt
                        ? `La hizo ${formatRelative(new Date(t.completedAt))}`
                        : t.dueAt
                          ? `${overdue ? "Venció" : "Vence"} el ${formatDate(new Date(t.dueAt))}`
                          : "Sin fecha límite"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Borrar tarea ${t.title}`}
                  disabled={pending}
                  onClick={() => {
                    if (!confirm("¿Borrar esta tarea? El paciente deja de verla.")) return;
                    start(async () => {
                      const res = await deleteTask(t.id);
                      setError(res.ok ? null : res.error);
                    });
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
              {t.description && (
                <p className="text-muted-foreground text-sm whitespace-pre-wrap">{t.description}</p>
              )}
              {t.comment && (
                <blockquote className="bg-muted rounded-xl p-3 text-sm whitespace-pre-wrap">
                  <span className="text-muted-foreground mb-1 block text-xs">
                    Comentario del paciente
                  </span>
                  {t.comment}
                </blockquote>
              )}
            </li>
          );
        })}
      </ul>

      <form
        className="bg-card flex h-fit flex-col gap-3 rounded-2xl border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await createTask({
              patientId,
              title,
              description,
              dueAt: due ? fromLocalInputValue(`${due}T23:59`) : null,
            });
            if (!res.ok) return setError(res.error);
            setError(null);
            setTitle("");
            setDescription("");
            setDue("");
          });
        }}
      >
        <h2 className="font-semibold">Nueva tarea</h2>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-title">Qué le proponés</Label>
          <Input
            id="task-title"
            value={title}
            maxLength={150}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej.: registrar en la rueda dos veces por día"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-desc">Detalle (opcional)</Label>
          <Textarea
            id="task-desc"
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="task-due">Fecha límite (opcional)</Label>
          <Input id="task-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </div>
        <FieldError>{error}</FieldError>
        <Button type="submit" disabled={pending || !title.trim()}>
          {pending ? "Guardando…" : "Asignar tarea"}
        </Button>
      </form>
    </div>
  );
}
