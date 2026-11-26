"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { VerifyButton } from "./professionals-client";

import type { PlanTone, PlanView } from "@/lib/admin-plan";

export type ProRow = {
  id: string;
  name: string;
  email: string;
  google: boolean;
  isAdmin: boolean;
  license: string | null;
  jurisdiction: string | null;
  verified: boolean;
  withApp: number;
  withoutApp: number;
  lastActive: string;
  lastActiveTs: number;
  joined: string;
  joinedTs: number;
  plan: Omit<PlanView, "monthly">;
};

const TONE: Record<PlanTone, string> = {
  free: "bg-primary-soft text-primary",
  trial: "bg-sky-soft text-foreground",
  paying: "bg-primary text-primary-foreground",
  ending: "bg-sun-soft text-foreground",
  none: "bg-danger-soft text-danger",
  off: "bg-muted text-muted-foreground",
};

const FILTERS = [
  { id: "all", label: "Todas", test: () => true },
  { id: "unverified", label: "Sin verificar", test: (r: ProRow) => !r.verified },
  { id: "free", label: "Gratis", test: (r: ProRow) => r.plan.tone === "free" },
  { id: "trial", label: "En prueba", test: (r: ProRow) => r.plan.tone === "trial" },
  {
    id: "paying",
    label: "Pagan",
    test: (r: ProRow) => r.plan.tone === "paying" || r.plan.tone === "ending",
  },
  {
    id: "none",
    label: "Sin plan",
    test: (r: ProRow) => r.plan.tone === "none" || r.plan.tone === "off",
  },
] as const;

const SORTS = {
  joined: { label: "Más nuevas", by: (a: ProRow, b: ProRow) => b.joinedTs - a.joinedTs },
  active: {
    label: "Usaron la app hace poco",
    by: (a: ProRow, b: ProRow) => b.lastActiveTs - a.lastActiveTs,
  },
  patients: {
    label: "Más pacientes",
    by: (a: ProRow, b: ProRow) => b.withApp + b.withoutApp - (a.withApp + a.withoutApp),
  },
  name: { label: "Nombre", by: (a: ProRow, b: ProRow) => a.name.localeCompare(b.name, "es") },
} as const;

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

/** Lista de profesionales: buscar, filtrar por estado y ordenar, todo en el navegador. */
export function ProfessionalsTable({ rows }: { rows: ProRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const [sort, setSort] = useState<keyof typeof SORTS>("joined");

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, rows.filter(f.test).length])),
    [rows],
  );
  const visible = useMemo(() => {
    const f = FILTERS.find((x) => x.id === filter)!;
    const needle = norm(q.trim());
    return rows
      .filter(f.test)
      .filter(
        (r) =>
          !needle ||
          norm(`${r.name} ${r.email} ${r.license ?? ""} ${r.jurisdiction ?? ""}`).includes(needle),
      )
      .sort(SORTS[sort].by);
  }, [rows, filter, q, sort]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                filter === f.id
                  ? "bg-foreground text-background border-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "tabular-nums",
                  filter === f.id ? "opacity-80" : "text-muted-foreground",
                )}
              >
                {counts[f.id]}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="bg-card border-input focus-within:ring-ring flex min-w-0 flex-1 items-center gap-2 rounded-full border px-3 py-1.5 focus-within:ring-2 xl:w-64 xl:flex-none">
            <Search className="text-muted-foreground size-4 shrink-0" aria-hidden />
            <span className="sr-only">Buscar profesional</span>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, email o matrícula"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="sr-only">Ordenar</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as keyof typeof SORTS)}
              className="border-input bg-card rounded-full border px-3 py-1.5 text-sm"
            >
              {Object.entries(SORTS).map(([id, s]) => (
                <option key={id} value={id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground bg-card rounded-2xl border p-6 text-center text-sm">
          No hay profesionales con ese filtro.
        </p>
      ) : (
        <>
          {/* Escritorio: tabla compacta, sin scroll horizontal. */}
          <div className="bg-card hidden overflow-hidden rounded-2xl border md:block">
            <table className="w-full table-fixed text-sm">
              <thead className="text-muted-foreground bg-muted/40 text-left text-xs">
                <tr>
                  <th scope="col" className="w-[34%] px-4 py-2.5 font-medium">
                    Profesional
                  </th>
                  <th scope="col" className="w-[14%] px-3 py-2.5 font-medium">
                    Matrícula
                  </th>
                  <th scope="col" className="w-[12%] px-3 py-2.5 font-medium">
                    Pacientes
                  </th>
                  <th scope="col" className="w-[18%] px-3 py-2.5 font-medium">
                    Plan
                  </th>
                  <th scope="col" className="w-[13%] px-3 py-2.5 font-medium">
                    Usó la app
                  </th>
                  <th scope="col" className="w-[9%] px-3 py-2.5 font-medium">
                    Alta
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visible.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40 align-top">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/profesionales/${r.id}`}
                        className="text-foreground block truncate font-medium hover:underline"
                      >
                        {r.name}
                        {r.isAdmin && (
                          <span className="text-muted-foreground font-normal"> (admin)</span>
                        )}
                      </Link>
                      <span
                        className="text-muted-foreground block truncate text-xs"
                        title={r.email}
                      >
                        {r.email}
                        {r.google && " · Google"}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="block truncate tabular-nums">{r.license ?? "—"}</span>
                      {r.verified ? (
                        <span className="text-muted-foreground block truncate text-xs">
                          {r.jurisdiction}
                        </span>
                      ) : (
                        <div className="mt-1">
                          <VerifyButton professionalId={r.id} name={r.name} compact />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Patients withApp={r.withApp} withoutApp={r.withoutApp} />
                    </td>
                    <td className="px-3 py-3">
                      <PlanBadge plan={r.plan} />
                    </td>
                    <td className="text-muted-foreground px-3 py-3 text-xs">{r.lastActive}</td>
                    <td className="text-muted-foreground px-3 py-3 text-xs">{r.joined}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Celular: tarjetas. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {visible.map((r) => (
              <li key={r.id} className="bg-card flex flex-col gap-2 rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/admin/profesionales/${r.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {r.name}
                    </Link>
                    <span className="text-muted-foreground block truncate text-xs">{r.email}</span>
                  </div>
                  <PlanBadge plan={r.plan} />
                </div>
                <div className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  <span>
                    Mat. {r.license ?? "—"}
                    {r.jurisdiction && ` · ${r.jurisdiction}`}
                  </span>
                  <span>
                    {r.withApp} con app · {r.withoutApp} sin app
                  </span>
                  <span>Usó la app: {r.lastActive}</span>
                </div>
                {!r.verified && (
                  <div className="self-start">
                    <VerifyButton professionalId={r.id} name={r.name} compact />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Patients({ withApp, withoutApp }: { withApp: number; withoutApp: number }) {
  return (
    <span className="flex flex-col text-xs">
      <span>
        <span className="text-foreground text-sm font-medium tabular-nums">{withApp}</span>{" "}
        <span className="text-muted-foreground">con app</span>
      </span>
      <span className="text-muted-foreground">
        <span className="tabular-nums">{withoutApp}</span> sin app
      </span>
    </span>
  );
}

function PlanBadge({ plan }: { plan: ProRow["plan"] }) {
  return (
    <span className="flex flex-col items-start gap-0.5">
      <Badge className={cn("whitespace-nowrap", TONE[plan.tone])}>{plan.label}</Badge>
      {plan.detail && <span className="text-muted-foreground text-xs">{plan.detail}</span>}
    </span>
  );
}
