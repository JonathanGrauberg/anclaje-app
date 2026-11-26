import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Inbox,
  Library,
  ShieldAlert,
  Stethoscope,
  Users,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui/misc";
import { planView } from "@/lib/admin-plan";
import { TIME_ZONE } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { formatPesos } from "@/lib/launch";
import { billingStates } from "@/lib/mercadopago";
import { requireAdmin } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Resumen" };

const DAY = 24 * 60 * 60 * 1000;
const MONTHS = 6;
const monthKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TIME_ZONE }).slice(0, 7);
const monthName = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// Solo conteos agregados. De los pacientes no se ve quiénes son (ni nombre ni email): solo
// cuántos hay y cuántos usan la app. Las profesionales se ven una por una en "Profesionales".
async function getUsageStats() {
  const now = Date.now();
  const d7 = new Date(now - 7 * DAY);
  const d30 = new Date(now - 30 * DAY);
  const since = new Date(now - (MONTHS * 31 + 1) * DAY);
  const pro = { role: "PROFESSIONAL" as const };
  // Las pacientes de ejemplo ("Sofía (DEMO)") no cuentan en las métricas.
  const pat = { role: "PATIENT" as const, NOT: { patientProfile: { isDemo: true } } };
  const real = { patient: { isDemo: false } };

  const [
    pros,
    pros7,
    pros30,
    prosUnverified,
    prosGoogle,
    patients,
    patients7,
    patients30,
    managed,
    activeLinks,
    entries,
    journal,
    cbt,
    assessments,
    appointments,
    signups,
    topics,
    tasksDone,
    feedbacks,
    payments,
    reminders,
    pushUsers,
    leads,
    leadsMailed,
    leadEmails,
    recentPros,
    communityPending,
    proAccounts,
  ] = await Promise.all([
    prisma.user.count({ where: pro }),
    prisma.user.count({ where: { ...pro, lastActiveAt: { gte: d7 } } }),
    prisma.user.count({ where: { ...pro, lastActiveAt: { gte: d30 } } }),
    prisma.professionalProfile.count({ where: { verifiedAt: null } }),
    prisma.user.count({ where: { ...pro, accounts: { some: { providerId: "google" } } } }),
    prisma.user.count({ where: pat }),
    prisma.user.count({ where: { ...pat, lastActiveAt: { gte: d7 } } }),
    prisma.user.count({ where: { ...pat, lastActiveAt: { gte: d30 } } }),
    prisma.patientProfile.count({ where: { userId: null } }),
    prisma.careLink.count({ where: { status: "ACTIVE", ...real } }),
    prisma.emotionEntry.count({ where: { createdAt: { gte: d30 }, ...real } }),
    prisma.journalEntry.count({ where: { createdAt: { gte: d30 }, ...real } }),
    prisma.cbtRecord.count({ where: { createdAt: { gte: d30 }, ...real } }),
    prisma.assessmentResponse.count({ where: { status: "COMPLETED", completedAt: { gte: d30 } } }),
    prisma.appointment.count({ where: { startsAt: { gte: d30, lte: new Date(now) } } }),
    prisma.user.findMany({
      where: {
        role: { in: ["PATIENT", "PROFESSIONAL"] },
        createdAt: { gte: since },
        NOT: { patientProfile: { isDemo: true } },
      },
      select: { role: true, createdAt: true },
    }),
    prisma.sessionTopic.count({ where: { createdAt: { gte: d30 }, ...real } }),
    prisma.task.count({ where: { completedAt: { gte: d30 }, ...real } }),
    prisma.feedback.count({ where: { createdAt: { gte: d30 }, ...real } }),
    prisma.payment.count({ where: { createdAt: { gte: d30 } } }),
    prisma.reminderSettings.count({ where: { enabled: true, user: pat } }),
    prisma.user.count({ where: { pushSubscriptions: { some: {} } } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { signupLinkSentAt: { not: null } } }),
    prisma.lead.findMany({ select: { email: true } }),
    prisma.professionalProfile.findMany({
      where: { user: pro },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, displayName: true, createdAt: true, verifiedAt: true },
    }),
    prisma.communityItem.count({ where: { status: "PENDING" } }),
    prisma.professionalProfile.findMany({
      where: { user: pro },
      select: {
        id: true,
        createdAt: true,
        freeForever: true,
        billingTest: true,
        accessBlocked: true,
        user: { select: { email: true, role: true } },
      },
    }),
  ]);

  // Planes: cuántas en cada estado y lo que entra por mes (promedio de los planes activos).
  const states = await billingStates(
    proAccounts.map((p) => ({ ...p, email: p.user.email, role: p.user.role })),
  );
  const plans = { free: 0, trial: 0, paying: 0, ending: 0, none: 0, off: 0, monthly: 0 };
  for (const p of proAccounts) {
    const v = planView(states.get(p.id)!, p);
    plans[v.tone]++;
    plans.monthly += v.monthly;
  }

  // Interesados que ya crearon su cuenta (mismo email).
  const leadSet = [...new Set(leadEmails.map((l) => l.email.trim().toLowerCase()))];
  const leadsWithAccount = leadSet.length
    ? await prisma.user.count({ where: { email: { in: leadSet }, role: { not: "PATIENT" } } })
    : 0;

  // Altas por mes (los últimos 6), separadas por rol.
  const months: { key: string; patients: number; pros: number }[] = [];
  const first = new Date();
  first.setUTCDate(15);
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() - i, 15));
    months.push({ key: d.toISOString().slice(0, 7), patients: 0, pros: 0 });
  }
  for (const s of signups) {
    const row = months.find((m) => m.key === monthKey(s.createdAt));
    if (row) row[s.role === "PATIENT" ? "patients" : "pros"]++;
  }

  return {
    pros: {
      total: pros,
      active7: pros7,
      active30: pros30,
      unverified: prosUnverified,
      google: prosGoogle,
    },
    patients: { total: patients, active7: patients7, active30: patients30, managed },
    activeLinks,
    usage: {
      entries,
      journal,
      cbt,
      topics,
      assessments,
      tasksDone,
      feedbacks,
      appointments,
      payments,
    },
    notifications: { reminders, pushUsers },
    leads: { total: leads, mailed: leadsMailed, withAccount: leadsWithAccount },
    recentPros,
    communityPending,
    plans,
    months,
  };
}

