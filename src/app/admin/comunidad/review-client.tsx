"use client";

import { Check, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError, Label, Textarea } from "@/components/ui/input";
import { reviewCommunityItem } from "@/lib/actions/community";

/**
 * Aprobar o devolver un aporte. Para devolver hace falta un comentario (le llega a la autora).
 * `compact`: en lo ya publicado, solo "Despublicar".
 */
export function ReviewButtons({ id, compact = false }: { id: string; compact?: boolean }) {
  const uid = useId();
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const decide = (decision: "APPROVED" | "REJECTED") =>
    start(async () => {
      setError(null);
      const res = await reviewCommunityItem({ id, decision, note });
      if (!res.ok) return setError(res.error);
      setRejecting(false);
      router.refresh();
    });

  if (rejecting)
    return (
      <div className="flex w-full flex-col gap-2">
        <Label htmlFor={`${uid}-note`}>¿Por qué no se publica? (le llega a la autora)</Label>
        <Textarea
          id={`${uid}-note`}
          value={note}
          maxLength={1000}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-20"
        />
        <FieldError>{error}</FieldError>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => decide("REJECTED")}>
            {compact ? "Despublicar" : "Devolver"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setRejecting(false)}>
            Cancelar
          </Button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-2">
        {!compact && (
          <Button size="sm" disabled={pending} onClick={() => decide("APPROVED")}>
            <Check aria-hidden /> Aprobar y publicar
          </Button>
        )}
        <Button
          size="sm"
          variant={compact ? "ghost" : "outline"}
          onClick={() => setRejecting(true)}
        >
          <X aria-hidden /> {compact ? "Despublicar" : "No publicar"}
        </Button>
      </div>
      <FieldError>{error}</FieldError>
    </div>
  );
}
