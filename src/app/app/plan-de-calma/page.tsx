import { PageHeader } from "@/components/ui/misc";
import { Footprints, MessageCircle, Phone, Sparkle } from "lucide-react";
import type { Metadata } from "next";
import { CrisisLineList } from "@/components/patient/help-button";
import { getCrisisLines } from "@/lib/queries/common";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/session";
import { telHref } from "@/lib/utils";
import { BreathingExercise, Grounding } from "./calm-tools";
import { AddOwnCard, DeleteOwnCard } from "./own-card-tools";

export const metadata: Metadata = { title: "Mi plan de calma" };

function whatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

export default async function CalmPlanPage() {
  const { patient } = await requirePatient();
  const [plan, lines] = await Promise.all([
    prisma.copingPlan.findUnique({
      where: { patientId: patient.id },
      include: { cards: { orderBy: { sortOrder: "asc" } } },
    }),
    getCrisisLines(),
  ]);
  const cards = plan?.cards ?? [];
  const breathing = cards.find((c) => c.technique === "BREATHING");
  const grounding = cards.find((c) => c.technique === "GROUNDING");
  const phrases = cards.filter((c) => c.type === "PHRASE");
  const activities = cards.filter(
    (c) => c.type === "ACTIVITY" || (c.type === "TECHNIQUE" && c.technique === "OTHER"),
  );
  const contacts = cards.filter((c) => c.type === "CONTACT" && c.phone);

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        tone="night"
        back={{ href: "/app", label: "Inicio" }}
        title="Mi plan de calma"
        description="Respirá. No tenés que hacer todo: elegí una sola cosa de acá."
      />

      <BreathingExercise title={breathing?.title} hint={breathing?.body} />

      {phrases.length > 0 && (
        <section aria-labelledby="phrases-title" className="flex flex-col gap-3">
          <h2 id="phrases-title" className="flex items-center gap-2 text-lg font-semibold">
            <Sparkle className="text-primary size-5" aria-hidden /> Frases que me sirven
          </h2>
          <ul className="flex flex-col gap-2">
            {phrases.map((c) => (
              <li
                key={c.id}
                className="bg-accent text-accent-foreground rounded-3xl p-5 text-lg font-medium"
              >
                <div className="flex items-start justify-between gap-2">
                  <span>“{c.title}”</span>
                  {c.author === "PATIENT" && <DeleteOwnCard id={c.id} title={c.title} />}
                </div>
                {c.body && <span className="mt-1 block text-sm font-normal">{c.body}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <Grounding title={grounding?.title} />

      {activities.length > 0 && (
        <section aria-labelledby="activities-title" className="flex flex-col gap-3">
          <h2 id="activities-title" className="flex items-center gap-2 text-lg font-semibold">
            <Footprints className="text-primary size-5" aria-hidden /> Cosas que puedo hacer
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {activities.map((c) => (
              <li key={c.id} className="bg-card rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{c.title}</p>
                  {c.author === "PATIENT" && <DeleteOwnCard id={c.id} title={c.title} />}
                </div>
                {c.body && <p className="text-muted-foreground mt-1 text-sm">{c.body}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {contacts.length > 0 && (
        <section aria-labelledby="contacts-title" className="flex flex-col gap-3">
          <h2 id="contacts-title" className="text-lg font-semibold">
            Personas a quienes puedo llamar
          </h2>
          <ul className="flex flex-col gap-2">
            {contacts.map((c) => (
              <li
                key={c.id}
                className="bg-card flex items-center justify-between gap-3 rounded-2xl border p-4"
              >
                <div>
                  <p className="font-medium">{c.title}</p>
                  {c.body && <p className="text-muted-foreground text-sm">{c.body}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {c.author === "PATIENT" && <DeleteOwnCard id={c.id} title={c.title} />}
                  <a
                    href={telHref(c.phone!)}
                    className="bg-primary-soft text-primary flex size-11 items-center justify-center rounded-full"
                    aria-label={`Llamar a ${c.title}`}
                  >
                    <Phone className="size-5" />
                  </a>
                  {c.whatsapp && (
                    <a
                      href={whatsappHref(c.phone!)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-primary-soft text-primary flex size-11 items-center justify-center rounded-full"
                      aria-label={`Escribirle por WhatsApp a ${c.title}`}
                    >
                      <MessageCircle className="size-5" />
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {cards.length === 0 && (
        <p className="text-muted-foreground rounded-2xl border border-dashed p-5 text-center">
          Tu psicóloga va a armar este plan con vos, con lo que a vos te sirve. Mientras tanto, la
          respiración y el grounding siempre están acá.
        </p>
      )}

      <AddOwnCard />

      <section aria-labelledby="lines-title" className="flex flex-col gap-3">
        <h2 id="lines-title" className="text-lg font-semibold">
          Si sentís que no podés más
        </h2>
        <p className="text-muted-foreground">
          Llamá. Es gratis y te atienden personas, a cualquier hora.
        </p>
        <CrisisLineList lines={lines} />
      </section>
    </div>
  );
}
