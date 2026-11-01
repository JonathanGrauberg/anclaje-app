import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { CreateProfessionalForm, ResetPasswordButton } from "./professionals-client";

export const metadata: Metadata = { title: "Profesionales" };

export default async function AdminProfessionalsPage() {
  await requireAdmin();
  const professionals = await prisma.professionalProfile.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      displayName: true,
      licenseNumber: true,
      createdAt: true,
      user: { select: { id: true, email: true, role: true } },
      _count: { select: { links: { where: { status: "ACTIVE" } } } },
    },
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Profesionales"
        description="El registro público solo crea pacientes. Las cuentas profesionales se dan de alta acá."
      />

      <section aria-labelledby="new-title" className="flex max-w-xl flex-col gap-3">
        <h2 id="new-title" className="text-lg font-semibold">
          Nueva profesional
        </h2>
        <CreateProfessionalForm />
      </section>

      <section aria-labelledby="list-title" className="flex flex-col gap-3">
        <h2 id="list-title" className="text-lg font-semibold">
          Cuentas ({professionals.length})
        </h2>
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-left">
                <tr className="border-b">
                  <th scope="col" className="px-4 py-3 font-medium">
                    Nombre
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Matrícula
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Pacientes activos
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Alta
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {professionals.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {p.displayName}
                      {p.user.role === "ADMIN" && (
                        <span className="text-muted-foreground ml-2 text-xs">(admin)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{p.user.email}</td>
                    <td className="px-4 py-3">{p.licenseNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p._count.links}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      {p.user.role === "PROFESSIONAL" && (
                        <ResetPasswordButton userId={p.user.id} name={p.displayName} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <p className="text-muted-foreground text-sm">
          Para dar de baja una cuenta profesional, escribile al equipo técnico: hay que decidir qué
          pasa con sus pacientes vinculados antes de borrarla.
        </p>
      </section>
    </div>
  );
}
