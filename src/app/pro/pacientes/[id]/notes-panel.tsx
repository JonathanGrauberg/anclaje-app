"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Textarea } from "@/components/ui/input";
import { deleteClinicalNote, saveClinicalNote } from "@/lib/actions/pro";
import { formatRelative } from "@/lib/dates";

type Note = { id: string; body: string; createdAt: string; updatedAt: string };

export function NotesPanel({ patientId, notes }: { patientId: string; notes: Note[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <NoteForm patientId={patientId} key="new" />
      <FieldError>{error}</FieldError>
      <ul className="flex flex-col gap-3">
        {notes.map((n) => (
          <li key={n.id} className="bg-card rounded-2xl border p-4">
            {editingId === n.id ? (
              <NoteForm patientId={patientId} note={n} onDone={() => setEditingId(null)} />
            ) : (
              <>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-xs">
                    {formatRelative(new Date(n.createdAt))}
                    {n.updatedAt !== n.createdAt && " · editada"}
                  </p>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Editar nota"
                      onClick={() => setEditingId(n.id)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Borrar nota"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm("¿Borrar esta nota? No se puede deshacer.")) return;
                        start(async () => {
                          const res = await deleteClinicalNote(n.id);
                          setError(res.ok ? null : res.error);
                        });
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap">{n.body}</p>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function NoteForm({
  patientId,
  note,
  onDone,
}: {
  patientId: string;
  note?: Note;
  onDone?: () => void;
}) {
  const [body, setBody] = useState(note?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fieldId = `note-${note?.id ?? "new"}`;

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveClinicalNote({ id: note?.id, patientId, body });
          if (!res.ok) return setError(res.error);
          setError(null);
          if (!note) setBody("");
          onDone?.();
        });
      }}
    >
      {!note && <Label htmlFor={fieldId}>Nueva nota</Label>}
      <Textarea
        id={fieldId}
        value={body}
        maxLength={20_000}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Observaciones de la sesión, hipótesis, próximos pasos…"
      />
      <FieldError>{error}</FieldError>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? "Guardando…" : note ? "Guardar cambios" : "Guardar nota"}
        </Button>
        {onDone && (
          <Button type="button" size="sm" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
