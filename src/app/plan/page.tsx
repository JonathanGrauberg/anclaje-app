import { ArrowLeft, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { Card, CardContent } from "@/components/ui/card";
import { linkedPatientsWhere } from "@/lib/access";
import { isPlanId, planById, type BillingState } from "@/lib/billing";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { contactEmail } from "@/lib/email";
import { formatPesos, PLANS, planDiscount } from "@/lib/launch";
import { getBilling, syncPreapproval } from "@/lib/mercadopago";
import { patientName } from "@/lib/patients";
import { requireProfessionalAccount } from "@/lib/session";
import { CancelPlanButton, PlanPicker } from "./plan-client";

export const metadata: Metadata = { title: "Mi plan" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/**
 * Plan de la profesional. Anda aunque la prueba haya terminado (no usa requireProfessional): es
 * a donde se manda a quien tiene el panel bloqueado. Ver src/lib/billing.ts.
 */
export default async function PlanPage({ searchParams }: PageProps<"/plan">) {
  const { user, professional } = await requireProfessionalAccount();
  const sp = await searchParams;

  // Vuelta de Mercado Pago: se consulta el estado real a MP (no se confía en la URL).
  const returned = one(sp.preapproval_id);
  if (returned && returned.length < 100) {
    await syncPreapproval(returned, professional.id).catch((e) =>
      console.error("[mercadopago] no se pudo sincronizar al volver", (e as Error).message),
    );
  }
  const { state, enabled, access } = await getBilling(professional.id);
  const sub = "sub" in state ? state.sub : null;
  const waiting = sub?.status === "pending" && Boolean(returned);

  const plans = PLANS.map((p) => ({
    id: p.id,
    label: p.label,
    monthly: formatPesos(p.monthly),
    discount: planDiscount(p.monthly),
    detail:
      p.months === 1
        ? "Se debita todos los meses."
        : `${formatPesos(p.monthly * p.months)} cada ${p.months === 12 ? "año" : "6 meses"}.`,
  }));
  const startsAt =
    state.kind === "trial" ? state.trialEndsAt : state.kind === "ending" ? state.until : null;
  const firstChargeNote =
    startsAt && startsAt.getTime() - new Date().getTime() > 86_400_000
      ? `No se te cobra nada hasta el ${formatDate(startsAt)}: el primer débito es ese día.`
      : null;

  const blocked = !access;
  const patients = blocked
    ? await prisma.patientProfile.findMany({
        where: {
          ...linkedPatientsWhere(professional.id),
          isDemo: false,
        },
        select: { id: true, displayName: true, user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      })
    : [];

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-10">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <Logo withText />
          <SignOutButton />
        </div>
        {access && (
          <Link
            href="/pro"
            className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden /> Volver al panel
          </Link>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Mi plan</h1>
          <Status state={state} enabled={enabled} name={professional.displayName} />
        </div>

        {waiting && (
          <p role="status" className="bg-sun-soft rounded-2xl p-4 text-sm">
            Estamos esperando la confirmación de Mercado Pago. Suele tardar unos minutos: actualizá
            esta página en un rato. Si no terminaste el pago, podés volver a elegir el plan.
          </p>
        )}

        {state.kind === "active" && (
          <Card>
            <CardContent className="flex flex-col gap-4">
              <SubDetail sub={state.sub} />
              <CancelPlanButton
                until={state.sub.nextPaymentAt ? formatDate(state.sub.nextPaymentAt) : null}
              />
            </CardContent>
          </Card>
        )}

        {enabled && state.kind !== "free" && state.kind !== "active" && (
          <PlanPicker plans={plans} email={user.email} firstChargeNote={firstChargeNote} />
        )}

        {blocked && patients.length > 0 && (
          <section aria-labelledby="hc-title" className="flex flex-col gap-3">
            <h2 id="hc-title" className="font-semibold">
              Tus historias clínicas
            </h2>
            <p className="text-muted-foreground text-sm">
              Son tuyas: las podés descargar aunque no tengas un plan.
            </p>
            <ul className="flex flex-col gap-2">
              {patients.map((p) => (
                <li key={p.id}>
                  <a
                    href={`/pro/pacientes/${p.id}/historia-clinica`}
                    className="text-primary flex items-center gap-2 text-sm font-medium hover:underline"
                  >
                    <Download className="size-4" aria-hidden /> {patientName(p)}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {contactEmail() && (
          <p className="text-muted-foreground text-sm">
            ¿Dudas con el pago? Escribinos a{" "}
            <a className="text-primary underline" href={`mailto:${contactEmail()}`}>
              {contactEmail()}
            </a>
            .
          </p>
        )}
      </div>
    </main>
  );
}

function Status({ state, enabled, name }: { state: BillingState; enabled: boolean; name: string }) {
  const p = "text-muted-foreground text-lg";
  switch (state.kind) {
    case "free":
      return (
        <p className={p}>
          {name}, tu cuenta es <strong className="text-foreground">gratis para siempre</strong>.
          Gracias por sumarte desde el principio.
        </p>
      );
    case "trial":
      return (
        <p className={p}>
          Te {state.daysLeft === 1 ? "queda" : "quedan"}{" "}
          <strong className="text-foreground">
            {state.daysLeft} {state.daysLeft === 1 ? "día" : "días"} de prueba
          </strong>{" "}
          (hasta el {formatDate(state.trialEndsAt)}).{" "}
          {enabled && "Si elegís tu plan ahora, no perdés esos días."}
        </p>
      );
    case "active":
      return <p className={p}>Tu plan está activo. ¡Gracias!</p>;
    case "ending":
      return (
        <p className={p}>
          Cancelaste tu plan: podés seguir usando el panel hasta el{" "}
          <strong className="text-foreground">{formatDate(state.until)}</strong>. Si querés seguir,
          elegí un plan de nuevo.
        </p>
      );
    case "blocked":
      return (
        <p className={p}>
          Terminó tu período de prueba. Para seguir usando el panel, elegí un plan.{" "}
          <strong className="text-foreground">
            Tus pacientes siguen usando la app y no se borra nada.
          </strong>
        </p>
      );
  }
}

function SubDetail({ sub }: { sub: { plan: string; amount: number; nextPaymentAt: Date | null } }) {
  const label = isPlanId(sub.plan) ? planById(sub.plan).label : sub.plan;
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-[10rem_1fr]">
      <dt className="text-muted-foreground">Plan</dt>
      <dd className="font-medium">{label}</dd>
      <dt className="text-muted-foreground">Se debita</dt>
      <dd className="font-medium tabular-nums">{formatPesos(sub.amount)}</dd>
      {sub.nextPaymentAt && (
        <>
          <dt className="text-muted-foreground">Próximo débito</dt>
          <dd className="font-medium">{formatDate(sub.nextPaymentAt)}</dd>
        </>
      )}
    </dl>
  );
}
