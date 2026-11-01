import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = {
  title: { template: "%s · Administración · Anclaje", default: "Administración" },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const profile = await prisma.professionalProfile.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="bg-card border-b md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-14 items-center justify-between px-5 md:h-16">
          <Link href="/admin">
            <Logo withText />
          </Link>
          <div className="md:hidden">
            <SignOutButton />
          </div>
        </div>
        <AdminNav hasProfessionalProfile={!!profile} />
        <div className="hidden px-5 py-6 md:block">
          <p className="text-sm font-medium">{user.name}</p>
          <p className="text-muted-foreground text-xs">Administración</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
