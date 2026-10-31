"use client";

import { AlertTriangle, FileText, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import {
  addExternalResult,
  assignAssessment,
  cancelAssignment,
  deleteExternalResult,
} from "@/lib/actions/assessments";
import { formatDate, fromLocalInputValue } from "@/lib/dates";

type Assignment = {
  id: string;
  title: string;
  version: number;
  recurrenceDays: number | null;
  nextDueAt: string | null;
  inProgress: boolean;
};
type Response = {
  id: string;
  title: string;
  completedAt: string;
  totalScore: number | null;
  interpretation: string | null;
  critical: boolean;
  reviewed: boolean;
};
type External = {
  id: string;
  name: string;
  score: number | null;
  interpretation: string | null;
  takenAt: string;
  notes: string | null;
  storageKey: string | null;
};

const selectCls = "border-input bg-card h-11 rounded-xl border px-3";

export function AssessmentsPanel({
  patientId,
  available,
  assignments,
  responses,
  externals,
}: {
  patientId: string;
  available: { id: string; title: string }[];
  assignments: Assignment[];
  responses: Response[];
  externals: External[];
}) {
  const [assessmentId, setAssessmentId] = useState(available[0]?.id ?? "");
  const [recurrence, setRecurrence] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <section aria-labelledby="resp-title" className="flex flex-col gap-2">
          <h2 id="resp-title" className="font-semibold">
            Respuestas
          </h2>
          {responses.length === 0 ? (
            <p className="text-muted-foreground bg-card rounded-2xl border p-4 text-sm">
              Todavía no respondió ninguna.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {responses.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/pro/pacientes/${patientId}/evaluacion/${r.id}`}
                    className="bg-card hover:border-primary/40 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border p-4"
                  >
                    <span className="font-medium">{r.title}</span>
                    <span className="text-muted-foreground text-sm">
                      {formatDate(new Date(r.completedAt))}
                    </span>
                    {r.totalScore !== null && (
                      <span className="text-sm tabular-nums">
                        Puntaje <strong>{r.totalScore}</strong>
                        {r.interpretation && ` · ${r.interpretation}`}
                      </span>
                    )}
                    {r.critical && (
                      <span className="text-danger flex items-center gap-1 text-sm font-medium">
                        <AlertTriangle className="size-4" aria-hidden /> Ítem crítico
                      </span>
                    )}
                    <Badge className={r.reviewed ? undefined : "bg-primary-soft text-primary"}>
                      {r.reviewed ? "Revisada" : "Sin revisar"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="asg-title" className="flex flex-col gap-2">
          <h2 id="asg-title" className="font-semibold">
            Asignadas
          </h2>
          {assignments.length === 0 ? (
            <p className="text-muted-foreground bg-card rounded-2xl border p-4 text-sm">
              No tiene evaluaciones pendientes.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {assignments.map((a) => (
                <li
                  key={a.id}
                  className="bg-card flex flex-wrap items-center justify-between gap-2 rounded-2xl border p-4"
                >
                  <div>
                    <p className="font-medium">
                      {a.title} <span className="text-muted-foreground text-sm">v{a.version}</span>
                    </p>
                    <p className="text-muted-foreground text-sm">
                      {a.recurrenceDays ? `Cada ${a.recurrenceDays} días` : "Una vez"}
                      {a.inProgress
                        ? " · la está respondiendo"
                        : a.nextDueAt &&
                          ` · disponible desde el ${formatDate(new Date(a.nextDueAt))}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      if (!confirm("¿Dejar de pedirle esta evaluación?")) return;
                      start(async () => {
                        const res = await cancelAssignment(a.id);
                        setError(res.ok ? null : res.error);
                      });
                    }}
                  >
                    Cancelar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ExternalResults patientId={patientId} externals={externals} />
      </div>

      <form
        className="bg-card flex h-fit flex-col gap-3 rounded-2xl border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await assignAssessment({
              assessmentId,
              patientId,
              recurrenceDays: recurrence ? Number(recurrence) : null,
            });
            setError(res.ok ? null : res.error);
          });
        }}
      >
        <h2 className="font-semibold">Asignar evaluación</h2>
        {available.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No tenés evaluaciones publicadas.{" "}
            <Link href="/pro/evaluaciones" className="text-primary underline">
              Armá o publicá una
            </Link>
            .
          </p>
        ) : (
          <>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asg-assessment">Evaluación</Label>
              <select
                id="asg-assessment"
                className={selectCls}
                value={assessmentId}
                onChange={(e) => setAssessmentId(e.target.value)}
              >
                {available.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="asg-rec">Frecuencia</Label>
              <select
                id="asg-rec"
                className={selectCls}
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
              >
                <option value="">Una sola vez</option>
                <option value="7">Cada semana</option>
                <option value="14">Cada 2 semanas</option>
                <option value="30">Cada mes</option>
              </select>
            </div>
            <Button type="submit" disabled={pending || !assessmentId}>
              Asignar
            </Button>
          </>
        )}
        <FieldError>{error}</FieldError>
      </form>
    </div>
  );
}

