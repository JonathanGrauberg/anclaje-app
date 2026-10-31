import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { safeNext } from "@/lib/utils";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default async function SignUpPage({ searchParams }: PageProps<"/registrarse">) {
  const next = safeNext((await searchParams).next);
  if (await getSession()) redirect(next ?? "/");
  return <SignUpForm next={next} />;
}
