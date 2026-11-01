import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { notFound } from "next/navigation";
import { FeedbackList } from "@/components/patient/feedback-list";
import { decrypt, decryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { getEmotionTree } from "@/lib/queries/common";
import { readPatientFeedbacks } from "@/lib/queries/feedback";
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
  const [tree, linked, feedbacks] = await Promise.all([
    getEmotionTree(),
    hasActiveLink(patient.id),
    readPatientFeedbacks(patient.id, { type: "JOURNAL", id: entry.id }),
  ]);

  return (
    <>
      <BackLink href="/app/diario" label="Mi diario" className="mb-2" />
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
      {feedbacks.length > 0 && (
        <section aria-labelledby="fb-title" className="mt-8 flex flex-col gap-3">
          <h2 id="fb-title" className="text-lg font-semibold">
            Devolución de tu psicóloga
          </h2>
          <FeedbackList feedbacks={feedbacks} />
        </section>
      )}
    </>
  );
}
