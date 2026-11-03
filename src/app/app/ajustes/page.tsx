import type { Metadata } from "next";
import { NOTIFICATIONS_ENABLED } from "@/lib/constants";
import Link from "next/link";
import { AppointmentEmailToggle } from "@/components/appointment-email-toggle";
import { ChangePasswordForm } from "@/components/change-password-form";
import { PageHeader } from "@/components/ui/misc";
import { formatDate } from "@/lib/dates";
import { prisma } from "@/lib/db";
import { requirePatient } from "@/lib/session";
import { DataSection } from "./data-section";
import { RemindersForm } from "./reminders-form";
import { CodeEntry, SharingDefaultsForm, UnlinkButton } from "./settings-forms";

export const metadata: Metadata = { title: "Ajustes" };

export default async function SettingsPage({ searchParams }: PageProps<"/app/ajustes">) {
  const { user, patient } = await requirePatient();
  const justLinked = (await searchParams).vinculado === "1";
  const shared = { patientId: patient.id, visibility: "SHARED" as const };

  const [links, sharedCounts, reminder] = await Promise.all([
    prisma.careLink.findMany({
      where: { patientId: patient.id, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
      include: { professional: { select: { displayName: true } } },
    }),
    justLinked
      ? Promise.all([
          prisma.emotionEntry.count({ where: shared }),
          prisma.journalEntry.count({ where: { ...shared, isDraft: false } }),
          prisma.cbtRecord.count({ where: { ...shared, status: "COMPLETE" } }),
        ])
      : null,
    prisma.reminderSettings.findUnique({ where: { userId: user.id } }),
  ]);
  const defaults = patient.sharingDefaults ?? {
    journal: "PRIVATE",
    emotions: "SHARED",
    cbt: "SHARED",
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title="Ajustes" back={{ href: "/app", label: "Inicio" }} />

      {justLinked && sharedCounts && (
        <div role="status" className="bg-primary-soft text-primary rounded-2xl p-4">
          <p className="font-medium">¡Listo, ya estás vinculado!</p>
          <p className="mt-1 text-sm">
            Desde ahora ve lo que tenías marcado como compartido: {sharedCounts[0]} de la rueda,{" "}
            {sharedCounts[1]} del diario y {sharedCounts[2]} autorregistros. Si querés revisarlo,
            entrá a{" "}
            <Link href="/app/rueda/historial" className="underline">
              lo que registré
            </Link>
            ,{" "}
            <Link href="/app/diario" className="underline">
              tu diario
            </Link>{" "}
            o{" "}
            <Link href="/app/autorregistro" className="underline">
              tus autorregistros
            </Link>
            .
          </p>
        </div>
      )}

      <section aria-labelledby="pro-title" className="flex flex-col gap-3">
        <h2 id="pro-title" className="text-lg font-semibold">
          Mi psicóloga
        </h2>
        {links.length === 0 ? (
          <p className="text-muted-foreground">
            Todavía no te vinculaste con nadie. Si tu psicóloga te pasó un código, ponelo acá.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {links.map((l) => (
              <li
                key={l.id}
                className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
              >
                <div>
                  <p className="font-medium">{l.professional.displayName}</p>
                  <p className="text-muted-foreground text-sm">
                    Vinculados desde el {formatDate(l.createdAt)} · consentimiento aceptado el{" "}
                    {formatDate(l.consentAcceptedAt ?? l.createdAt)}
                  </p>
                </div>
                <UnlinkButton linkId={l.id} name={l.professional.displayName} />
              </li>
            ))}
          </ul>
        )}
        <CodeEntry />
      </section>

      <section aria-labelledby="share-title" className="flex flex-col gap-3">
        <div>
          <h2 id="share-title" className="text-lg font-semibold">
            Qué se comparte por defecto
          </h2>
          <p className="text-muted-foreground text-sm">
            Es solo el punto de partida: en cada registro podés cambiarlo.
          </p>
        </div>
        <SharingDefaultsForm
          initial={{ journal: defaults.journal, emotions: defaults.emotions, cbt: defaults.cbt }}
        />
      </section>

      <section aria-labelledby="appt-title" className="flex flex-col gap-3">
        <div>
          <h2 id="appt-title" className="text-lg font-semibold">
            Recordatorio de turnos
          </h2>
          <p className="text-muted-foreground text-sm">
            El día anterior te llega un mail a <strong>{user.email}</strong> con la hora y el lugar
            de tu turno.
          </p>
        </div>
        <AppointmentEmailToggle
          side="patient"
          initial={patient.appointmentEmails}
          label="Recibir el recordatorio por mail"
        />
      </section>

      {NOTIFICATIONS_ENABLED && (
        <section aria-labelledby="rem-title" className="flex flex-col gap-3">
          <div>
            <h2 id="rem-title" className="text-lg font-semibold">
              Avisos
            </h2>
            <p className="text-muted-foreground text-sm">
              Si te sirve un recordatorio para registrar cómo estás. Sin rachas ni reproches.
            </p>
          </div>
          <RemindersForm
            vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null}
            initial={{
              enabled: reminder?.enabled ?? false,
              time: reminder?.time ?? "20:00",
              days: reminder?.days ?? [0, 1, 2, 3, 4, 5, 6],
            }}
          />
        </section>
      )}

      <section aria-labelledby="pw-title" className="flex flex-col gap-3">
        <h2 id="pw-title" className="text-lg font-semibold">
          Contraseña
        </h2>
        <ChangePasswordForm />
      </section>

      <section aria-labelledby="data-title" className="flex flex-col gap-3">
        <h2 id="data-title" className="text-lg font-semibold">
          Mis datos
        </h2>
        <DataSection />
      </section>
    </div>
  );
}
