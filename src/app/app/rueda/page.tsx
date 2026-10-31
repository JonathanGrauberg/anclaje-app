import type { Metadata } from "next";
import { getEmotionTree } from "@/lib/queries/common";
import { hasActiveLink } from "@/lib/queries/patient";
import { requirePatient } from "@/lib/session";
import { EmotionCheckIn } from "./emotion-check-in";

export const metadata: Metadata = { title: "Rueda de las emociones" };

export default async function WheelPage() {
  const { patient } = await requirePatient();
  const [tree, linked] = await Promise.all([getEmotionTree(), hasActiveLink(patient.id)]);
  return (
    <EmotionCheckIn
      tree={tree}
      defaultVisibility={patient.sharingDefaults?.emotions ?? "SHARED"}
      hasProfessional={linked}
    />
  );
}
