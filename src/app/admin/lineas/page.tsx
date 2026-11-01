import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/misc";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { CrisisLinesEditor } from "./lines-client";

export const metadata: Metadata = { title: "Líneas de ayuda" };

export default async function AdminCrisisLinesPage() {
  await requireAdmin();
  const lines = await prisma.crisisLine.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Líneas de ayuda"
        description="Se muestran a los pacientes en el botón de ayuda y cuando una respuesta marca un ítem crítico. Revisá que los teléfonos estén vigentes."
      />
      <CrisisLinesEditor
        lines={lines.map((l) => ({
          ...l,
          description: l.description ?? "",
          region: l.region ?? "",
        }))}
      />
    </div>
  );
}
