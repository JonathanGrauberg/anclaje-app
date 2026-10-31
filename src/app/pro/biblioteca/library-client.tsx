"use client";

import {
  Eye,
  FileText,
  Image as ImageIcon,
  Link2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/misc";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { deleteResource, saveResource, setResourceAssignment } from "@/lib/actions/library";
import { cn } from "@/lib/utils";
import type { ResourceKindValue } from "@/lib/validation/pro";

export type ResourceDTO = {
  id?: string;
  kind: ResourceKindValue;
  title: string;
  description: string;
  category: string;
  tags: string[];
  url: string;
  storageKey: string;
  bodyText: string;
  assignments?: { patientId: string; viewed: boolean }[];
};

const KIND_META: Record<ResourceKindValue, { label: string; icon: typeof FileText }> = {
  PDF: { label: "PDF", icon: FileText },
  IMAGE: { label: "Imagen", icon: ImageIcon },
  LINK: { label: "Link", icon: Link2 },
  TEXT: { label: "Ficha de texto", icon: Pencil },
};

export function NewResourceButton() {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus /> Nuevo recurso
        </Button>
      </SheetTrigger>
      <SheetContent title="Nuevo recurso" className="sm:max-w-xl">
        <ResourceForm onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

export function ResourceCard({
  resource: r,
  patients,
}: {
  resource: ResourceDTO & { id: string };
  patients: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const Icon = KIND_META[r.kind].icon;
  const assigned = r.assignments ?? [];

  return (
    <div className="bg-card flex h-full flex-col gap-3 rounded-2xl border p-4">
      <div className="flex items-start gap-3">
        <span className="bg-primary-soft text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium break-words">{r.title}</p>
          <p className="text-muted-foreground text-xs">
            {KIND_META[r.kind].label}
            {r.category && ` · ${r.category}`}
          </p>
        </div>
      </div>
      {r.description && (
        <p className="text-muted-foreground line-clamp-3 text-sm">{r.description}</p>
      )}
      {r.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {r.tags.map((t) => (
            <Badge key={t}>#{t}</Badge>
          ))}
        </div>
      )}
      <p className="text-muted-foreground mt-auto text-xs">
        {assigned.length === 0
          ? "Sin asignar"
          : `Asignado a ${assigned.length} · visto por ${assigned.filter((a) => a.viewed).length}`}
      </p>
      <div className="-ml-2 flex flex-wrap items-center gap-1">
        <AssignSheet resource={r} patients={patients} />
        {r.storageKey && (
          <Button asChild variant="ghost" size="sm">
            <a href={`/api/files/${r.storageKey}`} target="_blank" rel="noopener">
              <Eye /> Ver
            </a>
          </Button>
        )}
        <Sheet open={editing} onOpenChange={setEditing}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Editar ${r.title}`}>
              <Pencil />
            </Button>
          </SheetTrigger>
          <SheetContent title="Editar recurso" className="sm:max-w-xl">
            <ResourceForm initial={r} onDone={() => setEditing(false)} />
          </SheetContent>
        </Sheet>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Borrar ${r.title}`}
          disabled={pending}
          onClick={() => {
            if (!confirm("¿Borrar este recurso? Los pacientes dejan de verlo.")) return;
            start(async () => {
              await deleteResource(r.id);
            });
          }}
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

function AssignSheet({
  resource,
  patients,
}: {
  resource: ResourceDTO & { id: string };
  patients: { id: string; name: string }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const byPatient = new Map((resource.assignments ?? []).map((a) => [a.patientId, a]));

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="soft" size="sm">
          <UserPlus /> Asignar
        </Button>
      </SheetTrigger>
      <SheetContent
        title={`Asignar “${resource.title}”`}
        description="El paciente lo ve en “Mis tareas”."
      >
        {patients.length === 0 ? (
          <p className="text-muted-foreground">Todavía no tenés pacientes vinculados.</p>
        ) : (
          <ul className="divide-y">
            {patients.map((p) => {
              const a = byPatient.get(p.id);
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <label htmlFor={`as-${resource.id}-${p.id}`} className="flex flex-col">
                    <span className="font-medium">{p.name}</span>
                    {a && (
                      <span className="text-muted-foreground text-xs">
                        {a.viewed ? "Ya lo vio" : "Todavía no lo vio"}
                      </span>
                    )}
                  </label>
                  <Switch
                    id={`as-${resource.id}-${p.id}`}
                    checked={!!a}
                    disabled={pending}
                    onCheckedChange={(checked) =>
                      start(async () => {
                        const res = await setResourceAssignment(resource.id, p.id, checked);
                        setError(res.ok ? null : res.error);
                      })
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
        <FieldError>{error}</FieldError>
      </SheetContent>
    </Sheet>
  );
}

function ResourceForm({ initial, onDone }: { initial?: ResourceDTO; onDone: () => void }) {
  const [value, setValue] = useState<ResourceDTO>(
    initial ?? {
      kind: "PDF",
      title: "",
      description: "",
      category: "",
      tags: [],
      url: "",
      storageKey: "",
      bodyText: "",
    },
  );
  const [tagsText, setTagsText] = useState((initial?.tags ?? []).join(", "));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const set = (patch: Partial<ResourceDTO>) => setValue((v) => ({ ...v, ...patch }));

  async function upload(file: File) {
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("scope", "resources");
      const res = await fetch("/api/files", { method: "POST", body });
      const json = (await res.json()) as { key?: string; kind?: "PDF" | "IMAGE"; error?: string };
      if (!res.ok || !json.key) return setError(json.error ?? "No pudimos subir el archivo");
      set({
        storageKey: json.key,
        kind: json.kind!,
        title: value.title || file.name.replace(/\.[^.]+$/, ""),
      });
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
        start(async () => {
          const tags = tagsText
            .split(",")
            .map((t) => t.trim().toLowerCase())
            .filter(Boolean);
          const res = await saveResource({ ...value, tags });
          if (!res.ok) return setError(res.error);
          onDone();
        });
      }}
    >
      {!initial && (
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1.5 text-sm font-medium">Tipo</legend>
          {(["PDF", "IMAGE", "LINK", "TEXT"] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={value.kind === k}
              onClick={() => set({ kind: k, storageKey: k === value.kind ? value.storageKey : "" })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm",
                value.kind === k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card hover:bg-muted",
              )}
            >
              {KIND_META[k].label}
            </button>
          ))}
        </fieldset>
      )}

      {(value.kind === "PDF" || value.kind === "IMAGE") && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="res-file">
            Archivo ({value.kind === "PDF" ? "PDF" : "PNG, JPG o WEBP"}, hasta 10 MB)
          </Label>
          <label
            htmlFor="res-file"
            className="border-input hover:bg-muted flex cursor-pointer items-center gap-2 rounded-xl border border-dashed p-4 text-sm"
          >
            <Upload className="size-4" aria-hidden />
            {uploading
              ? "Subiendo…"
              : value.storageKey
                ? "Archivo cargado. Elegí otro para reemplazarlo."
                : "Elegir archivo"}
          </label>
          <input
            id="res-file"
            type="file"
            className="sr-only"
            accept={value.kind === "PDF" ? "application/pdf" : "image/png,image/jpeg,image/webp"}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="res-title">Título</Label>
        <Input
          id="res-title"
          value={value.title}
          maxLength={200}
          onChange={(e) => set({ title: e.target.value })}
        />
      </div>

      {value.kind === "LINK" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="res-url">Link</Label>
          <Input
            id="res-url"
            type="url"
            placeholder="https://"
            value={value.url}
            onChange={(e) => set({ url: e.target.value })}
          />
        </div>
      )}

      {value.kind === "TEXT" && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="res-body">Contenido</Label>
          <Textarea
            id="res-body"
            className="min-h-48"
            value={value.bodyText}
            onChange={(e) => set({ bodyText: e.target.value })}
            placeholder="Podés usar **negrita**, listas con - y títulos con #"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="res-desc">Descripción (opcional)</Label>
        <Textarea
          id="res-desc"
          className="min-h-20"
          value={value.description}
          maxLength={1000}
          onChange={(e) => set({ description: e.target.value })}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="res-cat">Categoría</Label>
          <Input
            id="res-cat"
            value={value.category}
            maxLength={60}
            placeholder="Ej.: Ansiedad"
            onChange={(e) => set({ category: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="res-tags">Etiquetas (separadas por coma)</Label>
          <Input
            id="res-tags"
            value={tagsText}
            onChange={(e) => setTagsText(e.target.value)}
            placeholder="respiración, sueño"
          />
        </div>
      </div>
      <FieldError>{error}</FieldError>
      <Button type="submit" size="lg" disabled={pending || uploading || !value.title.trim()}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
    </form>
  );
}
