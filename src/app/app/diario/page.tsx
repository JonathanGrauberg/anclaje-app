import { BookHeart, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ShareEditor } from "@/components/patient/share-editor";
import { Button } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { updateJournalShare } from "@/lib/actions/journal";
import { decrypt, decryptOptional } from "@/lib/crypto";
import { formatRelative } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { buildEmotionIndex } from "@/lib/emotions/tree";
import { toPlainText } from "@/lib/markdown";
import { getEmotionTree } from "@/lib/queries/common";
import { hasActiveLink } from "@/lib/queries/patient";
import { requirePatient } from "@/lib/session";

export const metadata: Metadata = { title: "Mi diario" };

export default async function JournalListPage() {
  const { patient } = await requirePatient();
  const [entries, tree, linked] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { patientId: patient.id },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { emotions: { select: { nodeId: true } } },
    }),
    getEmotionTree(),
    hasActiveLink(patient.id),
  ]);
  const index = buildEmotionIndex(tree);

  return (
    <>
      <PageHeader
        title="Mi diario íntimo"
        description="Es privado. Vos elegís si compartís alguna entrada."
        action={
          <Button asChild>
            <Link href="/app/diario/nueva">
              <PenLine /> Escribir
            </Link>
          </Button>
        }
      />
      {entries.length === 0 ? (
        <EmptyState
          icon={<BookHeart />}
          title="Tu diario está esperando"
          action={
            <Button asChild>
              <Link href="/app/diario/nueva">Escribir la primera</Link>
            </Button>
          }
        >
          No hace falta que sea largo ni prolijo. Lo que escribas acá es tuyo.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => {
            const title = decryptOptional(entry.titleEnc);
            const excerpt = toPlainText(decrypt(entry.bodyEnc)).slice(0, 160);
            return (
              <li
                key={entry.id}
                className="bg-card hover:bg-muted/40 relative rounded-2xl border p-4 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <time
                    className="text-muted-foreground text-sm"
                    dateTime={entry.updatedAt.toISOString()}
                  >
                    {formatRelative(entry.createdAt)}
                  </time>
                  <div className="relative z-10 flex items-center gap-2">
                    {entry.isDraft && <Badge>Borrador</Badge>}
                    <ShareEditor
                      value={{ visibility: entry.visibility, intention: entry.intention }}
                      action={updateJournalShare.bind(null, entry.id)}
                      hasProfessional={linked}
                    />
                  </div>
                </div>
                <Link
                  href={`/app/diario/${entry.id}`}
                  className="focus-visible:after:ring-ring mt-2 block after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-3"
                >
                  {title ? (
                    <>
                      <span className="block text-lg font-semibold">{title}</span>
                      {excerpt && (
                        <span className="text-muted-foreground mt-1 line-clamp-2 block">
                          {excerpt}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="line-clamp-3 block">{excerpt || "Entrada sin texto"}</span>
                  )}
                </Link>
                {entry.emotions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {entry.emotions.map(({ nodeId }) => {
                      const e = index.get(nodeId);
                      return e ? (
                        <span
                          key={nodeId}
                          className="rounded-full px-2.5 py-0.5 text-xs font-medium text-[var(--wheel-text)]"
                          style={{ background: e.node.color }}
                        >
                          {e.node.label}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
