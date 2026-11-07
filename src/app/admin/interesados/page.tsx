import { Inbox } from "lucide-react";
import type { Metadata } from "next";
import { Card, CardContent } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { formatDateTime } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { ContactedToggle } from "./contacted-toggle";
import { SignupLink } from "./signup-link";

export const metadata: Metadata = { title: "Interesados" };

/** Profesionales que dejaron sus datos en la página de inicio. */
export default async function LeadsPage() {
  await requireAdmin();
  const leads = await prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  const pending = leads.filter((l) => !l.contactedAt).length;
  const accounts = await prisma.user.findMany({
    where: { email: { in: leads.map((l) => l.email.toLowerCase()) } },
    select: { email: true },
  });
  const withAccount = new Set(accounts.map((u) => u.email));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Interesados"
        description={`Profesionales que pidieron probar Anclaje desde la página de inicio. ${pending} sin contactar.`}
      />
      {leads.length === 0 ? (
        <EmptyState icon={<Inbox />} title="Todavía no se anotó nadie">
          Cuando alguien complete el formulario de la página de inicio, aparece acá y te llega un
          mail.
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-3">
          {leads.map((l) => (
            <li key={l.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {l.name}
                      {!l.contactedAt && <Badge>Nuevo</Badge>}
                      {withAccount.has(l.email.toLowerCase()) && <Badge>Ya tiene cuenta</Badge>}
                    </p>
                    <p className="text-sm break-all">
                      <a href={`mailto:${l.email}`} className="text-primary hover:underline">
                        {l.email}
                      </a>
                      {l.phone && (
                        <>
                          {" · "}
                          <a
                            href={`https://wa.me/${l.phone.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {l.phone}
                          </a>
                        </>
                      )}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {[l.province, formatDateTime(l.createdAt)].filter(Boolean).join(" · ")}
                    </p>
                    {l.message && <p className="mt-1 text-sm whitespace-pre-line">{l.message}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                    {!withAccount.has(l.email.toLowerCase()) && (
                      <SignupLink
                        leadId={l.id}
                        name={l.name}
                        sentAt={l.signupLinkSentAt ? formatDateTime(l.signupLinkSentAt) : null}
                      />
                    )}
                    <ContactedToggle id={l.id} contacted={!!l.contactedAt} />
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
