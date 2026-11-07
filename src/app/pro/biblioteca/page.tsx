import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { linkedPatientsWhere } from "@/lib/access";
import { prisma } from "@/lib/db";
import { requireProfessional } from "@/lib/session";
import { NewResourceButton, ResourceCard } from "./library-client";
import { patientName } from "@/lib/patients";

export const metadata: Metadata = { title: "Biblioteca" };

export default async function LibraryPage({ searchParams }: PageProps<"/pro/biblioteca">) {
  const { professional } = await requireProfessional();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const category = typeof sp.categoria === "string" ? sp.categoria : "";

  const [resources, patients, categories] = await Promise.all([
    prisma.resource.findMany({
      where: {
        professionalId: professional.id,
        ...(category && { category }),
        ...(q && {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
          ],
        }),
      },
      orderBy: { updatedAt: "desc" },
      include: { assignments: { select: { patientId: true, viewedAt: true } } },
    }),
    prisma.patientProfile.findMany({
      where: linkedPatientsWhere(professional.id),
      select: { id: true, displayName: true, user: { select: { name: true } } },
      orderBy: { displayName: "asc" },
    }),
    prisma.resource.findMany({
      where: { professionalId: professional.id, category: { not: null } },
      distinct: ["category"],
      select: { category: true },
    }),
  ]);
  const patientList = patients.map((p) => ({ id: p.id, name: patientName(p) }));

  return (
    <>
      <PageHeader
        tone="forest"
        title="Biblioteca"
        description="Tu material: PDFs, imágenes, links y fichas de texto. Asignalo a cada paciente."
        action={<NewResourceButton />}
      />
      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por título, descripción o etiqueta"
          aria-label="Buscar en la biblioteca"
          className="border-input bg-card h-10 min-w-60 flex-1 rounded-xl border px-3"
        />
        <select
          name="categoria"
          defaultValue={category}
          aria-label="Categoría"
          className="border-input bg-card h-10 rounded-xl border px-3"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.category} value={c.category!}>
              {c.category}
            </option>
          ))}
        </select>
        <button className="bg-primary-soft text-primary h-10 rounded-full px-4 text-sm font-medium">
          Filtrar
        </button>
      </form>

      {resources.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title={q || category ? "No encontramos nada" : "Tu biblioteca está vacía"}
        >
          Subí un PDF, una imagen, pegá un link o escribí una ficha de texto.
        </EmptyState>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {resources.map((r) => (
            <li key={r.id}>
              <ResourceCard
                patients={patientList}
                resource={{
                  id: r.id,
                  kind: r.kind,
                  title: r.title,
                  description: r.description ?? "",
                  category: r.category ?? "",
                  tags: r.tags,
                  url: r.url ?? "",
                  storageKey: r.storageKey ?? "",
                  bodyText: r.bodyText ?? "",
                  assignments: r.assignments.map((a) => ({
                    patientId: a.patientId,
                    viewed: a.viewedAt !== null,
                  })),
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
