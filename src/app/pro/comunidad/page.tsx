import { Library } from "lucide-react";
import type { Metadata } from "next";
import { MarkdownView } from "@/components/markdown-view";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireProfessional } from "@/lib/session";
import { CopyToLibraryButton, DeleteMineButton, ItemLink, ProposeButton } from "./community-client";

export const metadata: Metadata = { title: "Comunidad" };

const KIND_LABEL = { PDF: "PDF", IMAGE: "Imagen", LINK: "Link", TEXT: "Texto" } as const;
const STATUS = {
  PENDING: { label: "En revisión", className: "bg-sun-soft" },
  APPROVED: { label: "Publicado", className: "bg-primary-soft text-primary" },
  REJECTED: { label: "No publicado", className: "bg-danger-soft text-danger" },
} as const;

/** Biblioteca colaborativa: material que comparten las profesionales, revisado antes de publicarse. */
export default async function CommunityPage({ searchParams }: PageProps<"/pro/comunidad">) {
  const { professional } = await requireProfessional();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 60) : "";
  const category = typeof sp.categoria === "string" ? sp.categoria.slice(0, 60) : "";

  const [items, mine, categories] = await Promise.all([
    prisma.communityItem.findMany({
      where: {
        status: "APPROVED",
        ...(category && { category }),
        ...(q && {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { summary: { contains: q, mode: "insensitive" } },
            { source: { contains: q, mode: "insensitive" } },
            { tags: { has: q.toLowerCase() } },
          ],
        }),
      },
      orderBy: { reviewedAt: "desc" },
      take: 100,
      include: { author: { select: { displayName: true } } },
    }),
    prisma.communityItem.findMany({
      where: { authorId: professional.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.communityItem.findMany({
      where: { status: "APPROVED", category: { not: null } },
      distinct: ["category"],
      select: { category: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        tone="sage"
        title="Comunidad"
        description="Material que comparten colegas: artículos, guías y ejercicios. Todo se revisa antes de publicarse."
        action={<ProposeButton />}
      />

      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar por título, tema, autor o etiqueta"
          aria-label="Buscar en la Comunidad"
          className="border-input bg-card min-w-0 flex-1 rounded-full border px-4 py-2 text-sm"
        />
        {categories.length > 0 && (
          <select
            name="categoria"
            defaultValue={category}
            aria-label="Categoría"
            className="border-input bg-card rounded-full border px-3 py-2 text-sm"
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.category} value={c.category!}>
                {c.category}
              </option>
            ))}
          </select>
        )}
        <button className="bg-primary-soft text-primary rounded-full px-4 py-2 text-sm font-medium">
          Buscar
        </button>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={<Library />}
          title={q || category ? "No encontramos nada" : "Todavía no hay material"}
        >
          {q || category
            ? "Probá con otra palabra o categoría."
            : "Sé la primera en compartir algo: un artículo de acceso abierto, una guía propia o un ejercicio que te sirva en consultorio."}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {items.map((it) => (
            <li key={it.id} className="bg-card flex flex-col gap-3 rounded-2xl border p-5">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{KIND_LABEL[it.kind]}</Badge>
                  {it.category && <Badge className="bg-transparent">{it.category}</Badge>}
                </div>
                <h2 className="text-lg font-semibold">{it.title}</h2>
                <p className="text-muted-foreground text-sm">
                  Compartido por {it.author.displayName}
                  {it.reviewedAt && ` · ${formatDate(it.reviewedAt)}`}
                </p>
              </div>
              {it.summary && <p className="text-sm whitespace-pre-wrap">{it.summary}</p>}
              {it.source && (
                <p className="text-muted-foreground text-sm">
                  <span className="font-medium">Fuente:</span> {it.source}
                </p>
              )}
              {it.kind === "TEXT" && it.bodyText && (
                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">Leer</summary>
                  <div className="mt-3">
                    <MarkdownView source={it.bodyText} />
                  </div>
                </details>
              )}
              {it.tags.length > 0 && (
                <p className="text-muted-foreground text-xs">
                  {it.tags.map((t) => `#${t}`).join(" ")}
                </p>
              )}
              <div className="mt-auto flex flex-wrap gap-2">
                <ItemLink kind={it.kind} url={it.url} storageKey={it.storageKey} />
                <CopyToLibraryButton id={it.id} />
              </div>
            </li>
          ))}
        </ul>
      )}

      {mine.length > 0 && (
        <section aria-labelledby="mine-title" className="mt-10 flex flex-col gap-3">
          <h2 id="mine-title" className="text-lg font-semibold">
            Tus aportes
          </h2>
          <ul className="flex flex-col gap-2">
            {mine.map((it) => (
              <li
                key={it.id}
                className="bg-card flex flex-wrap items-start justify-between gap-3 rounded-2xl border p-4"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-medium">{it.title}</p>
                  <p className="text-muted-foreground text-sm">
                    Enviado el {formatDate(it.createdAt)}
                  </p>
                  {it.reviewNote && (
                    <p className="text-sm">
                      <span className="font-medium">Comentario de la revisión:</span>{" "}
                      {it.reviewNote}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS[it.status].className}>{STATUS[it.status].label}</Badge>
                  <DeleteMineButton id={it.id} title={it.title} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
