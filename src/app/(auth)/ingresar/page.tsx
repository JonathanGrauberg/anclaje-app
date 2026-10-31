import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession, homeForRole, type Role } from "@/lib/session";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Ingresar" };

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect(homeForRole((session.user.role ?? "PATIENT") as Role));
  return <SignInForm />;
}
