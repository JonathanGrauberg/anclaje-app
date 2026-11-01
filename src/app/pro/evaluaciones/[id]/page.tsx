import { Download } from "lucide-react";
import { BackLink } from "@/components/back-link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { duplicateAssessment } from "@/lib/actions/assessments";
import { getVersion, versionToDoc } from "@/lib/assessments/repo";
import { prisma } from "@/lib/db";
import { requireProfessional } from "@/lib/session";
import { Builder } from "./builder";

export const metadata: Metadata = { title: "Armador de evaluación" };

const STATUS = { DRAFT: "Borrador", PUBLISHED: "Publicada", ARCHIVED: "Archivada" } as const;

export default async function AssessmentBuilderPage({
  params,
}: PageProps<"/pro/evaluaciones/[id]">) {
  const { id } = await params;
  const { professional } = await requireProfessional();
  const assessment = await prisma.assessment.findFirst({
    where: { id, ownerId: professional.id },
    include: { versions: { orderBy: { version: "desc" }, take: 1, select: { id: true } } },
  });
  const latestId = assessment?.versions[0]?.id;
  if (!assessment || !latestId) notFound();
  const version = (await getVersion(latestId))!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <BackLink href="/pro/evaluaciones" label="Evaluaciones" />
        <div className="flex gap-1">
          <Button asChild variant="ghost" size="sm">
            <a href={`/pro/evaluaciones/${id}/exportar`} download>
              <Download /> Exportar JSON
            </a>
          </Button>
          <form action={duplicateAssessment.bind(null, id)}>
            <Button variant="ghost" size="sm">
              Duplicar
            </Button>
          </form>
        </div>
      </div>
      <Builder
        key={version.id}
        assessmentId={id}
        initialDoc={versionToDoc(version)}
        readOnly={version.status !== "DRAFT"}
        versionLabel={`${STATUS[version.status]} · v${version.version}`}
      />
    </div>
  );
}