export default async function AdminHome() {
  await requireAdmin();
  const s = await getUsageStats();
  const thisMonth = s.months[s.months.length - 1];
  const todo = [
    s.pros.unverified > 0 && {
      href: "/admin/profesionales",
      icon: ShieldAlert,
      text:
        s.pros.unverified === 1
          ? "1 matrícula para verificar"
          : `${s.pros.unverified} matrículas para verificar`,
    },
    s.communityPending > 0 && {
      href: "/admin/comunidad",
      icon: Library,
      text:
        s.communityPending === 1
          ? "1 aporte de la Comunidad para revisar"
          : `${s.communityPending} aportes de la Comunidad para revisar`,
    },
    s.leads.total - s.leads.mailed > 0 && {
      href: "/admin/interesados",
      icon: Inbox,
      text:
        s.leads.total - s.leads.mailed === 1
          ? "1 interesada sin el mail de alta"
          : `${s.leads.total - s.leads.mailed} interesadas sin el mail de alta`,
    },
  ].filter(Boolean) as { href: string; icon: typeof ShieldAlert; text: string }[];

  const planRows = [
    { label: "Gratis (lanzamiento y VIP)", value: s.plans.free },
    { label: "En prueba", value: s.plans.trial },
    { label: "Pagan", value: s.plans.paying },
    { label: "Cancelaron (siguen hasta fin de mes)", value: s.plans.ending },
    { label: "Sin plan", value: s.plans.none },
    { label: "Sin acceso", value: s.plans.off },
  ].filter((r) => r.value > 0 || r.label === "Pagan" || r.label === "En prueba");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Resumen"
        description="Cómo viene Anclaje. Son números generales: desde acá no se ve ningún dato clínico ni quiénes son los pacientes."
      />

      {/* 1. Lo que espera algo de vos. */}
      <section aria-labelledby="todo-title" className="flex flex-col gap-2">
        <h2 id="todo-title" className="sr-only">
          Para hacer
        </h2>
        {todo.length === 0 ? (
          <p className="bg-primary-soft text-primary flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium">
            <CheckCircle2 className="size-4" aria-hidden /> Todo al día: no hay nada esperándote.
          </p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {todo.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="bg-accent text-accent-foreground flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium hover:brightness-95"
                >
                  <t.icon className="size-4 shrink-0" aria-hidden /> {t.text}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 2. Los cuatro números que importan. */}
      <section
        aria-label="Números principales"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Kpi
          icon={Stethoscope}
          label="Profesionales"
          value={s.pros.total}
          hint={thisMonth.pros > 0 ? `+${thisMonth.pros} este mes` : "Ninguna nueva este mes"}
        />
        <Kpi
          icon={Users}
          label="Pacientes con la app"
          value={s.patients.total}
          hint={
            thisMonth.patients > 0 ? `+${thisMonth.patients} este mes` : "Ninguno nuevo este mes"
          }
        />
        <Kpi
          icon={Activity}
          label="Usaron la app esta semana"
          value={s.pros.active7 + s.patients.active7}
          hint={`${s.pros.active7} profesionales · ${s.patients.active7} pacientes`}
        />
        <Kpi
          icon={Wallet}
          label="Ingreso por mes"
          value={formatPesos(s.plans.monthly)}
          hint={
            s.plans.paying === 0
              ? "Todavía nadie paga"
              : `${s.plans.paying} ${s.plans.paying === 1 ? "profesional paga" : "profesionales pagan"}`
          }
        />
      </section>

      {/* 3. Crecimiento y planes. */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Altas por mes" className="lg:col-span-2">
          <div className="grid gap-6 sm:grid-cols-2">
            <MiniBars
              title="Pacientes"
              data={s.months.map((m) => ({ key: m.key, value: m.patients }))}
            />
            <MiniBars
              title="Profesionales"
              data={s.months.map((m) => ({ key: m.key, value: m.pros }))}
            />
          </div>
        </Panel>
        <Panel title="Planes de las profesionales">
          <Bars rows={planRows} total={s.pros.total} />
        </Panel>
      </div>

      {/* 4. Cómo la usan. */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Actividad">
          <Bars
            rows={[
              {
                label: "Profesionales, esta semana",
                value: s.pros.active7,
                of: s.pros.total,
              },
              { label: "Profesionales, en 30 días", value: s.pros.active30, of: s.pros.total },
              {
                label: "Pacientes, esta semana",
                value: s.patients.active7,
                of: s.patients.total,
              },
              { label: "Pacientes, en 30 días", value: s.patients.active30, of: s.patients.total },
              {
                label: "Pacientes con recordatorio",
                value: s.notifications.reminders,
                of: s.patients.total,
              },
            ]}
          />
          <p className="text-muted-foreground mt-3 text-xs">
            {s.notifications.pushUsers} personas con avisos al celular · {s.patients.managed}{" "}
            pacientes cargados sin la app · {s.activeLinks} vínculos activos.
          </p>
        </Panel>

        <Panel title="Lo que más se usa" hint="Últimos 30 días">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {[
              ["Rueda de emociones", s.usage.entries],
              ["Diario", s.usage.journal],
              ["Autorregistros", s.usage.cbt],
              ["Temas para la sesión", s.usage.topics],
              ["Evaluaciones", s.usage.assessments],
              ["Tareas hechas", s.usage.tasksDone],
              ["Devoluciones", s.usage.feedbacks],
              ["Turnos", s.usage.appointments],
              ["Cobros cargados", s.usage.payments],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col">
                <dt className="text-muted-foreground text-xs">{label}</dt>
                <dd className="text-lg font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="Interesados de la landing">
          <Bars
            rows={[
              { label: "Dejaron sus datos", value: s.leads.total },
              { label: "Les mandaste el mail", value: s.leads.mailed },
              { label: "Ya crearon su cuenta", value: s.leads.withAccount },
            ]}
            total={s.leads.total}
          />
          {s.recentPros.length > 0 && (
            <div className="mt-5 flex flex-col gap-2">
              <h3 className="text-muted-foreground text-xs font-medium">Últimas en sumarse</h3>
              <ul className="flex flex-col gap-1.5 text-sm">
                {s.recentPros.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/profesionales/${p.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {p.displayName}
                    </Link>
                    <span className="text-muted-foreground flex shrink-0 items-center gap-2 text-xs">
                      {!p.verifiedAt && <Badge className="bg-accent">Sin verificar</Badge>}
                      {shortDate.format(p.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Panel>
      </div>

      <p className="text-muted-foreground text-xs">
        “Usó la app” es haberla abierto al menos una vez en ese período. No se registra qué miró ni
        por cuánto tiempo. Las pacientes de ejemplo no cuentan.
      </p>
    </div>
  );
}

const shortDate = new Intl.DateTimeFormat("es-AR", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
});
const shortMonth = new Intl.DateTimeFormat("es-AR", { month: "short", timeZone: "UTC" });

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  hint: string;
}) {
  return (
    <div className="bg-card flex flex-col gap-1 rounded-2xl border p-4">
      <p className="text-muted-foreground flex items-center gap-2 text-sm">
        <Icon className="size-4" aria-hidden /> {label}
      </p>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-muted-foreground text-xs">{hint}</p>
    </div>
  );
}

function Panel({
  title,
  hint,
  className,
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("bg-card flex flex-col gap-4 rounded-2xl border p-5", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{title}</h2>
        {hint && <span className="text-muted-foreground text-xs">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

/** Filas con una barra fina proporcional (del total de la fila o de uno común). */
function Bars({
  rows,
  total,
}: {
  rows: { label: string; value: number; of?: number }[];
  total?: number;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const base = r.of ?? total ?? 0;
        const pct = base > 0 ? Math.min(100, (r.value / base) * 100) : 0;
        return (
          <li key={r.label} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>{r.label}</span>
              <span className="tabular-nums">
                <span className="font-semibold">{r.value}</span>
                {r.of !== undefined && (
                  <span className="text-muted-foreground text-xs"> de {r.of}</span>
                )}
              </span>
            </div>
            <div className="bg-muted h-1.5 overflow-hidden rounded-full" aria-hidden>
              <div className="bg-primary h-full rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Barras verticales chicas por mes, de una sola serie (el título la nombra). */
function MiniBars({ title, data }: { title: string; data: { key: string; value: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const month = (key: string) => shortMonth.format(new Date(`${key}-15T12:00:00Z`));
  const full = (key: string) => monthName.format(new Date(`${key}-15T12:00:00Z`));
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="text-muted-foreground text-sm">{title}</figcaption>
      <div className="flex h-36 items-end gap-2" aria-hidden>
        {data.map((d, i) => (
          <div
            key={d.key}
            className="group relative flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <span className="text-muted-foreground text-xs tabular-nums">{d.value || ""}</span>
            <div
              className={cn(
                "bg-primary w-full max-w-10 rounded-t transition-opacity",
                i === data.length - 1 ? "opacity-100" : "opacity-50 group-hover:opacity-80",
              )}
              style={{ height: `${Math.max(d.value ? 4 : 1, (d.value / max) * 100)}%` }}
            />
            <span className="bg-card text-card-foreground pointer-events-none absolute -top-2 z-10 hidden rounded-lg border px-2 py-1 text-xs whitespace-nowrap shadow-md group-hover:block first-letter:uppercase">
              {full(d.key)}: {d.value}
            </span>
          </div>
        ))}
      </div>
      <div className="flex gap-2" aria-hidden>
        {data.map((d) => (
          <span
            key={d.key}
            className="text-muted-foreground flex-1 text-center text-xs first-letter:uppercase"
          >
            {month(d.key).replace(".", "")}
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{title} nuevos por mes</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{full(d.key)}</th>
              <td>{d.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
