import { CircleDot } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { AddToSessionButton } from "@/components/patient/add-to-session";
import { DeleteButton } from "@/components/patient/delete-button";
import { ShareEditor } from "@/components/patient/share-editor";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { deleteEmotionEntry, updateEmotionShare } from "@/lib/actions/emotions";
import { bodyZoneLabels } from "@/lib/constants";
import { decryptOptional } from "@/lib/crypto";
import { formatRelative } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { buildEmotionIndex, intensityWord } from "@/lib/emotions/tree";
import { getEmotionTree } from "@/lib/queries/common";
import { hasActiveLink } from "@/lib/queries/patient";
import { requirePatient } from "@/lib/session";

export const metadata: Metadata = { title: "Lo que registré" };

export default async function EmotionHistoryPage() {
  const { patient } = await requirePatient();
  const [entries, tree, linked] = await Promise.all([
    prisma.emotionEntry.findMany({
      where: { patientId: patient.id },
      orderBy: { occurredAt: "desc" },
      take: 60,
      include: { items: { orderBy: { intensity: "desc" } } },
    }),
    getEmotionTree(),
    hasActiveLink(patient.id),
  ]);
  const index = buildEmotionIndex(tree);

  return (
    <>
      <PageHeader
        title="Lo que registré"
        description="Tus registros de la rueda, del más nuevo al más viejo."
        action={
          <Button asChild size="sm">
            <Link href="/app/rueda">Registrar</Link>
          </Button>
        }
      />
      {entries.length === 0 ? (
        <EmptyState
          icon={<CircleDot />}
          title="Todavía no registraste nada"
          action={
            <Button asChild>
              <Link href="/app/rueda">Probá con la rueda</Link>
            </Button>
          }
        >
          Es rapidísimo: elegís lo que sentís, cuánto, y listo.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {entries.map((entry) => {
            const note = decryptOptional(entry.noteEnc);
            const labels = entry.items.map((i) => index.get(i.nodeId)?.node.label ?? "").join(", ");
            return (
              <li key={entry.id} className="bg-card rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <time
                    className="text-muted-foreground text-sm"
                    dateTime={entry.occurredAt.toISOString()}
                  >
                    {formatRelative(entry.occurredAt)}
                  </time>
                  <div className="flex items-center gap-1">
                    <ShareEditor
                      value={{ visibility: entry.visibility, intention: entry.intention }}
                      action={updateEmotionShare.bind(null, entry.id)}
                      hasProfessional={linked}
                    />
                    <DeleteButton action={deleteEmotionEntry.bind(null, entry.id)} />
                  </div>
                </div>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {entry.items.map((item) => {
                    const e = index.get(item.nodeId);
                    return (
                      <li
                        key={item.id}
                        className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium text-[var(--wheel-text)]"
                        style={{ background: e?.node.color ?? "var(--muted)" }}
                        title={e?.path.map((n) => n.label).join(" › ")}
                      >
                        {e?.node.label ?? "Emoción"}
                        <span
                          className="rounded-full bg-white/60 px-1.5 text-xs tabular-nums"
                          aria-label={`intensidad ${item.intensity}, ${intensityWord(item.intensity)}`}
                        >
                          {item.intensity}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {entry.bodyZones.length > 0 && (
                  <p className="text-muted-foreground mt-3 text-sm">
                    En el cuerpo: {bodyZoneLabels(entry.bodyZones).join(", ")}
                  </p>
                )}
                {note && <p className="mt-2 whitespace-pre-wrap">{note}</p>}
                <div className="mt-2 -ml-2">
                  <AddToSessionButton
                    sourceType="EMOTION"
                    sourceId={entry.id}
                    suggestion={`Me sentí ${labels.toLowerCase()}`}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
