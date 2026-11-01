import type { Metadata } from "next";
import { BackLink } from "@/components/back-link";
import { getEmotionTree } from "@/lib/queries/common";
import { hasActiveLink } from "@/lib/queries/patient";
import { requirePatient } from "@/lib/session";
import { JournalEditor } from "../journal-editor";

export const metadata: Metadata = { title: "Nueva entrada" };

export default async function NewJournalEntryPage() {
  const { patient } = await requirePatient();
  const [tree, linked] = await Promise.all([getEmotionTree(), hasActiveLink(patient.id)]);
  const visibility = patient.sharingDefaults?.journal ?? "PRIVATE";
  return (
    <>
      <BackLink href="/app/diario" label="Mi diario" className="mb-2" />
      <JournalEditor
        tree={tree}
        isDraft
        hasProfessional={linked}
        initial={{
          title: "",
          body: "",
          emotionIds: [],
          share: { visibility, intention: visibility === "SHARED" ? "JUST_FYI" : null },
        }}
      />
    </>
  );
}
