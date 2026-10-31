import { Users } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import {
  linkedPatientsWhere,
  sharedCbtWhere,
  sharedEmotionWhere,
  sharedJournalWhere,
} from "@/lib/access";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireProfessional } from "@/lib/session";

export const metadata: Metadata = { title: "Panel" };

export default async function ProfessionalHome() {
  const { professional } = await requireProfessional();
  const pid = professional.id;

  const patients = await prisma.patientProfile.findMany({
    where: linkedPatientsWhere(pid),
    select: {
      id: true,
      displayName: true,
      user: { select: { name: true } },
      links: { where: { professionalId: pid }, select: { createdAt: true } },
    },
  });

  // Conteos con los mismos filtros de privacidad que usará la ficha del paciente.
  const counts = await Promise.all(
    patients.map(async (p) => {
      const [journal, emotions, cbt, topics] = await Promise.all([
        prisma.journalEntry.count({ where: { ...sharedJournalWhere(pid), patientId: p.id } }),
        prisma.emotionEntry.count({ where: { ...sharedEmotionWhere(pid), patientId: p.id } }),
        prisma.cbtRecord.count({ where: { ...sharedCbtWhere(pid), patientId: p.id } }),
        prisma.sessionTopic.count({ where: { patientId: p.id, discussedAt: null } }),
      ]);
      return { journal, emotions, cbt, topics };
    }),
  );

  return (
    <>
      <PageHeader
        title={`Hola, ${professional.displayName}`}
        description="El panel completo (fichas, devoluciones, notas y tareas) llega en la fase 2."
      />
      {patients.length === 0 ? (
        <EmptyState icon={<Users />} title="Todavía no tenés pacientes vinculados">
          En la fase 2 vas a poder generar un código de invitación.
        </EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patients.map((p, i) => (
            <Card key={p.id}>
              <CardContent className="flex flex-col gap-3">
                <div>
                  <p className="text-lg font-semibold">{p.displayName ?? p.user.name}</p>
                  <p className="text-muted-foreground text-sm">
                    Vinculado desde {formatDate(p.links[0].createdAt)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    ["Diario compartido", counts[i].journal],
                    ["Registros de la rueda", counts[i].emotions],
                    ["Autorregistros", counts[i].cbt],
                    ["Temas para la sesión", counts[i].topics],
                  ].map(([label, n]) => (
                    <div key={label} className="bg-muted rounded-xl p-2">
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="text-lg font-semibold tabular-nums">{n}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
