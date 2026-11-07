import { HeartHandshake, Stethoscope } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { cn, safeNext } from "@/lib/utils";
import { ProSignUpForm } from "./pro-sign-up-form";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function SignUpPage({ searchParams }: PageProps<"/registrarse">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getSession()) redirect(next ?? "/ingresar");
  // Por defecto arranca en el alta de profesionales: los pacientes llegan casi siempre con la
  // invitación de su psicóloga (que trae ?next=/vincular/…) o eligiendo "Soy paciente".
  const pro = sp.tipo === "profesional" || (sp.tipo !== "paciente" && !next);
  const qs = (tipo: "profesional" | "paciente") => {
    const p = new URLSearchParams({ tipo });
    if (next) p.set("next", next);
    return `/registrarse?${p}`;
  };
  const option = (active: boolean) =>
    cn(
      "flex flex-1 flex-col items-center gap-1 rounded-2xl border-2 px-3 py-3 text-center transition-colors",
      active
        ? "border-primary bg-primary-soft text-primary"
        : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
    );

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Tipo de cuenta" className="flex flex-col gap-2">
        <p className="text-center text-sm font-medium">¿Quién sos?</p>
        <div className="flex gap-2">
          <Link
            href={qs("profesional")}
            replace
            className={option(pro)}
            aria-current={pro ? "page" : undefined}
          >
            <Stethoscope className="size-6" aria-hidden />
            <span className="text-base font-semibold">Psicóloga/o</span>
          </Link>
          <Link
            href={qs("paciente")}
            replace
            className={option(!pro)}
            aria-current={!pro ? "page" : undefined}
          >
            <HeartHandshake className="size-6" aria-hidden />
            <span className="text-base font-semibold">Paciente</span>
          </Link>
        </div>
      </nav>
      {pro ? <ProSignUpForm /> : <SignUpForm next={next} />}
    </div>
  );
}
