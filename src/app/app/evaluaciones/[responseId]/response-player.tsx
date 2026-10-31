"use client";

import { AssessmentPlayer, type PlayerAnswers } from "@/components/assessment/player";
import { completeAssessment, saveAnswer } from "@/lib/actions/responses";
import type { CrisisLineDTO } from "@/lib/queries/common";
import type { AssessmentDoc } from "@/lib/validation/assessment";

export function ResponsePlayer({
  responseId,
  doc,
  initialAnswers,
  lines,
}: {
  responseId: string;
  doc: AssessmentDoc;
  initialAnswers: PlayerAnswers;
  lines: CrisisLineDTO[];
}) {
  return (
    <AssessmentPlayer
      doc={doc}
      initialAnswers={initialAnswers}
      crisisLines={lines}
      onAnswer={(questionId, a) => saveAnswer({ responseId, questionId, ...a })}
      onComplete={() => completeAssessment(responseId)}
    />
  );
}