function ExternalResults({ patientId, externals }: { patientId: string; externals: External[] }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [score, setScore] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [takenAt, setTakenAt] = useState("");
  const [notes, setNotes] = useState("");
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const body = new FormData();
    body.set("file", file);
    body.set("scope", "external");
    try {
      const res = await fetch("/api/files", { method: "POST", body });
      const json = (await res.json()) as { key?: string; error?: string };
      if (!res.ok || !json.key) setError(json.error ?? "No pudimos subir el archivo");
      else setStorageKey(json.key);
    } catch {
      setError("No pudimos subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section aria-labelledby="ext-title" className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 id="ext-title" className="font-semibold">
          Resultados externos
        </h2>
        {!open && (
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            Cargar resultado
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-sm">
        Tests tomados fuera de la app (en papel o en otra plataforma). Podés adjuntar el PDF
        escaneado. El paciente no los ve.
      </p>
      {externals.map((x) => (
        <div
          key={x.id}
          className="bg-card flex items-start justify-between gap-3 rounded-2xl border p-4"
        >
          <div>
            <p className="font-medium">
              {x.name}{" "}
              <span className="text-muted-foreground text-sm">
                · {formatDate(new Date(x.takenAt))}
              </span>
            </p>
            {(x.score !== null || x.interpretation) && (
              <p className="text-sm">
                {x.score !== null && (
                  <>
                    Puntaje <strong className="tabular-nums">{x.score}</strong>
                  </>
                )}
                {x.interpretation && ` · ${x.interpretation}`}
              </p>
            )}
            {x.notes && (
              <p className="text-muted-foreground mt-1 text-sm whitespace-pre-wrap">{x.notes}</p>
            )}
            {x.storageKey && (
              <a
                href={`/api/files/${x.storageKey}`}
                target="_blank"
                rel="noopener"
                className="text-primary mt-1 inline-flex items-center gap-1 text-sm underline"
              >
                <FileText className="size-4" aria-hidden /> Ver archivo
              </a>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Borrar ${x.name}`}
            onClick={() => {
              if (!confirm("¿Borrar este resultado?")) return;
              start(async () => {
                await deleteExternalResult(x.id);
              });
            }}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      {open && (
        <form
          className="bg-card flex flex-col gap-3 rounded-2xl border p-4"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await addExternalResult({
                patientId,
                name,
                score: score === "" ? null : Number(score),
                interpretation,
                takenAt: takenAt ? fromLocalInputValue(`${takenAt}T12:00`) : new Date(),
                notes,
                storageKey,
              });
              if (!res.ok) return setError(res.error);
              setOpen(false);
              setName("");
              setScore("");
              setInterpretation("");
              setNotes("");
              setStorageKey(null);
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ext-name">Instrumento</Label>
              <Input
                id="ext-name"
                value={name}
                maxLength={200}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej.: BDI-II"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ext-date">Fecha</Label>
              <Input
                id="ext-date"
                type="date"
                value={takenAt}
                onChange={(e) => setTakenAt(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ext-score">Puntaje (opcional)</Label>
              <Input
                id="ext-score"
                type="number"
                step="any"
                value={score}
                onChange={(e) => setScore(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ext-int">Interpretación (opcional)</Label>
              <Input
                id="ext-int"
                value={interpretation}
                maxLength={500}
                onChange={(e) => setInterpretation(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ext-notes">Notas (privadas, cifradas)</Label>
            <Textarea
              id="ext-notes"
              className="min-h-20"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <label className="border-input hover:bg-muted flex cursor-pointer items-center gap-2 rounded-xl border border-dashed p-3 text-sm">
            <Upload className="size-4" aria-hidden />
            {uploading
              ? "Subiendo…"
              : storageKey
                ? "Archivo adjunto ✓"
                : "Adjuntar PDF o imagen (opcional)"}
            <input
              type="file"
              className="sr-only"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
            />
          </label>
          <FieldError>{error}</FieldError>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending || uploading || !name.trim()}>
              Guardar
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
