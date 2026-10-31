import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { requireProfessional } from "@/lib/session";
import { ProNav } from "./pro-nav";

export default async function ProfessionalLayout({ children }: LayoutProps<"/pro">) {
  const { professional } = await requireProfessional();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="bg-card border-b md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-14 items-center justify-between px-5 md:h-16">
          <Link href="/pro">
            <Logo withText />
          </Link>
          <div className="md:hidden">
            <SignOutButton />
          </div>
        </div>
        <ProNav />
        <div className="hidden px-5 py-6 md:block">
          <p className="text-sm font-medium">{professional.displayName}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
