"use client";

import { Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import { deleteAssessment, importAssessmentJson } from "@/lib/actions/assessments";

export function ImportJsonButton() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <label className="bg-primary-soft text-primary inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 font-medium">
        <Upload className="size-5" aria-hidden />
        {pending ? "Importando…" : "Importar JSON"}
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
              const res = await importAssessmentJson(await file.text());
              if (!res.ok) return setError(res.error);
              setError(null);
              router.push(`/pro/evaluaciones/${res.data.id}`);
            });
          }}
        />
      </label>
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function DeleteAssessmentButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Borrar ${title}`}
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Borrar “${title}”? No se puede deshacer.`)) return;
        start(async () => {
          const res = await deleteAssessment(id);
          if (!res.ok) alert(res.error);
        });
      }}
    >
      <Trash2 />
    </Button>
  );
}
