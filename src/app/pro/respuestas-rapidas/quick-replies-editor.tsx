"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { deleteQuickReply, saveQuickReply } from "@/lib/actions/pro";

type Reply = { id: string; title: string; body: string };

export function QuickRepliesEditor({ replies }: { replies: Reply[] }) {
  const [editing, setEditing] = useState<Reply | "new" | null>(replies.length ? null : "new");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex max-w-2xl flex-col gap-3">
      {replies.map((r) =>
        editing !== "new" && editing?.id === r.id ? (
          <ReplyForm key={r.id} initial={r} onDone={() => setEditing(null)} />
        ) : (
          <div
            key={r.id}
            className="bg-card flex items-start justify-between gap-3 rounded-2xl border p-4"
          >
            <div>
              <p className="font-medium">{r.title}</p>
              <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">{r.body}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Editar ${r.title}`}
                onClick={() => setEditing(r)}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Borrar ${r.title}`}
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteQuickReply(r.id);
                    setError(res.ok ? null : res.error);
                  })
                }
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ),
      )}
      <FieldError>{error}</FieldError>
      {editing === "new" ? (
        <ReplyForm onDone={() => setEditing(null)} />
      ) : (
        <Button variant="soft" className="self-start" onClick={() => setEditing("new")}>
          <Plus /> Nueva respuesta
        </Button>
      )}
    </div>
  );
}

function ReplyForm({ initial, onDone }: { initial?: Reply; onDone: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="bg-card flex flex-col gap-3 rounded-2xl border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveQuickReply({ id: initial?.id, title, body });
          if (!res.ok) return setError(res.error);
          onDone();
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qr-title">Título (para encontrarla)</Label>
        <Input
          id="qr-title"
          value={title}
          maxLength={60}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="qr-body">Texto</Label>
        <Textarea
          id="qr-body"
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <FieldError>{error}</FieldError>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
        <Button type="button" variant="ghost" onClick={onDone}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
