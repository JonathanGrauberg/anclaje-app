"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { CopingCardForm, type CopingCardValue } from "@/components/coping-card-form";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import {
  deleteCopingCardForPatient,
  moveCopingCard,
  saveCopingCardForPatient,
} from "@/lib/actions/pro";
import { COPING_CARD_LABELS, COPING_CARD_TYPES } from "@/lib/validation/pro";

type Card = CopingCardValue & { id: string; author: "PROFESSIONAL" | "PATIENT" };

export function CopingEditor({ patientId, cards }: { patientId: string; cards: Card[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const save = saveCopingCardForPatient.bind(null, patientId);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      setError(res.ok ? null : (res.error ?? "Algo salió mal"));
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Así lo ve el paciente en “Mi plan de calma”, en este orden. Las fichas que agregó el
          paciente las podés mover, pero no editar.
        </p>
        <FieldError>{error}</FieldError>
        {cards.length === 0 && (
          <p className="text-muted-foreground bg-card rounded-2xl border p-4">
            El plan está vacío. Empezá por una frase o una actividad que le sirva.
          </p>
        )}
        <ol className="flex flex-col gap-2">
          {cards.map((c, i) => (
            <li key={c.id} className="bg-card rounded-2xl border p-4">
              {editingId === c.id ? (
                <CopingCardForm
                  initial={c}
                  types={COPING_CARD_TYPES}
                  onSave={save}
                  onDone={() => setEditingId(null)}
                />
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex flex-wrap gap-1.5">
                      <Badge>{COPING_CARD_LABELS[c.type]}</Badge>
                      {c.author === "PATIENT" && (
                        <Badge className="bg-accent text-accent-foreground">
                          La agregó el paciente
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{c.title}</p>
                    {c.body && <p className="text-muted-foreground text-sm">{c.body}</p>}
                    {c.phone && <p className="text-muted-foreground text-sm">{c.phone}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Subir"
                      disabled={pending || i === 0}
                      onClick={() => run(() => moveCopingCard(patientId, c.id, -1))}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Bajar"
                      disabled={pending || i === cards.length - 1}
                      onClick={() => run(() => moveCopingCard(patientId, c.id, 1))}
                    >
                      <ArrowDown />
                    </Button>
                    {c.author === "PROFESSIONAL" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Editar ${c.title}`}
                          onClick={() => setEditingId(c.id)}
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Borrar ${c.title}`}
                          disabled={pending}
                          onClick={() => {
                            if (!confirm("¿Borrar esta ficha del plan?")) return;
                            run(() => deleteCopingCardForPatient(patientId, c.id));
                          }}
                        >
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="bg-card h-fit rounded-2xl border p-4">
        <h2 className="mb-3 font-semibold">Agregar ficha</h2>
        <CopingCardForm types={COPING_CARD_TYPES} onSave={save} submitLabel="Agregar al plan" />
      </div>
    </div>
  );
}
