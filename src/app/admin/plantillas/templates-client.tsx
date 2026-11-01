"use client";

import { Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { deleteTemplate, importTemplate } from "@/lib/actions/admin";

export function ImportTemplateButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="bg-primary-soft text-primary focus-within:ring-ring inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 font-medium focus-within:ring-2">
        <Upload className="size-5" aria-hidden />
        {pending ? "Subiendo…" : "Subir JSON"}
        <input
          type="file"
          accept="application/json,.json"
          className="sr-only"
          disabled={pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            start(async () => {
              const res = await importTemplate(await file.text());
              setDone(res.ok);
              setError(res.ok ? null : res.error);
              if (res.ok) router.refresh();
            });
          }}
        />
      </label>
      <FieldError>{error}</FieldError>
      {done && (
        <p role="status" className="text-primary text-sm">
          Plantilla publicada.
        </p>
      )}
    </div>
  );
}

export function DeleteTemplateButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Borrar ${title}`}
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Borrar la plantilla “${title}”? Las copias de las profesionales se quedan.`))
          return;
        start(async () => {
          const res = await deleteTemplate(id);
          if (!res.ok) alert(res.error);
        });
      }}
    >
      <Trash2 />
    </Button>
  );
}
