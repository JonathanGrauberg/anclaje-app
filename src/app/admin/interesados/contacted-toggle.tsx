"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markLeadContacted } from "@/lib/actions/leads";

export function ContactedToggle({ id, contacted }: { id: string; contacted: boolean }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant={contacted ? "ghost" : "soft"}
      disabled={pending}
      className="shrink-0"
      onClick={() =>
        start(async () => {
          const res = await markLeadContacted(id, !contacted);
          if (!res.ok) alert(res.error);
        })
      }
    >
      {contacted ? (
        "Contactado ✓ (deshacer)"
      ) : (
        <>
          <Check aria-hidden /> Marcar contactado
        </>
      )}
    </Button>
  );
}
