import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/db";
import { formatCode } from "@/lib/invitations";
import { requireProfessional } from "@/lib/session";
import { InvitationPanel } from "./invitation-panel";

export const metadata: Metadata = { title: "Invitar paciente" };

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
        title="Invitar paciente"
        description="Generá un código de un solo uso. Vence a los 7 días."
      />
      <InvitationPanel
        baseUrl={baseUrl}
        invitations={invitations.map((inv) => ({
          id: inv.id,
          code: formatCode(inv.code),
          rawCode: inv.code,
          expiresAt: inv.expiresAt.toISOString(),
          state: inv.usedAt ? "used" : inv.expiresAt <= now ? "expired" : "pending",
          usedBy: inv.usedBy ? (inv.usedBy.displayName ?? inv.usedBy.user.name) : null,
        }))}
      />
    </>
  );
}
