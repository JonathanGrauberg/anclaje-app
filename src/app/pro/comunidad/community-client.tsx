"use client";

import { BookmarkPlus, Check, ExternalLink, Plus, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  copyCommunityItemToLibrary,
  deleteMyCommunityItem,
  proposeCommunityItem,
} from "@/lib/actions/community";
import { cn } from "@/lib/utils";
import { COMMUNITY_KINDS } from "@/lib/validation/community";

type Kind = (typeof COMMUNITY_KINDS)[number];
const KIND_LABEL: Record<Kind, string> = {
  PDF: "PDF",
  IMAGE: "Imagen",
  LINK: "Link",
  TEXT: "Texto",
};

/** Abrir el material (link externo o archivo). Los textos se leen en la tarjeta. */
export function ItemLink({
  kind,
  url,
  storageKey,
}: {
  kind: Kind;
  url: string | null;
  storageKey: string | null;
}) {
  const href = kind === "LINK" ? url : storageKey ? `/api/files/${storageKey}` : null;
  if (!href) return null;
  return (
    <Button asChild variant="soft" size="sm">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink aria-hidden /> {kind === "LINK" ? "Abrir link" : "Ver archivo"}
      </a>
    </Button>
  );
}

export function CopyToLibraryButton({ id }: { id: string }) {
  const [state, setState] = useState<"idle" | "done" | string>("idle");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending || state === "done"}
        onClick={() =>
          start(async () => {
            const res = await copyCommunityItemToLibrary(id);
            setState(res.ok ? "done" : res.error);
          })
        }
      >
        {state === "done" ? <Check aria-hidden /> : <BookmarkPlus aria-hidden />}
        {state === "done" ? "Está en tu Biblioteca" : "Agregar a mi Biblioteca"}
      </Button>
      {state !== "idle" && state !== "done" && <FieldError>{state}</FieldError>}
    </div>
  );
}

export function DeleteMineButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Retirar ${title}`}
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Retirar este aporte de la Comunidad? No se puede deshacer.")) return;
        start(async () => {
          await deleteMyCommunityItem(id);
          router.refresh();
        });
      }}
    >
      <Trash2 />
    </Button>
  );
}

export function ProposeButton() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus aria-hidden /> Compartir material
        </Button>
      </SheetTrigger>
      <SheetContent
        title="Compartir con la Comunidad"
        description="Lo revisamos antes de publicarlo. Te avisamos por mail cuando esté."
        className="sm:max-w-2xl"
      >
        <ProposeForm onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function ProposeForm({ onDone }: { onDone: () => void }) {
  const uid = useId();
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("LINK");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [url, setUrl] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [storageKey, setStorageKey] = useState("");
  const [rights, setRights] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const isFile = kind === "PDF" || kind === "IMAGE";

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("scope", "community");
      const res = await fetch("/api/files", { method: "POST", body });
      const json = (await res.json()) as { key?: string; kind?: "PDF" | "IMAGE"; error?: string };
      if (!res.ok || !json.key) return setError(json.error ?? "No pudimos subir el archivo");
      setStorageKey(json.key);
      if (json.kind) setKind(json.kind);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, "").slice(0, 200));
    } catch {
      setError("No pudimos subir el archivo. Revisá la conexión.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await proposeCommunityItem({
            kind,
            title,
            summary,
            url,
            bodyText,
            source,
            category,
            storageKey: storageKey || undefined,
            tags: tagsText
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean),
            rights: rights as true,
          });
          if (!res.ok) return setError(res.error);
          router.refresh();
          onDone();
        });
      }}
    >
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-1.5 text-sm font-medium">¿Qué querés compartir?</legend>
        {COMMUNITY_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => {
              setKind(k);
              if ((k === "PDF" || k === "IMAGE") !== isFile) setStorageKey("");
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm",
              kind === k
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card hover:bg-muted",
            )}
          >
            {KIND_LABEL[k]}
          </button>
        ))}
      </fieldset>

      {isFile && (
        <label
          className={cn(
            "border-input hover:bg-muted flex cursor-pointer items-center gap-2 rounded-xl border border-dashed p-4 text-sm",
            "focus-within:ring-ring focus-within:ring-2",
          )}
        >
          <Upload className="size-4" aria-hidden />
          {uploading
            ? "Subiendo…"
            : storageKey
              ? "Archivo cargado. Elegí otro para reemplazarlo."
              : `Elegir ${kind === "PDF" ? "PDF" : "imagen"} (hasta 10 MB)`}
          <input
            type="file"
            className="sr-only"
            accept={kind === "PDF" ? "application/pdf" : "image/png,image/jpeg,image/webp"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
        </label>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-title`}>Título</Label>
        <Input
          id={`${uid}-title`}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      {kind === "LINK" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-url`}>Link</Label>
          <Input
            id={`${uid}-url`}
            type="url"
            placeholder="https://doi.org/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
      )}

      {kind === "TEXT" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-body`}>Contenido</Label>
          <Textarea
            id={`${uid}-body`}
            className="min-h-48"
            value={bodyText}
            onChange={(e) => setBodyText(e.target.value)}
            placeholder="Podés usar **negrita**, listas con - y títulos con #"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-summary`}>¿De qué se trata y para qué sirve? (opcional)</Label>
        <Textarea
          id={`${uid}-summary`}
          className="min-h-20"
          value={summary}
          maxLength={1000}
          onChange={(e) => setSummary(e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-source`}>Fuente o cita (opcional)</Label>
        <Input
          id={`${uid}-source`}
          value={source}
          maxLength={500}
          placeholder="Autores (año). Título. Revista. DOI"
          onChange={(e) => setSource(e.target.value)}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-cat`}>Categoría</Label>
          <Input
            id={`${uid}-cat`}
            value={category}
            maxLength={60}
            placeholder="Ej.: Ansiedad"
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${uid}-tags`}>Etiquetas (separadas por coma)</Label>
          <Input
            id={`${uid}-tags`}
            value={tagsText}
            placeholder="apego, adolescencia"
            onChange={(e) => setTagsText(e.target.value)}
          />
        </div>
      </div>

      <label className="bg-muted/60 flex cursor-pointer items-start gap-3 rounded-2xl p-3 text-sm">
        <input
          type="checkbox"
          checked={rights}
          onChange={(e) => setRights(e.target.checked)}
          className="accent-primary mt-0.5 size-4"
        />
        <span>
          Es material propio, de acceso abierto, o un link a la fuente original. No subo libros ni
          artículos pagos, y no incluye datos de pacientes.
        </span>
      </label>

      <FieldError>{error}</FieldError>
      <Button type="submit" size="lg" disabled={pending || uploading || !title.trim() || !rights}>
        {pending ? "Enviando…" : "Enviar a revisión"}
      </Button>
    </form>
  );
}
