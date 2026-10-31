import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/session";
import { TopicList } from "./topic-list";

export const metadata: Metadata = { title: "Para la próxima sesión" };

const SOURCE_LINKS = {
  JOURNAL: (id: string) => `/app/diario/${id}`,
  CBT: (id: string) => `/app/autorregistro/${id}`,
  EMOTION: () => "/app/rueda/historial",
} as const;

export default async function NextSessionPage() {
  const { patient } = await requirePatient();
  const topics = await prisma.sessionTopic.findMany({
    where: { patientId: patient.id },
    orderBy: [{ discussedAt: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
    take: 100,
  });

  return (
    <>
      <PageHeader
        title="Para la próxima sesión"
        description="Lo que querés hablar. Tu psicóloga lo ve antes de la sesión."
      />
      <TopicList
        topics={topics.map((t) => ({
          id: t.id,
          text: decrypt(t.textEnc),
          createdAt: t.createdAt.toISOString(),
          discussed: t.discussedAt !== null,
          href:
            t.sourceType && t.sourceId && t.sourceType in SOURCE_LINKS
              ? SOURCE_LINKS[t.sourceType as keyof typeof SOURCE_LINKS](t.sourceId)
              : null,
        }))}
      />
    </>
  );
}
