import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/db";
import { requireProfessional } from "@/lib/session";
import { QuickRepliesEditor } from "./quick-replies-editor";

export const metadata: Metadata = { title: "Respuestas rápidas" };

export default async function QuickRepliesPage() {
  const { professional } = await requireProfessional();
  const replies = await prisma.quickReply.findMany({
    where: { professionalId: professional.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, title: true, body: true },
  });

  return (
    <>
      <PageHeader
        tone="sage"
        title="Respuestas rápidas"
        description="Frases que usás seguido en las devoluciones. Las insertás con un clic y las podés editar antes de enviar."
      />
      <QuickRepliesEditor replies={replies} />
    </>
  );
}
