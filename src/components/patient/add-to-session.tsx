"use client";

import { Check, MessageCirclePlus } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Textarea } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { addSessionTopic } from "@/lib/actions/topics";

/** "Agregar a la próxima sesión" desde cualquier entrada. */
export function AddToSessionButton({
  sourceType,
  sourceId,
  suggestion = "",
  variant = "ghost",
}: {
  sourceType?: "JOURNAL" | "EMOTION" | "CBT";
  sourceId?: string;
  suggestion?: string;
  variant?: "ghost" | "soft" | "outline";
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(suggestion);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit() {
    setError(null);
    start(async () => {
      const res = await addSessionTopic({ text, sourceType, sourceId });
      if (!res.ok) return setError(res.error);
      setDone(true);
      setOpen(false);
    });
  }

  if (done) {
    return (
      <span className="text-primary inline-flex h-9 items-center gap-2 px-2 text-sm" role="status">
        <Check className="size-4" aria-hidden /> Anotado para la próxima sesión
      </span>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(o) => (setOpen(o), o && setText(suggestion))}>
      <SheetTrigger asChild>
        <Button variant={variant} size="sm">
          <MessageCirclePlus /> Agregar a la próxima sesión
        </Button>
      </SheetTrigger>
      <SheetContent
        title="Para la próxima sesión"
        description="Anotá en pocas palabras qué querés hablar."
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          aria-label="Tema para la próxima sesión"
          autoFocus
        />
        <FieldError>{error}</FieldError>
        <Button
          className="mt-4 w-full"
          size="lg"
          onClick={submit}
          disabled={pending || !text.trim()}
        >
          {pending ? "Guardando…" : "Anotar"}
        </Button>
      </SheetContent>
    </Sheet>
  );
}
