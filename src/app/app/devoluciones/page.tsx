import { MessageCircleHeart } from "lucide-react";
import type { Metadata } from "next";
import { FeedbackList } from "@/components/patient/feedback-list";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { readPatientFeedbacks } from "@/lib/queries/feedback";
import { requirePatient } from "@/lib/session";

export const metadata: Metadata = { title: "Devoluciones" };

export default async function FeedbackPage() {
  const { patient } = await requirePatient();
  const feedbacks = await readPatientFeedbacks(patient.id);

  return (
    <>
      <PageHeader
        back={{ href: "/app", label: "Inicio" }}
        title="Devoluciones"
        description="Lo que tu psicóloga te escribió sobre lo que compartiste."
      />
      {feedbacks.length === 0 ? (
        <EmptyState icon={<MessageCircleHeart />} title="Todavía no hay devoluciones">
          Cuando compartas algo con “Me gustaría una devolución”, la respuesta va a aparecer acá.
        </EmptyState>
      ) : (
        <FeedbackList feedbacks={feedbacks} showTarget />
      )}
    </>
  );
}
