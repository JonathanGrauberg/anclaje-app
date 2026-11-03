import type { Metadata } from "next";
import { AppointmentEmailToggle } from "@/components/appointment-email-toggle";
import { ChangePasswordForm } from "@/components/change-password-form";
import { NotificationPrefs, type NotificationPrefItem } from "@/components/notification-prefs";
import { PushDevice } from "@/components/push-device";
import { PageHeader } from "@/components/ui/misc";
import { NOTIFICATIONS_ENABLED } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { cleanEnv } from "@/lib/push";
import { NOTIFY_DEFAULTS } from "@/lib/push-messages";
import { requireProfessional } from "@/lib/session";
import { DigestForm } from "./digest-form";

export const metadata: Metadata = { title: "Ajustes" };

const PRO_NOTIFICATIONS: NotificationPrefItem[] = [
  {
    kind: "patientCancelled",
    label: "Un paciente no puede venir",
    hint: "Cuando avisa desde la app que no va a un turno.",
  },
  {
    kind: "patientLinked",
    label: "Invitación aceptada",
    hint: "Cuando un paciente acepta tu invitación.",
  },
];

export default async function ProSettingsPage() {
  const { user, professional } = await requireProfessional();
  const prefs = NOTIFICATIONS_ENABLED
    ? await prisma.notificationPrefs.findUnique({ where: { userId: user.id } })
    : null;
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader title="Ajustes" />
      <section aria-labelledby="appt-title" className="flex flex-col gap-3">
        <div>
          <h2 id="appt-title" className="text-lg font-semibold">
            Recordatorio de turnos
          </h2>
          <p className="text-muted-foreground text-sm">
            El día anterior, a la mañana, le mandamos un mail a cada paciente con la fecha, la hora
            y el lugar o link (y un aviso al celular a quien tiene la app instalada). A quienes no
            usan la app, solo si cargaste su mail en el contacto. Cada paciente lo puede apagar para
            sí.
          </p>
        </div>
        <AppointmentEmailToggle
          side="pro"
          initial={professional.appointmentReminders}
          label="Mandar recordatorios a mis pacientes"
        />
      </section>
      {NOTIFICATIONS_ENABLED && (
        <section aria-labelledby="push-title" className="flex flex-col gap-3">
          <div>
            <h2 id="push-title" className="text-lg font-semibold">
              Avisos al celular
            </h2>
            <p className="text-muted-foreground text-sm">
              Instalá Anclaje en tu celular y activalos ahí. Nunca muestran nombres de pacientes.
            </p>
          </div>
          <div className="bg-card flex flex-col gap-4 rounded-2xl border p-4">
            <PushDevice vapidKey={cleanEnv(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) ?? null} />
            <div className="border-t pt-4">
              <NotificationPrefs
                items={PRO_NOTIFICATIONS}
                initial={{ ...NOTIFY_DEFAULTS, ...prefs }}
              />
            </div>
          </div>
        </section>
      )}
      {NOTIFICATIONS_ENABLED && (
        <section aria-labelledby="digest-title" className="flex flex-col gap-3">
          <div>
            <h2 id="digest-title" className="text-lg font-semibold">
              Resumen por email
            </h2>
            <p className="text-muted-foreground text-sm">
              Te mandamos a <strong>{user.email}</strong> cuántas cosas esperan tu mirada
              (devoluciones pedidas, evaluaciones sin revisar, ítems críticos). Por privacidad, el
              email no incluye nombres ni contenido de tus pacientes. Si no hay nada pendiente, no
              te llega nada.
            </p>
          </div>
          <DigestForm initial={professional.digestFrequency} />
        </section>
      )}

      <section aria-labelledby="pw-title" className="flex flex-col gap-3">
        <h2 id="pw-title" className="text-lg font-semibold">
          Contraseña
        </h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
