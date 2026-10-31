import { Quote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToSessionButton } from "@/components/patient/add-to-session";
import { DeleteButton } from "@/components/patient/delete-button";
import { FeedbackList } from "@/components/patient/feedback-list";
import { ShareEditor } from "@/components/patient/share-editor";
import { Button } from "@/components/ui/button";
import { deleteCbtRecord, updateCbtShare } from "@/lib/actions/cbt";
import { bodyZoneLabels, type BodyZoneId } from "@/lib/constants";
import { formatDateTime, toLocalInputValue } from "@/lib/dates";
import { buildEmotionIndex, intensityWord } from "@/lib/emotions/tree";
import { getOwnCbtRecord } from "@/lib/queries/cbt";
import { getDistortions, getEmotionTree } from "@/lib/queries/common";
import { readPatientFeedbacks } from "@/lib/queries/feedback";
import { hasActiveLink } from "@/lib/queries/patient";
import { requirePatient } from "@/lib/session";
import { CbtWizard } from "./cbt-wizard";

export const metadata: Metadata = { title: "Autorregistro" };

export default async function CbtRecordPage({ params }: PageProps<"/app/autorregistro/[id]">) {
  const { id } = await params;
  const { patient } = await requirePatient();
  const record = await getOwnCbtRecord(id, patient.id);
  if (!record) notFound();
  const [tree, distortions, linked] = await Promise.all([
    getEmotionTree(),
    getDistortions(),
    hasActiveLink(patient.id),
  ]);

  if (record.status === "DRAFT") {
    return (
      <CbtWizard
        id={record.id}
        tree={tree}
        distortions={distortions}
        hasProfessional={linked}
        initialStep={record.currentStep}
        initial={{
          occurredAt: toLocalInputValue(record.occurredAt),
          situation: record.situation,
          thought: record.thought,
          beliefBefore: record.beliefBefore,
          distortionIds: record.distortionIds,
          emotions: record.emotions,
          bodyZones: record.bodyZones as BodyZoneId[],
          behavior: record.behavior,
          alternative: record.alternative,
          beliefAfter: record.beliefAfter,
          share: { visibility: record.visibility, intention: record.intention },
        }}
      />
    );
  }

  const feedbacks = await readPatientFeedbacks(patient.id, { type: "CBT", id: record.id });
  const index = buildEmotionIndex(tree);
  const distortionNames = distortions
    .filter((d) => record.distortionIds.includes(d.id))
    .map((d) => d.name);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-muted-foreground text-sm">{formatDateTime(record.occurredAt)}</p>
          <h1 className="text-2xl font-semibold tracking-tight">Autorregistro</h1>
        </div>
        <div className="flex items-center gap-1">
          <ShareEditor
            value={{ visibility: record.visibility, intention: record.intention }}
            action={updateCbtShare.bind(null, record.id)}
            hasProfessional={linked}
          />
          <DeleteButton
            action={deleteCbtRecord.bind(null, record.id)}
            what="este autorregistro"
            redirectTo="/app/autorregistro"
          />
        </div>
      </div>

      <Section title="Situación">
        <p className="whitespace-pre-wrap">{record.situation}</p>
      </Section>

      <Section title="Pensamiento">
        <blockquote className="flex gap-2 italic">
          <Quote className="text-muted-foreground size-4 shrink-0" aria-hidden />
          <span className="whitespace-pre-wrap">{record.thought}</span>
        </blockquote>
        {record.beliefBefore !== null && (
          <p className="mt-3 text-sm">
            Te lo creías un <strong>{record.beliefBefore} %</strong>
            {record.beliefAfter !== null && record.beliefAfter !== record.beliefBefore && (
              <>
                {" "}
                → después, un <strong>{record.beliefAfter} %</strong>
              </>
            )}
          </p>
        )}
        {distortionNames.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {distortionNames.map((n) => (
              <span key={n} className="bg-muted rounded-full px-2.5 py-0.5 text-xs font-medium">
                {n}
              </span>
            ))}
          </div>
        )}
      </Section>

      {(record.emotions.length > 0 || record.bodyZones.length > 0) && (
        <Section title="Emociones">
          <ul className="flex flex-wrap gap-2">
            {record.emotions.map((e) => {
              const node = index.get(e.nodeId)?.node;
              return (
                <li
                  key={e.nodeId}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-[var(--wheel-text)]"
                  style={{ background: node?.color }}
                  aria-label={`${node?.label}: ${e.intensityBefore}, ${intensityWord(e.intensityBefore)}${e.intensityAfter ? `; después ${e.intensityAfter}` : ""}`}
                >
                  {node?.label}{" "}
                  <span className="tabular-nums">
                    {e.intensityBefore}
                    {e.intensityAfter && e.intensityAfter !== e.intensityBefore
                      ? ` → ${e.intensityAfter}`
                      : ""}
                  </span>
                </li>
              );
            })}
          </ul>
          {record.bodyZones.length > 0 && (
            <p className="text-muted-foreground mt-3 text-sm">
              En el cuerpo: {bodyZoneLabels(record.bodyZones).join(", ")}
            </p>
          )}
        </Section>
      )}

      {record.behavior && (
        <Section title="Qué hice">
          <p className="whitespace-pre-wrap">{record.behavior}</p>
        </Section>
      )}

      {record.alternative && (
        <Section title="Otra mirada">
          <p className="whitespace-pre-wrap">{record.alternative}</p>
        </Section>
      )}

      {feedbacks.length > 0 && (
        <section aria-labelledby="fb-title" className="flex flex-col gap-3">
          <h2 id="fb-title" className="text-lg font-semibold">
            Devolución de tu psicóloga
          </h2>
          <FeedbackList feedbacks={feedbacks} />
        </section>
      )}

      <div className="-ml-2 flex flex-wrap gap-2">
        <AddToSessionButton
          sourceType="CBT"
          sourceId={record.id}
          suggestion={record.thought.slice(0, 200)}
        />
      </div>
      <Button asChild variant="ghost" className="self-start">
        <Link href="/app/autorregistro">Volver a mis autorregistros</Link>
      </Button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl border p-4">
      <h2 className="text-muted-foreground mb-2 text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}
