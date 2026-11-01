import { CalendarCheck, Quote, Trash2 } from "lucide-react";
import { BackLink } from "@/components/back-link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EmotionChip } from "@/components/emotion-chip";
import { MarkdownView } from "@/components/markdown-view";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import {
  findLinkedPatient,
  sharedCbtWhere,
  sharedEmotionWhere,
  sharedJournalWhere,
} from "@/lib/access";
import { deleteFeedback } from "@/lib/actions/pro";
import { audit } from "@/lib/audit";
import { bodyZoneLabels, INTENTION_LABELS } from "@/lib/constants";
import { decrypt, decryptOptional } from "@/lib/crypto";
import { formatDateTime, formatRelative } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { buildEmotionIndex, type EmotionIndex } from "@/lib/emotions/tree";
import { getDistortions, getEmotionTree } from "@/lib/queries/common";
import { getOwnFeedbacks, KIND_TO_TARGET, type TimelineKind } from "@/lib/queries/pro";
import { requireProfessional } from "@/lib/session";
import { FeedbackForm } from "./feedback-form";

export const metadata: Metadata = { title: "Entrada compartida" };

export default async function SharedEntryPage({
  params,
}: PageProps<"/pro/pacientes/[id]/[tipo]/[entryId]">) {
  const { id, tipo, entryId } = await params;
  if (!(tipo in KIND_TO_TARGET)) notFound();
  const kind = tipo as TimelineKind;
  const targetType = KIND_TO_TARGET[kind];

  const { user, professional } = await requireProfessional();
  const pid = professional.id;
  const patient = await findLinkedPatient(pid, id);
  if (!patient) notFound();

  const [tree, distortions] = await Promise.all([getEmotionTree(), getDistortions()]);
  const index = buildEmotionIndex(tree);

  // Siempre con los filtros de privacidad: si el paciente lo dejó de compartir, 404.
  const content = await loadEntry(kind, entryId, patient.id, pid, index, distortions);
  if (!content) notFound();

  await audit({
    actorId: user.id,
    action: "view",
    entityType: targetType,
    entityId: entryId,
    patientId: patient.id,
  });

  const [feedbacks, quickReplies, resources] = await Promise.all([
    getOwnFeedbacks(pid, targetType, entryId),
    prisma.quickReply.findMany({
      where: { professionalId: pid },
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true, body: true },
    }),
    prisma.resource.findMany({
      where: { professionalId: pid },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
      take: 100,
    }),
  ]);
  const name = patient.displayName ?? patient.user.name;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <BackLink href={`/pro/pacientes/${patient.id}`} label={name} />

      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{content.label}</Badge>
          <span className="text-muted-foreground text-sm">{formatDateTime(content.at)}</span>
          {content.intention && (
            <Badge className="bg-primary-soft text-primary">
              {INTENTION_LABELS[content.intention]}
            </Badge>
          )}
        </div>
        {content.title && (
          <h1 className="text-2xl font-semibold tracking-tight">{content.title}</h1>
        )}
      </header>

      <article className="flex flex-col gap-4">{content.body}</article>

      <section aria-labelledby="fb-title" className="flex flex-col gap-3 border-t pt-5">
        <h2 id="fb-title" className="text-lg font-semibold">
          Tu devolución
        </h2>
        {feedbacks.length > 0 && (
          <ul className="flex flex-col gap-2">
            {feedbacks.map((f) => (
              <li key={f.id} className="bg-primary-soft/60 rounded-2xl p-4">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-muted-foreground text-xs">
                    {formatRelative(f.createdAt)} ·{" "}
                    {f.readAt ? `leída ${formatRelative(f.readAt)}` : "todavía no la leyó"}
                  </p>
                  <form
                    action={async () => {
                      "use server";
                      await deleteFeedback(f.id);
                    }}
                  >
                    <Button variant="ghost" size="icon-sm" aria-label="Borrar devolución">
                      <Trash2 />
                    </Button>
                  </form>
                </div>
                <p className="whitespace-pre-wrap">{f.body}</p>
                {(f.discussInSession || f.resource) && (
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    {f.discussInSession && (
                      <span className="flex items-center gap-1">
                        <CalendarCheck className="size-4" aria-hidden /> Lo vemos en sesión
                      </span>
                    )}
                    {f.resource && <Badge>Recurso: {f.resource.title}</Badge>}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <FeedbackForm
          targetType={targetType}
          targetId={entryId}
          quickReplies={quickReplies}
          resources={resources}
        />
      </section>
    </div>
  );
}

type Loaded = {
  label: string;
  at: Date;
  title: string | null;
  intention: keyof typeof INTENTION_LABELS | null;
  body: React.ReactNode;
};

async function loadEntry(
  kind: TimelineKind,
  entryId: string,
  patientId: string,
  pid: string,
  index: EmotionIndex,
  distortions: Awaited<ReturnType<typeof getDistortions>>,
): Promise<Loaded | null> {
  if (kind === "diario") {
    const j = await prisma.journalEntry.findFirst({
      where: { id: entryId, patientId, ...sharedJournalWhere(pid) },
      include: { emotions: { select: { nodeId: true } } },
    });
    if (!j) return null;
    return {
      label: "Diario",
      at: j.sharedAt ?? j.updatedAt,
      title: decryptOptional(j.titleEnc) || "Entrada del diario",
      intention: j.intention,
      body: (
        <>
          {j.emotions.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {j.emotions.map((e) => (
                <EmotionChip key={e.nodeId} index={index} nodeId={e.nodeId} />
              ))}
            </div>
          )}
          <div className="bg-card rounded-2xl border p-5">
            <MarkdownView source={decrypt(j.bodyEnc)} />
          </div>
        </>
      ),
    };
  }

  if (kind === "rueda") {
    const e = await prisma.emotionEntry.findFirst({
      where: { id: entryId, patientId, ...sharedEmotionWhere(pid) },
      include: { items: { orderBy: { intensity: "desc" } } },
    });
    if (!e) return null;
    const note = decryptOptional(e.noteEnc);
    return {
      label: "Rueda",
      at: e.occurredAt,
      title: null,
      intention: e.intention,
      body: (
        <div className="bg-card flex flex-col gap-3 rounded-2xl border p-5">
          <div className="flex flex-wrap gap-2">
            {e.items.map((i) => (
              <EmotionChip key={i.id} index={index} nodeId={i.nodeId} intensity={i.intensity} />
            ))}
          </div>
          <ul className="text-muted-foreground text-sm">
            {e.items.map((i) => (
              <li key={i.id}>
                {index
                  .get(i.nodeId)
                  ?.path.map((n) => n.label)
                  .join(" › ")}
                : {i.intensity}/10
              </li>
            ))}
          </ul>
          {e.bodyZones.length > 0 && (
            <p className="text-sm">En el cuerpo: {bodyZoneLabels(e.bodyZones).join(", ")}</p>
          )}
          {note && <p className="whitespace-pre-wrap">{note}</p>}
        </div>
      ),
    };
  }

  const c = await prisma.cbtRecord.findFirst({
    where: { id: entryId, patientId, ...sharedCbtWhere(pid) },
    include: { emotions: true, distortions: { select: { distortionId: true } } },
  });
  if (!c) return null;
  const names = distortions
    .filter((d) => c.distortions.some((x) => x.distortionId === d.id))
    .map((d) => d.name);
  const behavior = decryptOptional(c.behaviorEnc);
  const alternative = decryptOptional(c.alternativeEnc);
  return {
    label: "Autorregistro",
    at: c.occurredAt,
    title: null,
    intention: c.intention,
    body: (
      <>
        <Row title="Situación">
          <p className="whitespace-pre-wrap">{decryptOptional(c.situationEnc)}</p>
        </Row>
        <Row title="Pensamiento automático">
          <blockquote className="flex gap-2 italic">
            <Quote className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span className="whitespace-pre-wrap">{decryptOptional(c.thoughtEnc)}</span>
          </blockquote>
          {c.beliefBefore !== null && (
            <p className="mt-3 text-sm">
              Credibilidad: <strong>{c.beliefBefore} %</strong>
              {c.beliefAfter !== null && (
                <>
                  {" "}
                  → <strong>{c.beliefAfter} %</strong> después de la re-evaluación
                </>
              )}
            </p>
          )}
          {names.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {names.map((n) => (
                <Badge key={n}>{n}</Badge>
              ))}
            </div>
          )}
        </Row>
        {c.emotions.length > 0 && (
          <Row title="Emociones (antes → después)">
            <ul className="flex flex-col gap-1 text-sm">
              {c.emotions.map((e) => (
                <li key={e.nodeId} className="flex items-center gap-2">
                  <EmotionChip index={index} nodeId={e.nodeId} />
                  <span className="tabular-nums">
                    {e.intensityBefore}
                    {e.intensityAfter !== null ? ` → ${e.intensityAfter}` : ""}
                  </span>
                </li>
              ))}
            </ul>
            {c.bodyZones.length > 0 && (
              <p className="text-muted-foreground mt-2 text-sm">
                En el cuerpo: {bodyZoneLabels(c.bodyZones).join(", ")}
              </p>
            )}
          </Row>
        )}
        {behavior && (
          <Row title="Qué hizo">
            <p className="whitespace-pre-wrap">{behavior}</p>
          </Row>
        )}
        {alternative && (
          <Row title="Pensamiento alternativo">
            <p className="whitespace-pre-wrap">{alternative}</p>
          </Row>
        )}
      </>
    ),
  };
}

function Row({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-card rounded-2xl border p-4">
      <h2 className="text-muted-foreground mb-2 text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}
