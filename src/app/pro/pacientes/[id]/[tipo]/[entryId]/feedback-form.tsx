"use client";

import { Send } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { addFeedback } from "@/lib/actions/pro";
import type { FeedbackTarget } from "@/lib/validation/pro";

export function FeedbackForm({
  targetType,
  targetId,
  quickReplies,
  resources,
}: {
  targetType: FeedbackTarget;
  targetId: string;
  quickReplies: { id: string; title: string; body: string }[];
  resources: { id: string; title: string }[];
}) {
  const [body, setBody] = useState("");
  const [discuss, setDiscuss] = useState(false);
  const [resourceId, setResourceId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  return (
    <form
      className="bg-card flex flex-col gap-3 rounded-2xl border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addFeedback({
            targetType,
            targetId,
            body,
            discussInSession: discuss,
            resourceId: resourceId || null,
          });
          if (!res.ok) return setError(res.error);
          setError(null);
          setBody("");
          setDiscuss(false);
          setResourceId("");
          setSent(true);
        });
      }}
    >
      {quickReplies.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Respuestas rápidas">
          {quickReplies.map((q) => (
            <button
              key={q.id}
              type="button"
              className="bg-muted hover:bg-primary-soft hover:text-primary rounded-full px-3 py-1 text-sm transition-colors"
              onClick={() => setBody((b) => (b.trim() ? `${b.trimEnd()}\n\n${q.body}` : q.body))}
            >
              {q.title}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="fb-body">Escribile una devolución</Label>
        <Textarea
          id="fb-body"
          value={body}
          maxLength={5000}
          onChange={(e) => {
            setBody(e.target.value);
            setSent(false);
          }}
          placeholder="La va a ver en la app, debajo de lo que compartió."
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={discuss} onCheckedChange={setDiscuss} />
          Lo vemos en sesión
        </label>
        {resources.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            Adjuntar recurso
            <select
              className="border-input bg-card h-9 rounded-lg border px-2"
              value={resourceId}
              onChange={(e) => setResourceId(e.target.value)}
            >
              <option value="">Ninguno</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <FieldError>{error}</FieldError>
      {sent && (
        <p role="status" className="text-primary text-sm">
          Listo, se la mandaste.
        </p>
      )}
      <Button type="submit" className="self-start" disabled={pending || !body.trim()}>
        <Send /> {pending ? "Enviando…" : "Enviar devolución"}
      </Button>
    </form>
  );
}
