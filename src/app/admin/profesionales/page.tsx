import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { planView } from "@/lib/admin-plan";
import { formatRelative } from "@/lib/dates";
import { jurisdictionName } from "@/lib/licenses";
import { billingStates } from "@/lib/mercadopago";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ConvertPatientForm, CreateProfessionalForm } from "./professionals-client";
import { ProfessionalsTable, type ProRow } from "./professionals-table";

export const metadata: Metadata = { title: "Profesionales" };

const joinedFmt = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "numeric",
  month: "short",
  year: "2-digit",
});

export default async function AdminProfessionalsPage() {
  await requireAdmin();
  const professionals = await prisma.professionalProfile.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      displayName: true,
      licenseNumber: true,
      licenseJurisdiction: true,
      verifiedAt: true,
      freeForever: true,
      billingTest: true,
      accessBlocked: true,
      createdAt: true,
      user: {
        select: {
          email: true,
          role: true,
          lastActiveAt: true,
          accounts: { where: { providerId: "google" }, select: { id: true } },
        },
      },
      _count: {
        select: {
          links: { where: { status: "ACTIVE", patient: { userId: { not: null } } } },
          managedPatients: true,
        },
      },
    },
  });
  const states = await billingStates(
    professionals.map((p) => ({ ...p, email: p.user.email, role: p.user.role })),
  );
  const rows: ProRow[] = professionals.map((p) => {
    const { tone, label, detail } = planView(states.get(p.id)!, p);
    return {
      id: p.id,
      name: p.displayName,
      email: p.user.email,
      google: p.user.accounts.length > 0,
      isAdmin: p.user.role === "ADMIN",
      license: p.licenseNumber,
      jurisdiction: p.licenseJurisdiction ? jurisdictionName(p.licenseJurisdiction) : null,
      verified: Boolean(p.verifiedAt),
      withApp: p._count.links,
      withoutApp: p._count.managedPatients,
      lastActive: p.user.lastActiveAt ? formatRelative(p.user.lastActiveAt) : "Nunca",
      lastActiveTs: p.user.lastActiveAt?.getTime() ?? 0,
      joined: joinedFmt.format(p.createdAt),
      joinedTs: p.createdAt.getTime(),
      plan: { tone, label, detail },
    };
  });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Profesionales"
        description="Se registran solas en Crear cuenta y quedan sin verificar hasta que revisás la matrícula. Entrá a cada una para ver su uso o cambiarle el acceso."
      />

      <section aria-labelledby="list-title" className="flex flex-col gap-3">
        <h2 id="list-title" className="sr-only">
          Cuentas
        </h2>
        <ProfessionalsTable rows={rows} />
        <p className="text-muted-foreground text-xs">
          Para dar de baja una cuenta profesional, escribile al equipo técnico: hay que decidir qué
          pasa con sus pacientes vinculados antes de borrarla.
        </p>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 id="new-title" className="text-lg font-semibold">
              Nueva profesional
            </h2>
            <CreateProfessionalForm />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex flex-col gap-3">
            <h2 id="convert-title" className="text-lg font-semibold">
              Se registró como paciente por error
            </h2>
            <p className="text-muted-foreground text-sm">
              Escribí el email exacto con el que se registró. Si la cuenta todavía no tiene
              registros ni vínculos, pasa a profesional: entra con la misma contraseña y carga su
              matrícula. No se listan pacientes: solo se busca ese email.
            </p>
            <ConvertPatientForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
