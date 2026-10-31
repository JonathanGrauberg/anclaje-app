import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { decrypt, decryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { getEmotionTree } from "@/lib/queries/common";
import { hasActiveLink } from "@/lib/queries/patient";
import { requirePatient } from "@/lib/session";
import { JournalEditor } from "../journal-editor";

export const metadata: Metadata = { title: "Diario" };

export default async function JournalEntryPage({ params }: PageProps<"/app/diario/[id]">) {
  const { id } = await params;
  const { patient } = await requirePatient();
  // Solo entradas propias.
  const entry = await prisma.journalEntry.findFirst({
    where: { id, patientId: patient.id },
    include: { emotions: { select: { nodeId: true } } },
  });
  if (!entry) notFound();
  const [tree, linked] = await Promise.all([getEmotionTree(), hasActiveLink(patient.id)]);

  return (
    <JournalEditor
      key={entry.id}
      tree={tree}
      entryId={entry.id}
      isDraft={entry.isDraft}
      hasProfessional={linked}
      initial={{
        title: decryptOptional(entry.titleEnc) ?? "",
        body: decrypt(entry.bodyEnc),
        emotionIds: entry.emotions.map((e) => e.nodeId),
        share: { visibility: entry.visibility, intention: entry.intention },
      }}
    />
  );
}
