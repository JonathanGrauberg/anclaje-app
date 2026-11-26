"use client";

import { FileText, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { addPatientFile, deletePatientFile } from "@/lib/actions/patient-files";
import { cn } from "@/lib/utils";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/webp";

/**
 * "Subir archivo" desde la ficha. En el celular, el selector ofrece sacar una foto, la galería o
 * los archivos. Para el paciente → Biblioteca + asignado; solo para mí → queda en la Historia.
 */
export function UploadFile({
  patient,
}: {
  patient: { id: string; name: string; withoutApp: boolean };
}) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="soft">
          <Upload aria-hidden /> Subir archivo
        </Button>
      </SheetTrigger>
      <SheetContent
        title="Subir archivo"
        description="PDF o foto, hasta 10 MB. Desde el celular podés sacarle una foto a un papel."
      >
        <UploadForm patient={patient} onDone={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

function UploadForm({
  patient,
  onDone,
}: {
  patient: { id: string; name: string; withoutApp: boolean };
  onDone: () => void;
}) {
  const uid = useId();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [forPatient, setForPatient] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const options = [
    {
      value: false,
      label: "Solo para mí",
      hint: "Queda en la historia clínica. El paciente no lo ve.",
    },
    ...(patient.withoutApp
      ? []
      : [
          {
            value: true,
            label: `Para ${patient.name}`,
            hint: "Le aparece en la app y queda en tu Biblioteca.",
          },
        ]),
  ];

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!file) return setError("Elegí un archivo");
        setError(null);
        start(async () => {
          const body = new FormData();
          body.set("file", file);
          body.set("scope", forPatient ? "resources" : "files");
          let key: string | undefined;
          try {
            const res = await fetch("/api/files", { method: "POST", body });
            const json = (await res.json()) as { key?: string; error?: string };
            if (!res.ok || !json.key) return setError(json.error ?? "No pudimos subir el archivo");
            key = json.key;
          } catch {
            return setError("No pudimos subir el archivo. Revisá la conexión.");
          }
          const res = await addPatientFile({
            patientId: patient.id,
            title,
            storageKey: key,
            forPatient,
          });
          if (!res.ok) return setError(res.error);
          router.refresh();
          onDone();
        });
      }}
    >
      <label
        className={cn(
          "border-input hover:bg-muted flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-dashed p-5 text-sm",
          "focus-within:ring-ring focus-within:ring-2",
        )}
      >
        <Upload className="text-primary size-5 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 truncate">
          {file ? file.name : "Elegí un PDF o sacá una foto"}
        </span>
        <input
          type="file"
          className="sr-only"
          accept={ACCEPT}
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f && !title) setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, 200));
          }}
        />
      </label>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${uid}-title`}>Título</Label>
        <Input
          id={`${uid}-title`}
          value={title}
          maxLength={200}
          required
          placeholder="Ej.: Informe de la escuela"
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">¿Para quién es?</legend>
        {options.map((o) => (
          <label
            key={String(o.value)}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-3",
              "focus-within:ring-ring focus-within:ring-2",
              forPatient === o.value ? "border-primary" : "border-border",
            )}
          >
            <input
              type="radio"
              name={`${uid}-for`}
              checked={forPatient === o.value}
              onChange={() => setForPatient(o.value)}
              className="accent-primary mt-0.5 size-4"
            />
            <span className="flex flex-col">
              <span className="font-medium">{o.label}</span>
              <span className="text-muted-foreground text-sm">{o.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <FieldError>{error}</FieldError>
      <Button type="submit" disabled={pending || !file || !title.trim()}>
        {pending ? "Subiendo…" : "Subir"}
      </Button>
    </form>
  );
}

/** Lista de archivos privados de la ficha (en la pestaña Historia). */
export function PatientFilesList({
  files,
}: {
  files: { id: string; title: string; storageKey: string; date: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (files.length === 0)
    return (
      <p className="text-muted-foreground text-sm">
        Todavía no subiste archivos. Usá <strong>Subir archivo</strong>, arriba en la ficha.
      </p>
    );
  return (
    <ul className="flex flex-col gap-2">
      {files.map((f) => (
        <li
          key={f.id}
          className="bg-card flex items-center justify-between gap-3 rounded-2xl border p-3"
        >
          <a
            href={`/api/files/${f.storageKey}`}
            target="_blank"
            rel="noopener"
            className="text-primary flex min-w-0 items-center gap-2 text-sm font-medium hover:underline"
          >
            <FileText className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{f.title}</span>
            <span className="text-muted-foreground shrink-0 font-normal">· {f.date}</span>
          </a>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Borrar ${f.title}`}
            disabled={pending}
            onClick={() => {
              if (!confirm("¿Borrar este archivo? No se puede deshacer.")) return;
              start(async () => {
                await deletePatientFile(f.id);
                router.refresh();
              });
            }}
          >
            <Trash2 />
          </Button>
        </li>
      ))}
    </ul>
  );
}
