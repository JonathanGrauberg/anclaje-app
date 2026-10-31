import { BookOpen, ClipboardList, LayoutDashboard, Users } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { requireProfessional } from "@/lib/session";

const nav = [
  { href: "/pro", label: "Inicio", icon: LayoutDashboard },
  { href: "/pro", label: "Pacientes", icon: Users, soon: true },
  { href: "/pro", label: "Biblioteca", icon: BookOpen, soon: true },
  { href: "/pro", label: "Evaluaciones", icon: ClipboardList, soon: true },
];

export default async function ProfessionalLayout({ children }: LayoutProps<"/pro">) {
  const { professional } = await requireProfessional();

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <aside className="bg-card border-b md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-14 items-center justify-between px-5 md:h-16">
          <Link href="/pro" aria-label="Inicio">
            <Logo withText />
          </Link>
          <div className="md:hidden">
            <SignOutButton />
          </div>
        </div>
        <nav
          aria-label="Principal"
          className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0"
        >
          {nav.map(({ href, label, icon: Icon, soon }) =>
            soon ? (
              <span
                key={label}
                className="text-muted-foreground/70 flex items-center gap-3 rounded-xl px-3 py-2 text-sm whitespace-nowrap"
                aria-disabled
              >
                <Icon className="size-4" aria-hidden /> {label}
                <span className="bg-muted rounded-full px-2 text-[10px]">pronto</span>
              </span>
            ) : (
              <Link
                key={label}
                href={href}
                className="bg-primary-soft text-primary flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium whitespace-nowrap"
              >
                <Icon className="size-4" aria-hidden /> {label}
              </Link>
            ),
          )}
        </nav>
        <div className="hidden px-5 py-6 md:block">
          <p className="text-sm font-medium">{professional.displayName}</p>
          <SignOutButton />
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-10">{children}</main>
    </div>
  );
}
