import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, homeForRole, type Role } from "@/lib/session";
import { safeNext } from "@/lib/utils";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function SignInPage({ searchParams }: PageProps<"/ingresar">) {
  const next = safeNext((await searchParams).next);
  const session = await getSession();
  if (session) redirect(next ?? homeForRole((session.user.role ?? "PATIENT") as Role));
  return <SignInForm next={next} />;
}
