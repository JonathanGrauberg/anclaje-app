"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertTriangle,
  ChevronDown,
  Copy,
  GripVertical,
  Monitor,
  Plus,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { AssessmentPlayer } from "@/components/assessment/player";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { Switch } from "@/components/ui/switch";
import {
  publishAssessment,
  saveAssessmentDraft,
  createNewVersion,
} from "@/lib/actions/assessments";
import {
  CRITICAL_LABELS,
  hasOptions,
  isScorable,
  METHOD_LABELS,
  newKey,
  newLikertBlock,
  newQuestion,
  publishProblems,
  QUESTION_TYPE_LABELS,
} from "@/lib/assessments/doc";
import { cn } from "@/lib/utils";
import {
  CRITICAL_OPERATORS,
  QUESTION_TYPES,
  SCORING_METHODS,
  type AssessmentDoc,
  type DocOption,
  type DocQuestion,
  type QuestionTypeValue,
} from "@/lib/validation/assessment";

type Tab = "preguntas" | "puntaje" | "ajustes";
type SaveState = "idle" | "pending" | "saving" | "saved" | "error";

const selectCls = "border-input bg-card h-10 rounded-xl border px-3 text-sm";

export function Builder({
  assessmentId,
  initialDoc,
  readOnly,
  versionLabel,
}: {
  assessmentId: string;
  initialDoc: AssessmentDoc;
  readOnly: boolean;
  versionLabel: string;
}) {
  const [doc, setDoc] = useState(initialDoc);
  const [tab, setTab] = useState<Tab>("preguntas");
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [preview, setPreview] = useState<"off" | "mobile" | "desktop">("off");
  const [previewRun, setPreviewRun] = useState(0);
  const [save, setSave] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [publishing, startPublish] = useTransition();
  const [newType, setNewType] = useState<QuestionTypeValue>("SINGLE_CHOICE");
  const first = useRef(true);
  const latest = useRef(doc);

  // Autoguardado del borrador (1,2 s después del último cambio).
  useEffect(() => {
    latest.current = doc;
    if (first.current || readOnly) {
      first.current = false;
      return;
    }
    setSave("pending");
    const t = setTimeout(async () => {
      setSave("saving");
      const res = await saveAssessmentDraft(assessmentId, latest.current);
      if (res.ok) {
        setSave("saved");
        setError(null);
      } else {
        setSave("error");
        setError(res.error);
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [doc, assessmentId, readOnly]);

  const patch = (p: Partial<AssessmentDoc>) => setDoc((d) => ({ ...d, ...p }));

  function updateQuestion(key: string, p: Partial<DocQuestion>) {
    setDoc((d) => {
      const target = d.questions.find((q) => q.key === key);
      return {
        ...d,
        questions: d.questions.map((q) => {
          if (q.key === key) return { ...q, ...p };
          // En un bloque Likert las opciones se comparten (mismo texto y valor, claves propias).
          if (p.options && target?.blockKey && q.blockKey === target.blockKey) {
            return {
              ...q,
              options: p.options.map((o, i) => ({ ...o, key: q.options[i]?.key ?? newKey() })),
            };
          }
          return q;
        }),
      };
    });
  }

  function addQuestions(qs: DocQuestion[]) {
    setDoc((d) => ({ ...d, questions: [...d.questions, ...qs] }));
    setOpenKey(qs[0].key);
  }

  function removeQuestion(key: string) {
    setDoc((d) => ({ ...d, questions: d.questions.filter((q) => q.key !== key) }));
  }

  function duplicateQuestion(key: string) {
    setDoc((d) => {
      const i = d.questions.findIndex((q) => q.key === key);
      const q = d.questions[i];
      const copy = {
        ...q,
        key: newKey(),
        options: q.options.map((o) => ({ ...o, key: newKey() })),
      };
      const questions = [...d.questions];
      questions.splice(i + 1, 0, copy);
      return { ...d, questions };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setDoc((d) => {
      const from = d.questions.findIndex((q) => q.key === e.active.id);
      const to = d.questions.findIndex((q) => q.key === e.over!.id);
      return { ...d, questions: arrayMove(d.questions, from, to) };
    });
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const position = (id: string | number) => doc.questions.findIndex((q) => q.key === id) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Agarraste la pregunta ${position(active.id)}.`,
    onDragOver: ({ over }) =>
      over ? `Sobre la posición ${position(over.id)}.` : "Fuera de la lista.",
    onDragEnd: ({ over }) =>
      over ? `Pregunta soltada en la posición ${position(over.id)}.` : "Cancelado.",
    onDragCancel: () => "Movimiento cancelado.",
  };

  const saveText = {
    idle: readOnly ? "Solo lectura" : "Sin cambios",
    pending: "Cambios sin guardar…",
    saving: "Guardando…",
    saved: "Guardado",
    error: "No se pudo guardar",
  }[save];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          aria-label="Título de la evaluación"
          value={doc.title}
          disabled={readOnly}
          maxLength={200}
          onChange={(e) => patch({ title: e.target.value })}
          className="h-12 max-w-xl flex-1 text-lg font-semibold"
        />
        <Badge className={readOnly ? "bg-primary-soft text-primary" : undefined}>
          {versionLabel}
        </Badge>
        <span
          role="status"
          className={cn("text-sm", save === "error" ? "text-danger" : "text-muted-foreground")}
        >
          {saveText}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPreview((p) => (p === "off" ? "mobile" : "off"));
              setPreviewRun((n) => n + 1);
            }}
          >
            {preview === "off" ? "Vista previa" : "Cerrar vista previa"}
          </Button>
          {readOnly ? (
            <Button
              size="sm"
              disabled={publishing}
              onClick={() =>
                startPublish(async () => {
                  const res = await createNewVersion(assessmentId);
                  if (!res.ok) setError(res.error);
                })
              }
            >
              Crear versión nueva para editar
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={publishing || save === "saving" || save === "pending"}
              onClick={() => {
                const p = publishProblems(doc);
                setProblems(p);
                if (p.length) return;
                startPublish(async () => {
                  const res = await publishAssessment(assessmentId);
                  if (!res.ok) setError(res.error);
                });
              }}
            >
              {publishing ? "Publicando…" : "Publicar"}
            </Button>
          )}
        </div>
      </div>
      <FieldError>{error}</FieldError>
      {problems.length > 0 && (
        <div
          role="alert"
          className="border-danger/40 bg-danger-soft rounded-2xl border p-4 text-sm"
        >
          <p className="mb-1 flex items-center gap-2 font-medium">
            <AlertTriangle className="size-4" aria-hidden /> Antes de publicar, revisá esto:
          </p>
          <ul className="list-disc pl-5">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {readOnly && (
        <p className="text-muted-foreground text-sm">
          Esta versión está publicada y no se puede cambiar (las respuestas quedan atadas a ella).
          Para modificarla, creá una versión nueva: las asignaciones nuevas van a usar la última
          publicada.
        </p>
      )}

      <div className={cn("grid gap-6", preview !== "off" && "xl:grid-cols-[1fr_auto]")}>
        <div className="flex min-w-0 flex-col gap-4">
          <nav className="flex gap-1 border-b" aria-label="Secciones del armador">
            {(
              [
                ["preguntas", "Preguntas"],
                ["puntaje", "Puntaje y rangos"],
                ["ajustes", "Ajustes"],
              ] as const
            ).map(([t, label]) => (
              <button
                key={t}
                type="button"
                aria-current={tab === t ? "page" : undefined}
                onClick={() => setTab(t)}
                className={cn(
                  "-mb-px border-b-2 px-3 py-2 text-sm",
                  tab === t
                    ? "border-primary text-primary font-medium"
                    : "text-muted-foreground border-transparent",
                )}
              >
                {label}
              </button>
            ))}
          </nav>

          <fieldset disabled={readOnly} className="flex min-w-0 flex-col gap-3">
            {tab === "preguntas" && (
              <>
                {doc.questions.length === 0 && (
                  <p className="text-muted-foreground bg-card rounded-2xl border border-dashed p-6 text-center">
                    Agregá la primera pregunta con los botones de abajo.
                  </p>
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                  accessibility={{
                    announcements,
                    screenReaderInstructions: {
                      draggable:
                        "Para mover una pregunta, apretá espacio, usá las flechas y volvé a apretar espacio para soltarla. Escape cancela.",
                    },
                  }}
                >
                  <SortableContext
                    items={doc.questions.map((q) => q.key)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ol className="flex flex-col gap-2">
                      {doc.questions.map((q, i) => (
                        <SortableQuestion
                          key={q.key}
                          q={q}
                          index={i}
                          doc={doc}
                          open={openKey === q.key}
                          readOnly={readOnly}
                          onToggle={() => setOpenKey((k) => (k === q.key ? null : q.key))}
                          onChange={(p) => updateQuestion(q.key, p)}
                          onRemove={() => removeQuestion(q.key)}
                          onDuplicate={() => duplicateQuestion(q.key)}
                        />
                      ))}
                    </ol>
                  </SortableContext>
                </DndContext>
                {!readOnly && (
                  <div className="bg-card flex flex-wrap items-center gap-2 rounded-2xl border p-3">
                    <label className="sr-only" htmlFor="new-type">
                      Tipo de pregunta
                    </label>
                    <select
                      id="new-type"
                      className={selectCls}
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as QuestionTypeValue)}
                    >
                      {QUESTION_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {QUESTION_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                    <Button size="sm" onClick={() => addQuestions([newQuestion(newType)])}>
                      <Plus /> Agregar pregunta
                    </Button>
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={() => addQuestions(newLikertBlock(3))}
                    >
                      <Plus /> Bloque Likert
                    </Button>
                  </div>
                )}
              </>
            )}

            {tab === "puntaje" && <ScoringPanel doc={doc} patch={patch} />}
            {tab === "ajustes" && <SettingsPanel doc={doc} patch={patch} />}
          </fieldset>
        </div>

        {preview !== "off" && (
          <aside className="flex flex-col gap-3" aria-label="Vista previa">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Vista previa</span>
              <Button
                variant={preview === "mobile" ? "soft" : "ghost"}
                size="icon-sm"
                aria-label="Ver como celular"
                aria-pressed={preview === "mobile"}
                onClick={() => setPreview("mobile")}
              >
                <Smartphone />
              </Button>
              <Button
                variant={preview === "desktop" ? "soft" : "ghost"}
                size="icon-sm"
                aria-label="Ver como computadora"
                aria-pressed={preview === "desktop"}
                onClick={() => setPreview("desktop")}
              >
                <Monitor />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setPreviewRun((n) => n + 1)}>
                Reiniciar
              </Button>
            </div>
            <div
              className={cn(
                "bg-background mx-auto overflow-y-auto border shadow-sm",
                preview === "mobile"
                  ? "h-[680px] w-[380px] max-w-full rounded-[2rem] p-5"
                  : "h-[620px] w-full max-w-3xl rounded-2xl p-8 xl:w-[720px]",
              )}
            >
              <AssessmentPlayer key={previewRun} doc={doc} preview />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function SortableQuestion({
  q,
  index,
  doc,
  open,
  readOnly,
  onToggle,
  onChange,
  onRemove,
  onDuplicate,
}: {
  q: DocQuestion;
  index: number;
  doc: AssessmentDoc;
  open: boolean;
  readOnly: boolean;
  onToggle: () => void;
  onChange: (p: Partial<DocQuestion>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: q.key, disabled: readOnly });
  const inBlock = !!q.blockKey;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "bg-card rounded-2xl border",
        isDragging && "relative z-10 shadow-lg",
        inBlock && "border-l-primary/60 border-l-4",
      )}
    >
      <div className="flex items-center gap-2 p-2 pr-3">
        {!readOnly && (
          <button
            ref={setActivatorNodeRef}
            type="button"
            className="text-muted-foreground hover:bg-muted flex size-9 cursor-grab items-center justify-center rounded-lg active:cursor-grabbing"
            aria-label={`Mover pregunta ${index + 1}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left"
        >
          <span className="text-muted-foreground w-6 text-sm tabular-nums">{index + 1}</span>
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate", !q.text && "text-muted-foreground italic")}>
              {q.text || "Sin texto"}
            </span>
            <span className="text-muted-foreground text-xs">
              {QUESTION_TYPE_LABELS[q.type]}
              {inBlock && " · bloque Likert"}
              {q.criticalOperator && " · ítem crítico"}
              {!q.scored && isScorable(q.type) && " · no suma"}
              {q.reverse && " · invertido"}
            </span>
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      </div>
      {open && (
        <div className="flex flex-col gap-4 border-t p-4">
          <QuestionEditor q={q} doc={doc} onChange={onChange} />
          {!readOnly && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={onDuplicate}>
                <Copy /> Duplicar
              </Button>
              <Button variant="ghost" size="sm" onClick={onRemove}>
                <Trash2 /> Borrar
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function QuestionEditor({
  q,
  doc,
  onChange,
}: {
  q: DocQuestion;
  doc: AssessmentDoc;
  onChange: (p: Partial<DocQuestion>) => void;
}) {
  const id = (s: string) => `${s}-${q.key}`;
  const numberOrNull = (v: string) => (v === "" ? null : Number(v));

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("text")}>{q.type === "INFO" ? "Título" : "Pregunta"}</Label>
        <Textarea
          id={id("text")}
          className="min-h-16"
          value={q.text}
          maxLength={1000}
          onChange={(e) => onChange({ text: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id("help")}>{q.type === "INFO" ? "Texto" : "Ayuda (opcional)"}</Label>
        <Input
          id={id("help")}
          value={q.helpText ?? ""}
          maxLength={1000}
          onChange={(e) => onChange({ helpText: e.target.value || null })}
        />
      </div>

      {hasOptions(q.type) && <OptionsEditor q={q} onChange={(options) => onChange({ options })} />}

      {q.type === "SLIDER" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["min", "max", "step"] as const).map((k) => (
            <div key={k} className="flex flex-col gap-1.5">
              <Label htmlFor={id(k)}>{{ min: "Mínimo", max: "Máximo", step: "Paso" }[k]}</Label>
              <Input
                id={id(k)}
                type="number"
                value={q.config[k] ?? ""}
                onChange={(e) =>
                  onChange({
                    config: { ...q.config, [k]: numberOrNull(e.target.value) ?? undefined },
                  })
                }
              />
            </div>
          ))}
          {(["minLabel", "maxLabel"] as const).map((k) => (
            <div key={k} className="flex flex-col gap-1.5">
              <Label htmlFor={id(k)}>{k === "minLabel" ? "Etiqueta mín." : "Etiqueta máx."}</Label>
              <Input
                id={id(k)}
                maxLength={80}
                value={q.config[k] ?? ""}
                onChange={(e) =>
                  onChange({ config: { ...q.config, [k]: e.target.value || undefined } })
                }
              />
            </div>
          ))}
        </div>
      )}

      {q.type !== "INFO" && (
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={q.required} onCheckedChange={(required) => onChange({ required })} />
            Obligatoria
          </label>
          {isScorable(q.type) && (
            <>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={q.scored} onCheckedChange={(scored) => onChange({ scored })} />
                Suma al puntaje
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={q.reverse} onCheckedChange={(reverse) => onChange({ reverse })} />
                Ítem invertido
              </label>
            </>
          )}
        </div>
      )}

      {isScorable(q.type) && (
        <div className="flex flex-wrap items-end gap-3">
          {doc.scoringMethod === "WEIGHTED_SUM" && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("weight")}>Peso</Label>
              <Input
                id={id("weight")}
                type="number"
                step="0.1"
                className="w-24"
                value={q.weight}
                onChange={(e) => onChange({ weight: Number(e.target.value) || 0 })}
              />
            </div>
          )}
          {doc.subscales.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("sub")}>Subescala</Label>
              <select
                id={id("sub")}
                className={selectCls}
                value={q.subscaleKey ?? ""}
                onChange={(e) => onChange({ subscaleKey: e.target.value || null })}
              >
                <option value="">Ninguna</option>
                {doc.subscales.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name || "Sin nombre"}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={id("crit")}>Ítem crítico si la respuesta es</Label>
            <div className="flex gap-2">
              <select
                id={id("crit")}
                className={selectCls}
                value={q.criticalOperator ?? ""}
                onChange={(e) =>
                  onChange({
                    criticalOperator: (e.target.value || null) as DocQuestion["criticalOperator"],
                    criticalValue: e.target.value ? (q.criticalValue ?? 1) : null,
                  })
                }
              >
                <option value="">No es crítico</option>
                {CRITICAL_OPERATORS.map((op) => (
                  <option key={op} value={op}>
                    {CRITICAL_LABELS[op]}
                  </option>
                ))}
              </select>
              {q.criticalOperator && (
                <Input
                  aria-label="Valor crítico"
                  type="number"
                  className="w-24"
                  value={q.criticalValue ?? ""}
                  onChange={(e) => onChange({ criticalValue: numberOrNull(e.target.value) })}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {q.criticalOperator && (
        <p className="text-muted-foreground text-xs">
          Si se activa, al terminar el paciente ve su plan de calma y las líneas de ayuda, y vos ves
          una alerta en el panel.
        </p>
      )}
    </>
  );
}

function OptionsEditor({ q, onChange }: { q: DocQuestion; onChange: (o: DocOption[]) => void }) {
  const set = (i: number, p: Partial<DocOption>) =>
    onChange(q.options.map((o, j) => (i === j ? { ...o, ...p } : o)));
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        Opciones y valor
        {q.blockKey && (
          <span className="text-muted-foreground font-normal"> (se comparten en el bloque)</span>
        )}
      </p>
      {q.options.map((o, i) => (
        <div key={o.key} className="flex items-center gap-2">
          <Input
            aria-label={`Texto de la opción ${i + 1}`}
            value={o.label}
            maxLength={200}
            onChange={(e) => set(i, { label: e.target.value })}
            className="h-10"
          />
          <Input
            aria-label={`Valor de la opción ${i + 1}`}
            type="number"
            value={o.value}
            onChange={(e) => set(i, { value: Number(e.target.value) || 0 })}
            className="h-10 w-20"
          />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Sacar la opción ${i + 1}`}
            onClick={() => onChange(q.options.filter((_, j) => j !== i))}
          >
            <X />
          </Button>
        </div>
      ))}
      {q.type !== "YES_NO" && q.options.length < 20 && (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() =>
            onChange([
              ...q.options,
              { key: newKey(), label: "", value: (q.options.at(-1)?.value ?? -1) + 1 },
            ])
          }
        >
          <Plus /> Opción
        </Button>
      )}
    </div>
  );
}

function ScoringPanel({
  doc,
  patch,
}: {
  doc: AssessmentDoc;
  patch: (p: Partial<AssessmentDoc>) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="method">Cálculo del total</Label>
          <select
            id="method"
            className={selectCls}
            value={doc.scoringMethod}
            onChange={(e) =>
              patch({ scoringMethod: e.target.value as AssessmentDoc["scoringMethod"] })
            }
          >
            {SCORING_METHODS.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </div>
        <label className="flex h-10 items-center gap-2 text-sm">
          <Switch
            checked={doc.patientSeesScore}
            onCheckedChange={(patientSeesScore) => patch({ patientSeesScore })}
          />
          El paciente ve su puntaje al terminar
        </label>
      </div>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Subescalas</h3>
        {doc.subscales.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <Input
              aria-label={`Nombre de la subescala ${i + 1}`}
              value={s.name}
              maxLength={120}
              placeholder="Ej.: Ansiedad"
              className="h-10"
              onChange={(e) =>
                patch({
                  subscales: doc.subscales.map((x) =>
                    x.key === s.key ? { ...x, name: e.target.value } : x,
                  ),
                })
              }
            />
            <select
              aria-label="Cálculo de la subescala"
              className={selectCls}
              value={s.method}
              onChange={(e) =>
                patch({
                  subscales: doc.subscales.map((x) =>
                    x.key === s.key ? { ...x, method: e.target.value as typeof s.method } : x,
                  ),
                })
              }
            >
              {SCORING_METHODS.map((m) => (
                <option key={m} value={m}>
                  {METHOD_LABELS[m]}
                </option>
              ))}
            </select>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Borrar subescala"
              onClick={() =>
                patch({
                  subscales: doc.subscales.filter((x) => x.key !== s.key),
                  questions: doc.questions.map((q) =>
                    q.subscaleKey === s.key ? { ...q, subscaleKey: null } : q,
                  ),
                  ranges: doc.ranges.filter((r) => r.subscaleKey !== s.key),
                })
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() =>
            patch({ subscales: [...doc.subscales, { key: newKey(), name: "", method: "SUM" }] })
          }
        >
          <Plus /> Subescala
        </Button>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-semibold">Rangos de interpretación</h3>
        <p className="text-muted-foreground text-sm">
          Límites inclusivos. Ej.: 0–4 “Mínimo”, 5–9 “Leve”.
        </p>
        {doc.ranges.map((r, i) => {
          const set = (p: Partial<typeof r>) =>
            patch({ ranges: doc.ranges.map((x, j) => (j === i ? { ...x, ...p } : x)) });
          return (
            <div key={i} className="bg-muted/40 flex flex-wrap items-center gap-2 rounded-xl p-2">
              <select
                aria-label="Se aplica a"
                className={selectCls}
                value={r.subscaleKey ?? ""}
                onChange={(e) => set({ subscaleKey: e.target.value || null })}
              >
                <option value="">Total</option>
                {doc.subscales.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name || "Subescala"}
                  </option>
                ))}
              </select>
              <Input
                aria-label="Desde"
                type="number"
                className="h-10 w-20"
                value={r.min}
                onChange={(e) => set({ min: Number(e.target.value) || 0 })}
              />
              <span aria-hidden>–</span>
              <Input
                aria-label="Hasta"
                type="number"
                className="h-10 w-20"
                value={r.max}
                onChange={(e) => set({ max: Number(e.target.value) || 0 })}
              />
              <Input
                aria-label="Nombre del rango"
                className="h-10 w-40"
                value={r.label}
                maxLength={120}
                placeholder="Leve"
                onChange={(e) => set({ label: e.target.value })}
              />
              <input
                aria-label="Color"
                type="color"
                className="h-10 w-12 rounded-lg border"
                value={r.color}
                onChange={(e) => set({ color: e.target.value })}
              />
              <Input
                aria-label="Texto para el resultado (opcional)"
                className="h-10 min-w-40 flex-1"
                value={r.text ?? ""}
                maxLength={1000}
                placeholder="Texto (opcional)"
                onChange={(e) => set({ text: e.target.value || null })}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Borrar rango"
                onClick={() => patch({ ranges: doc.ranges.filter((_, j) => j !== i) })}
              >
                <Trash2 />
              </Button>
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() => {
            const last = doc.ranges.filter((r) => r.subscaleKey === null).at(-1);
            const min = last ? last.max + 1 : 0;
            patch({
              ranges: [
                ...doc.ranges,
                { subscaleKey: null, min, max: min + 4, label: "", color: "#A9D9B4", text: null },
              ],
            });
          }}
        >
          <Plus /> Rango
        </Button>
      </section>
    </div>
  );
}

function SettingsPanel({
  doc,
  patch,
}: {
  doc: AssessmentDoc;
  patch: (p: Partial<AssessmentDoc>) => void;
}) {
  const field = (
    k: "description" | "instructions" | "referencePeriod" | "closingMessage" | "sourceNote",
    label: string,
    hint: string,
    long = true,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`set-${k}`}>{label}</Label>
      {long ? (
        <Textarea
          id={`set-${k}`}
          className="min-h-20"
          value={doc[k] ?? ""}
          onChange={(e) => patch({ [k]: e.target.value || null })}
        />
      ) : (
        <Input
          id={`set-${k}`}
          value={doc[k] ?? ""}
          onChange={(e) => patch({ [k]: e.target.value || null })}
        />
      )}
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      {field("instructions", "Instrucciones", "Lo primero que lee el paciente.")}
      {field(
        "referencePeriod",
        "Período de referencia",
        "Ej.: “las últimas dos semanas”. Se muestra como “Pensá en …”.",
        false,
      )}
      {field("closingMessage", "Mensaje de cierre", "Se muestra al terminar. Cálido y breve.")}
      {field("description", "Descripción interna", "Solo la ves vos.")}
      {field(
        "sourceNote",
        "Origen y licencia",
        "Autores, versión validada y permiso de uso, si corresponde.",
      )}
    </div>
  );
}
