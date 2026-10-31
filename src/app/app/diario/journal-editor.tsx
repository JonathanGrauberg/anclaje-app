"use client";

import { Bold, Eye, Heading, Italic, List, ListOrdered, Pencil, Smile, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { EmotionWheel } from "@/components/emotion-wheel/emotion-wheel";
import type { EmotionTreeNode } from "@/components/emotion-wheel/types";
import { useEmotionIndex } from "@/components/emotion-wheel/use-emotion-index";
import { MarkdownView } from "@/components/markdown-view";
import { AddToSessionButton } from "@/components/patient/add-to-session";
import { DeleteButton } from "@/components/patient/delete-button";
import { ShareControl, type ShareValue } from "@/components/patient/share-control";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { deleteJournal, saveJournal } from "@/lib/actions/journal";
import { formatTime } from "@/lib/dates";
import { toPlainText } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type Draft = { title: string; body: string; emotionIds: string[]; share: ShareValue };
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 1500;

export function JournalEditor({
  tree,
  initial,
  entryId: initialId,
  isDraft: initialIsDraft,
  hasProfessional,
}: {
  tree: EmotionTreeNode[];
  initial: Draft;
  entryId?: string;
  isDraft: boolean;
  hasProfessional: boolean;
}) {
  const router = useRouter();
  const index = useEmotionIndex(tree);
  const [draft, setDraft] = useState<Draft>(initial);
  const [preview, setPreview] = useState(false);
  const [state, setState] = useState<SaveState>("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entryId, setEntryId] = useState(initialId);
  const [publishing, startPublish] = useTransition();
  const textarea = useRef<HTMLTextAreaElement>(null);

  // Cola de guardado: siempre guarda la última versión y nunca en paralelo
  // (así la primera creación devuelve el id antes de la siguiente actualización).
  const latest = useRef(draft);
  const idRef = useRef(initialId);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const persist = useCallback((publish: boolean) => {
    const run = async () => {
      const d = latest.current;
      if (!publish && !idRef.current && !d.body.trim() && !d.title.trim())
        return { ok: true as const };
      setState("saving");
      const res = await saveJournal({
        id: idRef.current,
        title: d.title || undefined,
        body: d.body,
        emotionIds: d.emotionIds,
        share: d.share,
        publish,
      });
      if (!res.ok) {
        setState("error");
        setError(res.error);
        return res;
      }
      setError(null);
      if (!idRef.current) {
        idRef.current = res.data.id;
        setEntryId(res.data.id);
        // La URL pasa a ser la de la entrada, sin recargar (si recargás, seguís acá).
        window.history.replaceState(null, "", `/app/diario/${res.data.id}`);
      }
      setSavedAt(new Date(res.data.savedAt));
      setState(latest.current === d ? "saved" : "dirty");
      return res;
    };
    const next = chain.current.then(run, run);
    chain.current = next;
    return next;
  }, []);

  function update(patch: Partial<Draft>) {
    setDraft((d) => {
      const next = { ...d, ...patch };
      latest.current = next;
      return next;
    });
    setState("dirty");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(false), AUTOSAVE_MS);
  }

  // Avisar antes de irse con cambios sin guardar.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state === "dirty" || state === "saving") e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [state]);

  useEffect(() => () => clearTimeout(timer.current), []);

  function publish() {
    clearTimeout(timer.current);
    startPublish(async () => {
      const res = await persist(true);
      if (res && "ok" in res && res.ok) {
        router.push("/app/diario");
        router.refresh();
      }
    });
  }

  // Barra de formato: envuelve la selección o antepone a las líneas.
  function wrap(marker: string) {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const selected = value.slice(s, e) || "texto";
    const next = value.slice(0, s) + marker + selected + marker + value.slice(e);
    update({ body: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + marker.length, s + marker.length + selected.length);
    });
  }

  function prefixLines(kind: "h" | "ul" | "ol") {
    const el = textarea.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const lineEndIdx = value.indexOf("\n", e);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const clean = (l: string) => l.replace(/^(#{1,3}\s+|\s*[-*•]\s+|\s*\d+[.)]\s+)/, "");
    const out = lines.map((l, i) =>
      kind === "h" ? `## ${clean(l)}` : kind === "ul" ? `- ${clean(l)}` : `${i + 1}. ${clean(l)}`,
    );
    const replaced = out.join("\n");
    update({ body: value.slice(0, lineStart) + replaced + value.slice(lineEnd) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(lineStart + replaced.length, lineStart + replaced.length);
    });
  }

  const toolbar = [
    { label: "Negrita", icon: Bold, run: () => wrap("**") },
    { label: "Cursiva", icon: Italic, run: () => wrap("*") },
    { label: "Título", icon: Heading, run: () => prefixLines("h") },
    { label: "Lista", icon: List, run: () => prefixLines("ul") },
    { label: "Lista numerada", icon: ListOrdered, run: () => prefixLines("ol") },
  ];

  const status =
    state === "saving"
      ? "Guardando…"
      : state === "dirty"
        ? "Cambios sin guardar"
        : state === "error"
          ? "No se pudo guardar"
          : savedAt
            ? `${initialIsDraft && !publishing ? "Borrador guardado" : "Guardado"} ${formatTime(savedAt)}`
            : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm" aria-live="polite">
          {status}
        </p>
        <div className="flex items-center gap-1">
          {entryId && (
            <DeleteButton
              action={() => deleteJournal(entryId)}
              what="esta entrada"
              redirectTo="/app/diario"
            />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreview((p) => !p)}
            aria-pressed={preview}
          >
            {preview ? <Pencil /> : <Eye />} {preview ? "Escribir" : "Vista previa"}
          </Button>
        </div>
      </div>

      <input
        value={draft.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="Título (opcional)"
        aria-label="Título"
        maxLength={150}
        className="placeholder:text-muted-foreground/60 w-full bg-transparent text-2xl font-semibold tracking-tight focus:outline-none"
      />

      {preview ? (
        <div className="bg-card min-h-[40vh] rounded-2xl border p-5">
          {draft.body.trim() ? (
            <MarkdownView source={draft.body} />
          ) : (
            <p className="text-muted-foreground">Todavía no escribiste nada.</p>
          )}
        </div>
      ) : (
        <div className="bg-card focus-within:border-ring focus-within:ring-ring/25 overflow-hidden rounded-2xl border focus-within:ring-3">
          <div role="toolbar" aria-label="Formato" className="flex gap-1 border-b px-2 py-1.5">
            {toolbar.map(({ label, icon: Icon, run }) => (
              <button
                key={label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={run}
                aria-label={label}
                title={label}
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-2"
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
          <textarea
            ref={textarea}
            value={draft.body}
            onChange={(e) => update({ body: e.target.value })}
            placeholder="¿Qué te está pasando? Escribí como te salga."
            aria-label="Entrada del diario"
            className="placeholder:text-muted-foreground/70 block min-h-[45vh] w-full resize-y bg-transparent p-4 text-base leading-relaxed focus:outline-none"
          />
        </div>
      )}

      {/* Emociones vinculadas */}
      <div className="flex flex-wrap items-center gap-2">
        {draft.emotionIds.map((id) => {
          const e = index.get(id);
          if (!e) return null;
          return (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full py-1 pr-1 pl-3 text-sm font-medium text-[var(--wheel-text)]"
              style={{ background: e.node.color }}
            >
              {e.node.label}
              <button
                type="button"
                onClick={() => update({ emotionIds: draft.emotionIds.filter((x) => x !== id) })}
                className="rounded-full p-1 hover:bg-black/10"
                aria-label={`Quitar ${e.node.label}`}
              >
                <X className="size-3.5" />
              </button>
            </span>
          );
        })}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Smile /> {draft.emotionIds.length ? "Cambiar emociones" : "Vincular emociones"}
            </Button>
          </SheetTrigger>
          <SheetContent
            title="¿Qué emociones tiene esta entrada?"
            description="Opcional. Podés elegir varias."
          >
            <EmotionWheel
              tree={tree}
              selected={draft.emotionIds}
              onToggle={(id) =>
                update({
                  emotionIds: draft.emotionIds.includes(id)
                    ? draft.emotionIds.filter((x) => x !== id)
                    : [...draft.emotionIds, id],
                })
              }
            />
          </SheetContent>
        </Sheet>
      </div>

      <ShareControl
        value={draft.share}
        onChange={(share) => update({ share })}
        hasProfessional={hasProfessional}
      />

      {entryId && (
        <div className="-ml-2">
          <AddToSessionButton
            sourceType="JOURNAL"
            sourceId={entryId}
            suggestion={draft.title || toPlainText(draft.body).slice(0, 120)}
          />
        </div>
      )}

      <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 pr-28">
        <FieldError>{error}</FieldError>
        <Button
          size="lg"
          className={cn("w-full shadow-lg")}
          onClick={publish}
          disabled={publishing || !draft.body.trim()}
        >
          {publishing ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </div>
  );
}
