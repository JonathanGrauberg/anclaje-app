import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { prisma } from "@/lib/db";
import { homeForRole, requireUser } from "@/lib/session";
import { ProfessionalSignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Completá tu alta" };

/** Primera vez con Google: la profesional carga su matrícula antes de entrar al panel. */
export default async function ProfessionalSignupPage() {
  const user = await requireUser();
  if (user.role !== "PROFESSIONAL") redirect(homeForRole(user.role));
  const profile = await prisma.professionalProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (profile) redirect("/pro");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo className="size-14" />
          <h1 className="text-2xl font-semibold">Completá tu alta profesional</h1>
          <p className="text-muted-foreground">
            Anclaje es para psicólogas y psicólogos matriculados. Cargá tu matrícula: la revisamos
            y, mientras tanto, ya podés empezar a usar la app.
          </p>
        </div>
        <ProfessionalSignupForm defaultName={user.name} email={user.email} />
      </div>
    </main>
  );
}
