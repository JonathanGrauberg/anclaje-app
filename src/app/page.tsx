import { redirect } from "next/navigation";
import { getSession, homeForRole, type Role } from "@/lib/session";

export default async function Home() {
  const session = await getSession();
  if (!session) redirect("/ingresar");
  redirect(homeForRole((session.user.role ?? "PATIENT") as Role));
}
