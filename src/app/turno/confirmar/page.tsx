import { CheckCircle2, CircleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { after } from "next/server";
import { Logo } from "@/components/logo";
import { prisma } from "@/lib/db";
import { appUrl, sendEmailQuietly } from "@/lib/email";
import { hashToken } from "@/lib/public-profile";

export const metadata: Metadata = { title: "Confirmar solicitud" };
export const dynamic = "force-dynamic";

const VALID_FOR = 3 * 86_400_000;

/**
 * Link del mail de confirmación: recién acá la solicitud le llega a la profesional. El aviso a ella
 * no lleva el nombre de la persona (los mails no llevan datos de pacientes): solo que hay una nueva.
 */
async function confirm(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return "invalid" as const;
  const r = await prisma.appointmentRequest.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      status: true,
      createdAt: true,
      professional: { select: { displayName: true, user: { select: { email: true } } } },
    },
  });
  if (!r) return "invalid" as const;
  if (r.status !== "UNCONFIRMED") return { done: r.professional.displayName };
  if (Date.now() - r.createdAt.getTime() > VALID_FOR) return "expired" as const;
  const updated = await prisma.appointmentRequest.updateMany({
    where: { id: r.id, status: "UNCONFIRMED" },
    data: { status: "NEW", confirmedAt: new Date() },
  });
  if (updated.count === 1)
    after(() =>
      sendEmailQuietly(
        {
          to: r.professional.user.email,
          subject: "Anclaje: alguien te pidió turno",
          text: [
            `Hola, ${r.professional.displayName}:`,
            "\nUna persona te pidió turno desde tu perfil público y confirmó su mail.",
            `Mirá sus datos y contactala desde: ${appUrl("/pro/solicitudes")}`,
            "\nAnclaje",
          ].join("\n"),
        },
        "aviso de solicitud de turno",
      ),
    );
  return { done: r.professional.displayName };
}

export default async function ConfirmRequestPage({ searchParams }: PageProps<"/turno/confirmar">) {
  const t = (await searchParams).t;
  const result = await confirm(typeof t === "string" ? t : "");

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-12">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Link href="/" aria-label="Anclaje, inicio">
          <Logo withText />
        </Link>
        {typeof result === "object" ? (
          <section className="bg-card flex flex-col gap-3 rounded-3xl border p-6">
            <CheckCircle2 className="text-primary size-8" aria-hidden />
            <h1 className="text-2xl font-semibold">¡Listo! Tu solicitud le llegó</h1>
            <p className="text-muted-foreground">
              {result.done} ya tiene tus datos y te va a contactar por mail o teléfono. Si en unos
              días no tenés noticias, podés volver a escribirle.
            </p>
          </section>
        ) : (
          <section className="bg-card flex flex-col gap-3 rounded-3xl border p-6">
            <CircleAlert className="text-danger size-8" aria-hidden />
            <h1 className="text-2xl font-semibold">
              {result === "expired" ? "El link venció" : "Este link no sirve"}
            </h1>
            <p className="text-muted-foreground">
              {result === "expired"
                ? "Pasaron más de 3 días. Volvé al perfil de la profesional y mandá la solicitud de nuevo."
                : "Puede que esté incompleto. Copialo entero desde el mail, o mandá la solicitud de nuevo."}
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
