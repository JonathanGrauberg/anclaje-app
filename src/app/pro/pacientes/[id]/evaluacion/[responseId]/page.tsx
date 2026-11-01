import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { BackLink } from "@/components/back-link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/misc";
import { findLinkedPatient } from "@/lib/access";
import { markResponseReviewed } from "@/lib/actions/assessments";
import { getVersion, versionToDoc } from "@/lib/assessments/repo";
import { audit } from "@/lib/audit";
import { decryptOptional } from "@/lib/crypto";
import { formatDate, formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { findRange, scoredValue } from "@/lib/scoring";
import { toScoringInput } from "@/lib/assessments/doc";
import { requireProfessional } from "@/lib/session";

export const metadata: Metadata = { title: "Respuesta de evaluación" };

type SubscaleScore = { key: string; name: string; score: number | null; label: string | null };

export default async function ResponseDetailPage({
  params,
  searchParams,
}: PageProps<"/pro/pacientes/[id]/evaluacion/[responseId]">) {
  const { id, responseId } = await params;
  const { user, professional } = await requireProfessional();
  const patient = await findLinkedPatient(professional.id, id);
  if (!patient) notFound();
  const response = await prisma.assessmentResponse.findFirst({
    where: {
      id: responseId,
      patientId: patient.id,
      status: "COMPLETED",
      assignment: { professionalId: professional.id },
    },
    include: { answers: true },
  });
  if (!response) notFound();
  const version = (await getVersion(response.versionId))!;
  const doc = versionToDoc(version);
  await audit({
    actorId: user.id,
    action: "view",
    entityType: "AssessmentResponse",
    entityId: response.id,
    patientId: patient.id,
  });

  const answers = new Map(response.answers.map((a) => [a.questionId, a]));
  const scoring = toScoringInput(doc, {});
  const critical = new Set(response.criticalQuestionIds);
  const subscales = (response.subscaleScores ?? []) as SubscaleScore[];
  const totalRange = findRange(doc.ranges, null, response.totalScore);
  const name = patient.displayName ?? patient.user.name;

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      {(await searchParams).desde === "respuestas" ? (
        <BackLink href="/pro/evaluaciones?vista=respuestas" label="Respuestas" />
      ) : (
        <BackLink href={`/pro/pacientes/${patient.id}?tab=evaluaciones`} label={name} />
      )}
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
        <p className="text-muted-foreground text-sm">
          v{version.version} · respondida el {formatDateTime(response.completedAt!)}
        </p>
      </header>

      {critical.size > 0 && (
        <div
          role="alert"
          className="border-danger/40 bg-danger-soft flex items-start gap-3 rounded-2xl border p-4"
        >
          <AlertTriangle className="text-danger mt-0.5 size-5 shrink-0" aria-hidden />
          <p>
            Se activó {critical.size === 1 ? "un ítem crítico" : `${critical.size} ítems críticos`}.
            Al paciente se le mostraron su plan de calma y las líneas de ayuda.
          </p>
        </div>
      )}

      <section className="bg-card flex flex-wrap items-center gap-6 rounded-2xl border p-5">
        <div>
          <p className="text-muted-foreground text-sm">Puntaje total</p>
          <p className="text-3xl font-semibold tabular-nums">{response.totalScore ?? "—"}</p>
        </div>
        {response.interpretation && (
          <span
            className="rounded-full px-3 py-1 font-medium text-[var(--wheel-text)]"
            style={{ background: totalRange?.color ?? "var(--muted)" }}
          >
            {response.interpretation}
          </span>
        )}
        {subscales.map((s) => (
          <div key={s.key}>
            <p className="text-muted-foreground text-sm">{s.name}</p>
            <p className="text-lg font-semibold tabular-nums">
              {s.score ?? "—"} {s.label && <span className="text-sm font-normal">· {s.label}</span>}
            </p>
          </div>
        ))}
        <div className="ml-auto">
          {response.reviewedAt ? (
            <p className="text-muted-foreground flex items-center gap-1.5 text-sm">
              <CheckCircle2 className="text-primary size-4" aria-hidden /> Revisada el{" "}
              {formatDate(response.reviewedAt)}
            </p>
          ) : (
            <form
              action={async () => {
                "use server";
                await markResponseReviewed(response.id);
              }}
            >
              <Button size="sm">Marcar como revisada</Button>
            </form>
          )}
        </div>
      </section>

      <ol className="flex flex-col gap-2">
        {doc.questions.map((q, i) => {
          if (q.type === "INFO") {
            return (
              <li key={q.key} className="pt-2 font-semibold">
                {q.text}
              </li>
            );
          }
          const a = answers.get(q.key);
          const sq = scoring.questions[i];
          const value = a
            ? scoredValue(sq, { valueNumber: a.valueNumber, optionKeys: a.optionIds })
            : null;
          const shown = !a
            ? null
            : a.optionIds.length
              ? q.options
                  .filter((o) => a.optionIds.includes(o.key))
                  .map((o) => o.label)
                  .join(", ")
              : a.valueNumber !== null
                ? `${a.valueNumber}${q.type === "PERCENTAGE" ? " %" : ""}`
                : a.valueDate
                  ? formatDate(a.valueDate)
                  : decryptOptional(a.textEnc);
          return (
            <li
              key={q.key}
              className={`bg-card rounded-2xl border p-4 ${critical.has(q.key) ? "border-danger/50" : ""}`}
            >
              <p className="text-muted-foreground text-sm">
                {i + 1}. {q.text}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <p className="font-medium whitespace-pre-wrap">
                  {shown ?? <span className="text-muted-foreground italic">Sin responder</span>}
                </p>
                {q.scored && value !== null && (
                  <Badge className="tabular-nums">
                    {value} pts{q.reverse && " (invertido)"}
                  </Badge>
                )}
                {critical.has(q.key) && (
                  <Badge className="bg-danger-soft text-danger">Crítico</Badge>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
