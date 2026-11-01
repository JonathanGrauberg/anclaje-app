import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/db";
import { formatCode } from "@/lib/invitations";
import { requireProfessional } from "@/lib/session";
import { AddManagedPatientForm } from "./add-managed-patient-form";
import { InvitationPanel } from "./invitation-panel";
import { patientName } from "@/lib/patients";

export const metadata: Metadata = { title: "Agregar paciente" };

export default async function InvitationsPage() {
  const { professional } = await requireProfessional();
  const now = new Date();
  const invitations = await prisma.invitation.findMany({
    where: { professionalId: professional.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: { usedBy: { select: { displayName: true, user: { select: { name: true } } } } },
  });
  const baseUrl = (process.env.BETTER_AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");

  return (
    <>
      <PageHeader
        title="Agregar paciente"
        description="Invitalo a la app, o cargalo sin la app para usar la agenda y la historia clínica."
      />
      <section aria-labelledby="invite-title" className="flex flex-col gap-3">
        <h2 id="invite-title" className="text-lg font-semibold">
          Invitar a la app
        </h2>
        <p className="text-muted-foreground text-sm">
          Generá un código de un solo uso. Vence a los 7 días.
        </p>
        <InvitationPanel
          baseUrl={baseUrl}
          invitations={invitations.map((inv) => ({
            id: inv.id,
            code: formatCode(inv.code),
            rawCode: inv.code,
            expiresAt: inv.expiresAt.toISOString(),
            state: inv.usedAt ? "used" : inv.expiresAt <= now ? "expired" : "pending",
            usedBy: inv.usedBy ? patientName(inv.usedBy) : null,
          }))}
        />
      </section>
      <section aria-labelledby="managed-title" className="mt-10 flex flex-col gap-3">
        <h2 id="managed-title" className="text-lg font-semibold">
          Sin la app
        </h2>
        <AddManagedPatientForm />
      </section>
    </>
  );
}
