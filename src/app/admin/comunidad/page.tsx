import { Library } from "lucide-react";
import type { Metadata } from "next";
import { ItemLink } from "@/app/pro/comunidad/community-client";
import { MarkdownView } from "@/components/markdown-view";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ReviewButtons } from "./review-client";

export const metadata: Metadata = { title: "Comunidad" };

const KIND_LABEL = { PDF: "PDF", IMAGE: "Imagen", LINK: "Link", TEXT: "Texto" } as const;
const STATUS = {
  PENDING: "En revisión",
  APPROVED: "Publicado",
  REJECTED: "No publicado",
} as const;

/** Revisión de la biblioteca colaborativa: aprobar o devolver con un comentario. */
export default async function AdminCommunityPage() {
  await requireAdmin();
  const [pending, recent] = await Promise.all([
    prisma.communityItem.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { author: { select: { displayName: true, user: { select: { email: true } } } } },
    }),
    prisma.communityItem.findMany({
      where: { status: { not: "PENDING" } },
      orderBy: { reviewedAt: "desc" },
      take: 30,
      include: { author: { select: { displayName: true } } },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Comunidad"
        description="Material que proponen las profesionales. Se publica para todas recién cuando lo aprobás."
      />
      <section aria-labelledby="pend-title" className="flex flex-col gap-3">
        <h2 id="pend-title" className="text-lg font-semibold">
          Para revisar ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <EmptyState icon={<Library />} title="No hay nada pendiente" />
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((it) => (
              <li key={it.id} className="bg-card flex flex-col gap-3 rounded-2xl border p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{KIND_LABEL[it.kind]}</Badge>
                  {it.category && <Badge className="bg-transparent">{it.category}</Badge>}
                </div>
                <h3 className="text-lg font-semibold">{it.title}</h3>
                <p className="text-muted-foreground text-sm">
                  {it.author.displayName} ({it.author.user.email}) · {formatDate(it.createdAt)}
                </p>
                {it.summary && <p className="text-sm whitespace-pre-wrap">{it.summary}</p>}
                {it.source && (
                  <p className="text-sm">
                    <span className="font-medium">Fuente:</span> {it.source}
                  </p>
                )}
                {it.kind === "LINK" && it.url && (
                  <p className="text-sm break-all">
                    <span className="font-medium">Link:</span> {it.url}
                  </p>
                )}
                {it.kind === "TEXT" && it.bodyText && (
                  <div className="rounded-xl border p-3">
                    <MarkdownView source={it.bodyText} />
                  </div>
                )}
                {it.tags.length > 0 && (
                  <p className="text-muted-foreground text-xs">
                    {it.tags.map((t) => `#${t}`).join(" ")}
                  </p>
                )}
                <div className="flex flex-wrap items-start gap-2">
                  <ItemLink kind={it.kind} url={it.url} storageKey={it.storageKey} />
                </div>
                <ReviewButtons id={it.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {recent.length > 0 && (
        <section aria-labelledby="rec-title" className="mt-10 flex flex-col gap-3">
          <h2 id="rec-title" className="text-lg font-semibold">
            Revisados
          </h2>
          <ul className="flex flex-col gap-2">
            {recent.map((it) => (
              <li
                key={it.id}
                className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-sm"
              >
                <span>
                  <span className="font-medium">{it.title}</span>{" "}
                  <span className="text-muted-foreground">
                    · {it.author.displayName}
                    {it.reviewedAt && ` · ${formatDate(it.reviewedAt)}`}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <Badge>{STATUS[it.status]}</Badge>
                  {it.status === "APPROVED" && <ReviewButtons id={it.id} compact />}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
