import type { Metadata } from "next";
import { ChangePasswordForm } from "@/components/change-password-form";
import { PageHeader } from "@/components/ui/misc";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AdminSettingsPage() {
  const user = await requireAdmin();
  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <PageHeader title="Ajustes" description={user.email} />
      <section
        id="contrasena"
        aria-labelledby="pw-title"
        className="flex scroll-mt-20 flex-col gap-3"
      >
        <h2 id="pw-title" className="text-lg font-semibold">
          Contraseña
        </h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
