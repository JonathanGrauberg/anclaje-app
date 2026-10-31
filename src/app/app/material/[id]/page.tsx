import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownView } from "@/components/markdown-view";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/session";

export const metadata: Metadata = { title: "Material" };

export default async function MaterialPage({ params }: PageProps<"/app/material/[id]">) {
  const { id } = await params;
  const { patient } = await requirePatient();
  // Solo material asignado al paciente o adjuntado en una devolución suya.
  const resource = await prisma.resource.findFirst({
    where: {
      id,
      OR: [
        { assignments: { some: { patientId: patient.id } } },
        { feedbacks: { some: { patientId: patient.id } } },
      ],
    },
    include: { professional: { select: { displayName: true } } },
  });
  if (!resource) notFound();
  await prisma.resourceAssignment.updateMany({
    where: { resourceId: id, patientId: patient.id, viewedAt: null },
    data: { viewedAt: new Date() },
  });
  const fileUrl = resource.storageKey ? `/api/files/${resource.storageKey}` : null;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/app/tareas" className="text-muted-foreground text-sm hover:underline">
        ← Mis tareas
      </Link>
      <header>
        <p className="text-muted-foreground text-sm">De {resource.professional.displayName}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{resource.title}</h1>
        {resource.description && (
          <p className="text-muted-foreground mt-1">{resource.description}</p>
        )}
      </header>

      {resource.kind === "TEXT" && resource.bodyText && (
        <article className="bg-card rounded-3xl border p-5">
          <MarkdownView source={resource.bodyText} />
        </article>
      )}
      {resource.kind === "LINK" && resource.url && (
        <Button asChild size="lg" className="self-start">
          <a href={resource.url} target="_blank" rel="noopener noreferrer">
            Abrir el link <ExternalLink />
          </a>
        </Button>
      )}
      {resource.kind === "IMAGE" && fileUrl && (
        // eslint-disable-next-line @next/next/no-img-element -- archivo protegido, servido por /api/files
        <img src={fileUrl} alt={resource.title} className="w-full rounded-3xl border" />
      )}
      {resource.kind === "PDF" && fileUrl && (
        <>
          {/* Los navegadores de celular no muestran PDFs embebidos: ahí va directo el botón. */}
          <iframe
            src={fileUrl}
            title={resource.title}
            className="bg-card hidden h-[75dvh] w-full rounded-3xl border md:block"
          />
          <Button asChild size="lg" className="self-start md:hidden">
            <a href={fileUrl} target="_blank" rel="noopener">
              Abrir el PDF <ExternalLink />
            </a>
          </Button>
          <Button asChild variant="soft" className="hidden self-start md:inline-flex">
            <a href={fileUrl} target="_blank" rel="noopener">
              Abrir en otra pestaña <ExternalLink />
            </a>
          </Button>
        </>
      )}
    </div>
  );
}
