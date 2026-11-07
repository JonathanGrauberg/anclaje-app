import { NotebookPen, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { startCbtRecord } from "@/lib/actions/cbt";
import { decryptOptional } from "@/lib/crypto";
import { formatRelative } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/session";

export const metadata: Metadata = { title: "Autorregistro" };

function StartButton({ label = "Empezar uno" }: { label?: string }) {
  return (
    <form action={startCbtRecord}>
      <Button type="submit">
        <Plus /> {label}
      </Button>
    </form>
  );
}

export default async function CbtListPage() {
  const { patient } = await requirePatient();
  const records = await prisma.cbtRecord.findMany({
    where: { patientId: patient.id },
    orderBy: { occurredAt: "desc" },
    take: 100,
    select: {
      id: true,
      status: true,
      occurredAt: true,
      situationEnc: true,
      thoughtEnc: true,
      beliefBefore: true,
      beliefAfter: true,
      visibility: true,
    },
  });

  return (
    <>
      <PageHeader
        tone="sun"
        back={{ href: "/app", label: "Inicio" }}
        title="Autorregistro"
        description="Paso a paso, para mirar un pensamiento que te hizo ruido."
        action={records.length > 0 ? <StartButton label="Nuevo" /> : undefined}
      />
      {records.length === 0 ? (
        <EmptyState
          icon={<NotebookPen />}
          title="Todavía no hiciste ninguno"
          action={<StartButton />}
        >
          Son 7 pasos cortos. Si te interrumpen, queda guardado y seguís después.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {records.map((r) => {
            const thought = decryptOptional(r.thoughtEnc);
            const situation = decryptOptional(r.situationEnc);
            return (
              <li key={r.id}>
                <Link
                  href={`/app/autorregistro/${r.id}`}
                  className="bg-card hover:bg-muted/40 block rounded-2xl border p-4 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-muted-foreground text-sm">
                      {formatRelative(r.occurredAt)}
                    </span>
                    <span className="flex gap-1.5">
                      {r.status === "DRAFT" && (
                        <Badge className="bg-accent text-accent-foreground">A medio hacer</Badge>
                      )}
                      <Badge>{r.visibility === "SHARED" ? "Compartido" : "Privado"}</Badge>
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 font-medium">
                    {thought ? `«${thought}»` : situation || "Sin completar todavía"}
                  </p>
                  {r.beliefBefore !== null &&
                    r.beliefAfter !== null &&
                    r.beliefAfter !== r.beliefBefore && (
                      <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                        Creencia: {r.beliefBefore} % → {r.beliefAfter} %
                      </p>
                    )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
