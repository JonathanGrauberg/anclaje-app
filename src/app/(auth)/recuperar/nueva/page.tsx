import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default async function ResetPasswordPage({ searchParams }: PageProps<"/recuperar/nueva">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : null;
  if (!token || sp.error) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <h1 className="text-2xl font-semibold">Este link ya no sirve</h1>
          <p className="text-muted-foreground text-sm">
            Puede que haya vencido (dura 1 hora) o que ya lo hayas usado. Pedí uno nuevo.
          </p>
          <Link
            href="/recuperar"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Pedir otro link
          </Link>
        </CardContent>
      </Card>
    );
  }
  return <ResetPasswordForm token={token} />;
}
