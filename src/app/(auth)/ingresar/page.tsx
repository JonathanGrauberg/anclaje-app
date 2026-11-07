import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { googleEnabled } from "@/lib/auth";
import { getSession, homeForRole, type Role } from "@/lib/session";
import { safeNext } from "@/lib/utils";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function SignInPage({ searchParams }: PageProps<"/ingresar">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  const session = await getSession();
  if (session) redirect(next ?? homeForRole((session.user.role ?? "PATIENT") as Role));
  return (
    <>
      {sp.cuenta === "borrada" && (
        <p
          role="status"
          className="bg-primary-soft text-primary mx-auto mt-6 max-w-sm rounded-2xl p-4 text-sm"
        >
          Listo, tu cuenta y todos tus datos se borraron. Gracias por haber usado Anclaje.
        </p>
      )}
      {sp.contrasena === "cambiada" && (
        <p
          role="status"
          className="bg-primary-soft text-primary mx-auto mb-4 max-w-sm rounded-2xl p-4 text-sm"
        >
          Listo, cambiaste tu contraseña. Ya podés entrar con la nueva.
        </p>
      )}
      {sp.error === "google" && (
        <p
          role="alert"
          className="bg-danger-soft text-danger mx-auto mb-4 max-w-sm rounded-2xl p-4 text-sm"
        >
          No pudiste entrar con Google. Ese ingreso es solo para profesionales: si sos paciente,
          entrá con tu email y contraseña.
        </p>
      )}
      {/* Link de ingreso vencido o inválido: Better Auth vuelve con ?error=<código> */}
      {typeof sp.error === "string" && sp.error !== "google" && (
        <p
          role="alert"
          className="bg-danger-soft text-danger mx-auto mb-4 max-w-sm rounded-2xl p-4 text-sm"
        >
          Ese link ya no sirve: puede que haya vencido o que ya lo hayas usado. Pedí otro o entrá
          con tu email y contraseña.
        </p>
      )}
      <SignInForm next={next} googleEnabled={googleEnabled} />
    </>
  );
}
