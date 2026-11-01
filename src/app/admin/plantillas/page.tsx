import { Download } from "lucide-react";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { DeleteTemplateButton, ImportTemplateButton } from "./templates-client";

export const metadata: Metadata = { title: "Plantillas" };

export default async function AdminTemplatesPage() {
  await requireAdmin();
  const templates = await prisma.assessment.findMany({
    where: { ownerId: null, isTemplate: true },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      sourceNote: true,
      createdAt: true,
      versions: {
        orderBy: { version: "desc" },
        take: 1,
        select: { version: true, _count: { select: { questions: true, responses: true } } },
      },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Plantillas"
        description="Evaluaciones que ven todas las profesionales en su biblioteca. Al usarlas se hace una copia propia: borrar una plantilla no afecta esas copias."
        action={<ImportTemplateButton />}
      />
      <p className="text-muted-foreground max-w-3xl text-sm">
        Antes de subir un test validado, confirmá que la licencia permite usarlo y que el texto de
        los ítems es el oficial. Anotá la fuente en el campo de origen del JSON.
      </p>

      {templates.length === 0 ? (
        <EmptyState title="No hay plantillas">
          Subí un JSON exportado desde el armador de evaluaciones.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((t) => {
            const v = t.versions[0];
            return (
              <Card key={t.id}>
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="font-semibold">{t.title}</h2>
                    <div className="flex shrink-0 gap-1">
                      <Button asChild variant="ghost" size="icon-sm">
                        <a
                          href={`/admin/plantillas/${t.id}/exportar`}
                          download
                          aria-label={`Descargar JSON de ${t.title}`}
                        >
                          <Download />
                        </a>
                      </Button>
                      <DeleteTemplateButton id={t.id} title={t.title} />
                    </div>
                  </div>
                  {t.description && (
                    <p className="text-muted-foreground line-clamp-2 text-sm">{t.description}</p>
                  )}
                  <p className="text-muted-foreground text-xs">
                    v{v?.version ?? 1} · {v?._count.questions ?? 0} preguntas · subida el{" "}
                    {formatDate(t.createdAt)}
                    {v?._count.responses ? ` · ${v._count.responses} respuestas` : ""}
                  </p>
                  {t.sourceNote && <p className="text-xs">Origen: {t.sourceNote}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
