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
  // Con ?tipo=profesional arranca en el alta de profesionales (link de la landing y los mails).
  const pro = sp.tipo === "profesional";
  const tab = (active: boolean) =>
    cn(
      "flex-1 rounded-full px-3 py-2 text-center text-sm font-medium transition-colors",
      active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
    );
  const qs = (tipo?: string) => {
    const p = new URLSearchParams();
    if (tipo) p.set("tipo", tipo);
    if (next) p.set("next", next);
    const s = p.toString();
    return s ? `/registrarse?${s}` : "/registrarse";
  };

  return (
    <div className="flex flex-col gap-4">
      <nav aria-label="Tipo de cuenta" className="bg-muted flex gap-1 rounded-full p-1">
        <Link href={qs()} replace className={tab(!pro)} aria-current={!pro ? "page" : undefined}>
          Soy paciente
        </Link>
        <Link
          href={qs("profesional")}
          replace
          className={tab(pro)}
          aria-current={pro ? "page" : undefined}
        >
          Soy psicóloga/o
        </Link>
      </nav>
      {pro ? <ProSignUpForm /> : <SignUpForm next={next} />}
    </div>
  );
}
