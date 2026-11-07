import { ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MonthlyChart } from "@/components/fees/monthly-chart";
import { PaymentsList } from "@/components/fees/payments-list";
import { PricesEditor } from "@/components/fees/prices-editor";
import { RegisterPayment, type PatientPriceMap } from "@/components/fees/register-payment";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import {
  changePct,
  formatMoney,
  formatMonth,
  methodLabel,
  monthKey,
  shiftMonthKey,
} from "@/lib/fees";
import {
  ensureDefaultPrices,
  getLastServices,
  getMonthSummary,
  getPayablePatients,
  getServicePrices,
} from "@/lib/queries/fees";
import { requireProfessional } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Honorarios" };

const MONTH_RE = /^\d{4}-\d{2}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FeesPage({ searchParams }: PageProps<"/pro/honorarios">) {
  const sp = await searchParams;
  const { professional } = await requireProfessional();
  await ensureDefaultPrices(professional.id);

  const tab = one(sp.tab) === "precios" ? "precios" : "mes";
  const current = monthKey(new Date());
  const mesParam = one(sp.mes);
  const month = mesParam && MONTH_RE.test(mesParam) && mesParam <= current ? mesParam : current;

  const [services, patients, lastServices, priceRows] = await Promise.all([
    getServicePrices(professional.id),
    getPayablePatients(professional.id),
    getLastServices(professional.id),
    prisma.patientPrice.findMany({
      where: { professionalId: professional.id },
      select: { patientId: true, serviceId: true, price: true },
    }),
  ]);
  const patientPrices: PatientPriceMap = {};
  for (const r of priceRows) (patientPrices[r.patientId] ??= {})[r.serviceId] = r.price;

  return (
    <>
      <PageHeader
        tone="forest"
        title="Honorarios"
        description="Tus precios y lo que vas cobrando. Es solo para vos: tus pacientes no lo ven."
        action={
          <RegisterPayment
            patients={patients}
            services={services}
            patientPrices={patientPrices}
            lastServices={lastServices}
          />
        }
      />
      <nav aria-label="Secciones de honorarios" className="mb-6 flex gap-1 border-b">
        {[
          { id: "mes", label: "Cobros del mes", href: "/pro/honorarios" },
          { id: "precios", label: "Mis precios", href: "/pro/honorarios?tab=precios" },
        ].map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={tab === t.id ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm whitespace-nowrap transition-colors",
              tab === t.id
                ? "border-primary text-primary font-medium"
                : "text-muted-foreground hover:text-foreground border-transparent",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "precios" ? (
        <div className="flex flex-col gap-3">
          <p className="text-muted-foreground max-w-2xl text-sm">
            Arrancan con valores de referencia. Tocá el precio o el nombre para cambiarlo: se guarda
            solo. Si a un paciente le cobrás distinto, lo ponés en su ficha → Honorarios.
          </p>
          <PricesEditor services={services} />
        </div>
      ) : (
        <MonthTab professionalId={professional.id} month={month} current={current} />
      )}
    </>
  );
}

async function MonthTab({
  professionalId,
  month,
  current,
}: {
  professionalId: string;
  month: string;
  current: string;
}) {
  const s = await getMonthSummary(professionalId, month);
  const pct = changePct(s.total, s.previousTotal);
  const prev = shiftMonthKey(month, -1);
  const next = shiftMonthKey(month, 1);
  const patientsCount = s.byPatient.length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Link
          href={`/pro/honorarios?mes=${prev}`}
          className="hover:bg-muted rounded-full p-2"
          aria-label={`Ver ${formatMonth(prev)}`}
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h2 className="min-w-44 text-center text-lg font-semibold first-letter:uppercase">
          {formatMonth(month)}
        </h2>
        {month < current ? (
          <Link
            href={next === current ? "/pro/honorarios" : `/pro/honorarios?mes=${next}`}
            className="hover:bg-muted rounded-full p-2"
            aria-label={`Ver ${formatMonth(next)}`}
          >
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        ) : (
          <span className="w-9" aria-hidden />
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Cobrado" value={formatMoney(s.total)}>
          {pct === null
            ? "Sin cobros el mes anterior para comparar"
            : `${pct > 0 ? "+" : ""}${pct}% que ${formatMonth(prev).split(" ")[0]} (${formatMoney(s.previousTotal)})`}
        </Stat>
        <Stat label="Cobros" value={String(s.count)}>
          {patientsCount === 1 ? "De 1 paciente" : `De ${patientsCount} pacientes`}
        </Stat>
        <Stat
          label="Promedio por cobro"
          value={s.count ? formatMoney(Math.round(s.total / s.count)) : "—"}
        >
          {s.byMethod[0]
            ? `La mayoría por ${methodLabel(s.byMethod[0].method as PaymentMethod).toLowerCase()}`
            : "Todavía sin cobros"}
        </Stat>
      </div>

      {s.count === 0 ? (
        <EmptyState icon={<Wallet />} title="No anotaste cobros este mes">
          Cuando un paciente te pague, tocá «Registrar cobro». El precio se completa solo con tu
          lista.
        </EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section aria-labelledby="fees-list" className="flex min-w-0 flex-col gap-3">
            <h2 id="fees-list" className="font-semibold">
              Cobros
            </h2>
            <PaymentsList
              payments={s.payments.map((p) => ({ ...p, paidAt: p.paidAt.toISOString() }))}
            />
          </section>
          <div className="flex min-w-0 flex-col gap-6">
            <MonthlyChart rows={s.history} current={month} />
            <section aria-labelledby="fees-by-patient" className="flex flex-col gap-3">
              <h2 id="fees-by-patient" className="font-semibold">
                Por paciente
              </h2>
              <ul className="bg-card divide-y rounded-2xl border text-sm">
                {s.byPatient.map((p) => (
                  <li
                    key={p.id ?? "—"}
                    className="flex items-center justify-between gap-3 px-4 py-2"
                  >
                    <span className="min-w-0 truncate">
                      {p.name}
                      <span className="text-muted-foreground"> · {p.count}</span>
                    </span>
                    <span className="font-medium tabular-nums">{formatMoney(p.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="fees-by-method" className="flex flex-col gap-3">
              <h2 id="fees-by-method" className="font-semibold">
                Por medio de pago
              </h2>
              <ul className="bg-card divide-y rounded-2xl border text-sm">
                {s.byMethod.map((m) => (
                  <li key={m.method} className="flex items-center justify-between gap-3 px-4 py-2">
                    <span>{methodLabel(m.method as PaymentMethod)}</span>
                    <span className="font-medium tabular-nums">{formatMoney(m.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-2xl border p-4">
      <p className="text-muted-foreground text-sm">{label}</p>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      {children && <p className="text-muted-foreground text-xs">{children}</p>}
    </div>
  );
}
