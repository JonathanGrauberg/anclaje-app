import { CheckCircle2 } from "lucide-react";
import { BackLink } from "@/components/back-link";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { PlayerAnswers } from "@/components/assessment/player";
import { getVersion, versionToDoc } from "@/lib/assessments/repo";
import { decryptOptional } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { getCrisisLines } from "@/lib/queries/common";
import { requirePatient } from "@/lib/session";
import { ResponsePlayer } from "./response-player";

export const metadata: Metadata = { title: "Cuestionario" };

const dateOnly = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);

export default async function ResponsePage({
  params,
}: PageProps<"/app/evaluaciones/[responseId]">) {
  const { responseId } = await params;
  const { patient } = await requirePatient();
  const response = await prisma.assessmentResponse.findFirst({
    where: { id: responseId, patientId: patient.id },
    include: { answers: true },
  });
  if (!response) notFound();

  if (response.status === "COMPLETED") {
    return (
      <div className="flex flex-col items-start gap-4 py-8">
        <CheckCircle2 className="text-primary size-10" aria-hidden />
        <h1 className="text-2xl font-semibold">Este cuestionario ya lo enviaste</h1>
        <p className="text-muted-foreground">Gracias. Tu psicóloga lo va a revisar.</p>
        <Button asChild variant="soft">
          <Link href="/app/tareas">Volver a mis tareas</Link>
        </Button>
      </div>
    );
  }

  const [version, lines] = await Promise.all([getVersion(response.versionId), getCrisisLines()]);
  const doc = versionToDoc(version!);
  const initial: PlayerAnswers = Object.fromEntries(
    response.answers.map((a) => [
      a.questionId,
      {
        valueNumber: a.valueNumber,
        optionIds: a.optionIds,
        text: decryptOptional(a.textEnc) ?? undefined,
        valueDate: a.valueDate ? dateOnly(a.valueDate) : null,
      },
    ]),
  );

  return (
    <>
      <BackLink href="/app/tareas" label="Mis tareas" className="mb-2" />
      <ResponsePlayer responseId={response.id} doc={doc} initialAnswers={initial} lines={lines} />
    </>
  );
}
