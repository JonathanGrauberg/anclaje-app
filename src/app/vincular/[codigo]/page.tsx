import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CONSENT_SECTIONS, CONSENT_VERSION } from "@/lib/consent";
import { prisma } from "@/lib/db";
import { formatCode, normalizeCode } from "@/lib/invitations";
import { getSession, homeForRole, type Role } from "@/lib/session";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Vincularme con mi psicóloga" };

export default async function LinkPage({ params }: PageProps<"/vincular/[codigo]">) {
  const { codigo } = await params;
  const code = normalizeCode(decodeURIComponent(codigo));
  const session = await getSession();
  const role = (session?.user.role ?? "PATIENT") as Role;

  const invitation = code
    ? await prisma.invitation.findUnique({
        where: { code },
        select: {
          usedAt: true,
          expiresAt: true,
          professional: { select: { displayName: true } },
        },
      })
    : null;
  const valid = invitation && !invitation.usedAt && invitation.expiresAt > new Date();
  const next = `/vincular/${code ?? ""}`;

  return (
    <main className="flex flex-1 flex-col items-center px-5 py-10">
      <div className="flex w-full max-w-lg flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="size-12" />
        </div>

        {!valid ? (
          <Card>
            <CardContent className="flex flex-col gap-3 p-6 text-center">
              <h1 className="text-xl font-semibold">Este código no sirve</h1>
              <p className="text-muted-foreground">
                Puede que haya vencido o que ya se haya usado. Pedile a tu psicóloga uno nuevo.
              </p>
              <Button asChild variant="soft" className="self-center">
                <Link href="/">Ir al inicio</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col gap-5 p-6">
              <div>
                <p className="text-muted-foreground text-sm">Código {formatCode(code!)}</p>
                <h1 className="text-2xl font-semibold tracking-tight">
                  {invitation.professional.displayName} te invita a Sentir
                </h1>
              </div>

              <section aria-labelledby="consent-title" className="flex flex-col gap-3">
                <h2 id="consent-title" className="font-semibold">
                  Antes de vincularte, leé esto con calma
                </h2>
                <ul className="flex flex-col gap-3">
                  {CONSENT_SECTIONS.map((s) => (
                    <li key={s.title} className="bg-muted/60 rounded-2xl p-4">
                      <p className="font-medium">{s.title}</p>
                      <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{s.body}</p>
                    </li>
                  ))}
                </ul>
                <p className="text-muted-foreground text-xs">Versión {CONSENT_VERSION}</p>
              </section>

              {!session ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm">Para aceptar, entrá con tu cuenta o creá una nueva.</p>
                  <Button asChild size="lg">
                    <Link href={`/registrarse?next=${encodeURIComponent(next)}`}>
                      Crear mi cuenta
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                    <Link href={`/ingresar?next=${encodeURIComponent(next)}`}>Ya tengo cuenta</Link>
                  </Button>
                </div>
              ) : role !== "PATIENT" ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm">
                    Estás con una cuenta profesional. Para aceptar, tu paciente tiene que abrir este
                    link con su cuenta.
                  </p>
                  <Button asChild variant="soft">
                    <Link href={homeForRole(role)}>Volver a mi panel</Link>
                  </Button>
                </div>
              ) : (
                <AcceptForm code={code!} professionalName={invitation.professional.displayName} />
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
