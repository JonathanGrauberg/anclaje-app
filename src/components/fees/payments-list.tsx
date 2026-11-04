"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/input";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { deletePayment } from "@/lib/actions/fees";
import { formatDate } from "@/lib/dates";
import { formatMoney, methodLabel } from "@/lib/fees";

export type PaymentRow = {
  id: string;
  concept: string;
  amount: number;
  method: PaymentMethod;
  paidAt: string;
  patientId?: string | null;
  patientName?: string;
};

/** Lista de cobros, con opción de borrar uno anotado por error. */
export function PaymentsList({ payments }: { payments: PaymentRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <ul className="bg-card divide-y rounded-2xl border">
        {payments.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {p.patientName !== undefined ? (
                  p.patientId ? (
                    <Link
                      href={`/pro/pacientes/${p.patientId}?tab=honorarios`}
                      className="hover:underline"
                    >
                      {p.patientName}
                    </Link>
                  ) : (
                    p.patientName
                  )
                ) : (
                  p.concept
                )}
              </p>
              <p className="text-muted-foreground truncate text-xs">
                {p.patientName !== undefined && `${p.concept} · `}
                {formatDate(new Date(p.paidAt))} · {methodLabel(p.method)}
              </p>
            </div>
            <span className="font-medium tabular-nums">{formatMoney(p.amount)}</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={`Borrar cobro de ${formatMoney(p.amount)}`}
              disabled={pending}
              onClick={() => {
                if (!confirm(`¿Borrar este cobro de ${formatMoney(p.amount)}?`)) return;
                start(async () => {
                  const res = await deletePayment(p.id);
                  setError(res.ok ? null : res.error);
                });
              }}
            >
              <Trash2 />
            </Button>
          </li>
        ))}
      </ul>
      <FieldError>{error}</FieldError>
    </div>
  );
}
