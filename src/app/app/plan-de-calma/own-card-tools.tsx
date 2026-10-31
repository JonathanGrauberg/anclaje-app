"use client";

import { Plus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { CopingCardForm } from "@/components/coping-card-form";
import { Button } from "@/components/ui/button";
import { addOwnCopingCard, deleteOwnCopingCard } from "@/lib/actions/patient-plan";

const PATIENT_TYPES = ["PHRASE", "ACTIVITY", "CONTACT"] as const;

export function AddOwnCard() {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button variant="soft" className="self-start" onClick={() => setOpen(true)}>
        <Plus /> Agregar algo que me sirve
      </Button>
    );
  }
  return (
    <div className="bg-card rounded-3xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Agregar a mi plan</h2>
        <Button variant="ghost" size="icon-sm" aria-label="Cerrar" onClick={() => setOpen(false)}>
          <X />
        </Button>
      </div>
      <CopingCardForm types={PATIENT_TYPES} onSave={addOwnCopingCard} submitLabel="Agregar" />
    </div>
  );
}

export function DeleteOwnCard({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Sacar “${title}” de mi plan`}
      disabled={pending}
      onClick={() => {
        if (!confirm(`¿Sacar “${title}” de tu plan?`)) return;
        start(async () => {
          await deleteOwnCopingCard(id);
        });
      }}
    >
      <X />
    </Button>
  );
}
