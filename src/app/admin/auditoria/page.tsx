import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/misc";
import type { Prisma } from "@/generated/prisma/client";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { AUDIT_PAGE_SIZE, auditFilterSchema } from "@/lib/validation/admin";

export const metadata: Metadata = { title: "Auditoría" };

const ACTIONS = {
  view: "Vio",
  create: "Creó",
  update: "Modificó",
  delete: "Borró",
  export: "Exportó",
} as const;

const ROLES = { PATIENT: "Paciente", PROFESSIONAL: "Profesional", ADMIN: "Admin" } as const;

// Quién hizo qué y cuándo. Nunca muestra contenido: solo tipo de dato e ids. De los pacientes se
// muestra un id corto, no el nombre (ver docs/DECISIONES.md).
const shortId = (id: string | null) => (id ? `…${id.slice(-6)}` : "—");

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/auditoria">) {
  await requireAdmin();
  const sp = await searchParams;
  const filter = auditFilterSchema.parse({
    page: sp.pagina,
    action: sp.accion || undefined,
    entity: sp.tipo || undefined,
  });
  const where: Prisma.AuditLogWhereInput = {
    ...(filter.action && { action: filter.action }),
    ...(filter.entity && { entityType: filter.entity }),
  };
  const [total, rows, types] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (filter.page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      include: { actor: { select: { id: true, name: true, role: true } } },
    }),
    prisma.auditLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const href = (page: number) => {
    const q = new URLSearchParams();
    if (filter.action) q.set("accion", filter.action);
    if (filter.entity) q.set("tipo", filter.entity);
    if (page > 1) q.set("pagina", String(page));
    const s = q.toString();
    return s ? `/admin/auditoria?${s}` : "/admin/auditoria";
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Auditoría"
        description="Registro de accesos y cambios sobre datos clínicos y de administración. No muestra contenido."
      />

      <form method="get" className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-action">Acción</Label>
          <select
            id="f-action"
            name="accion"
            defaultValue={filter.action ?? ""}
            className="border-input bg-card h-11 rounded-xl border px-3 text-sm"
          >
            <option value="">Todas</option>
            {Object.entries(ACTIONS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="f-type">Tipo de dato</Label>
          <select
            id="f-type"
            name="tipo"
            defaultValue={filter.entity ?? ""}
            className="border-input bg-card h-11 rounded-xl border px-3 text-sm"
          >
            <option value="">Todos</option>
            {types.map((t) => (
              <option key={t.entityType} value={t.entityType}>
                {t.entityType}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="soft">
          Filtrar
        </Button>
      </form>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Registros de auditoría, página {filter.page} de {pages}
            </caption>
            <thead className="text-muted-foreground text-left">
              <tr className="border-b">
                <th scope="col" className="px-4 py-3 font-medium">
                  Fecha
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Quién
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Acción
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Dato
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Paciente
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-muted-foreground px-4 py-6 text-center">
                    No hay registros con esos filtros.
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-4 py-2.5 whitespace-nowrap tabular-nums">
                    {formatDateTime(r.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.actor.role === "PATIENT" ? (
                      <span className="font-mono text-xs">Paciente {shortId(r.actor.id)}</span>
                    ) : (
                      <>
                        {r.actor.name}{" "}
                        <span className="text-muted-foreground text-xs">
                          ({ROLES[r.actor.role]})
                        </span>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {ACTIONS[r.action as keyof typeof ACTIONS] ?? r.action}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.entityType}{" "}
                    <span className="text-muted-foreground font-mono text-xs">
                      {shortId(r.entityId)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs">{shortId(r.patientId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <nav aria-label="Páginas" className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {total} registros · página {filter.page} de {pages}
        </span>
        <div className="flex gap-2">
          {filter.page > 1 && (
            <Button asChild variant="outline" size="sm">
              <Link href={href(filter.page - 1)}>Anterior</Link>
            </Button>
          )}
          {filter.page < pages && (
            <Button asChild variant="outline" size="sm">
              <Link href={href(filter.page + 1)}>Siguiente</Link>
            </Button>
          )}
        </div>
      </nav>
    </div>
  );
}
