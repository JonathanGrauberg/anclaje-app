import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { audit } from "@/lib/audit";
import { decrypt, decryptOptional } from "@/lib/crypto";
import { formatRelative } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireProfessional } from "@/lib/session";
import { RequestActions } from "./request-actions";

export const metadata: Metadata = { title: "Solicitudes" };

const MODALITY = { IN_PERSON: "Presencial", ONLINE: "Online" } as const;
const STATUS = {
  NEW: { label: "Nueva", className: "bg-sun-soft text-foreground" },
  CONTACTED: { label: "Contactada", className: "bg-primary-soft text-primary" },
  ACCEPTED: { label: "Es paciente", className: "bg-primary text-primary-foreground" },
} as const;

/** Pedidos de turno que llegaron desde el perfil público (con el mail ya confirmado). */
export default async function RequestsPage() {
  const { user, professional } = await requireProfessional();
  const [rows, profile] = await Promise.all([
    prisma.appointmentRequest.findMany({
      where: { professionalId: professional.id, status: { not: "UNCONFIRMED" } },
      orderBy: [{ confirmedAt: "desc" }],
      take: 100,
    }),
    prisma.professionalProfile.findUniqueOrThrow({
      where: { id: professional.id },
      select: { publicProfile: true, acceptsRequests: true },
    }),
  ]);
  if (rows.length > 0)
    await audit({
      actorId: user.id,
      action: "view",
      entityType: "AppointmentRequest",
      entityId: professional.id,
      meta: { count: rows.length },
    });
  const order = { NEW: 0, CONTACTED: 1, ACCEPTED: 2, UNCONFIRMED: 3 };
  const requests = rows
    .map((r) => ({
      id: r.id,
      status: r.status as keyof typeof STATUS,
      name: decrypt(r.nameEnc),
      email: decrypt(r.emailEnc),
      phone: decryptOptional(r.phoneEnc),
      message: decryptOptional(r.messageEnc),
      modality: r.modality,
      patientId: r.patientId,
      at: r.confirmedAt ?? r.createdAt,
    }))
    .sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        tone="sun"
        title="Solicitudes"
        description="Personas que te pidieron turno desde tu perfil público. Confirmaron su mail; vos decidís si las contactás."
      />
      {!profile.publicProfile || !profile.acceptsRequests ? (
        <p className="bg-muted/60 rounded-2xl p-4 text-sm">
          {profile.publicProfile
            ? "Tenés apagado el botón “Pedir turno”."
            : "Todavía no activaste tu perfil público."}{" "}
          <Link href="/pro/perfil-publico" className="text-primary font-medium underline">
            Configurarlo
          </Link>
        </p>
      ) : null}
      {requests.length === 0 ? (
        <EmptyState icon={<Inbox />} title="Todavía no llegó ninguna">
          Compartí el link de tu perfil en Instagram o WhatsApp: cuando alguien te pida turno, te
          avisamos por mail y aparece acá.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {requests.map((r) => (
            <li key={r.id} className="bg-card flex flex-col gap-3 rounded-2xl border p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold">{r.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {formatRelative(r.at)}
                    {r.modality && ` · Prefiere ${MODALITY[r.modality].toLowerCase()}`}
                  </p>
                </div>
                <Badge className={STATUS[r.status].className}>{STATUS[r.status].label}</Badge>
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
                <a
                  className="text-primary underline-offset-4 hover:underline"
                  href={`mailto:${r.email}`}
                >
                  {r.email}
                </a>
                {r.phone && (
                  <a
                    className="text-primary underline-offset-4 hover:underline"
                    href={`tel:${r.phone.replace(/[^\d+]/g, "")}`}
                  >
                    {r.phone}
                  </a>
                )}
              </div>
              {r.message && (
                <p className="bg-muted/50 rounded-xl p-3 text-sm whitespace-pre-wrap">
                  {r.message}
                </p>
              )}
              <RequestActions id={r.id} status={r.status} patientId={r.patientId} name={r.name} />
            </li>
          ))}
        </ul>
      )}
      <p className="text-muted-foreground text-xs">
        Las solicitudes que no confirman su mail en 3 días se borran solas y nunca te llegan.
      </p>
    </div>
  );
}
