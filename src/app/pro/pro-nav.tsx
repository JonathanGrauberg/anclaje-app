"use client";

import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  MessageSquareQuote,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/pro", label: "Pacientes", icon: LayoutDashboard },
  { href: "/pro/invitaciones", label: "Invitar paciente", icon: UserPlus },
  { href: "/pro/respuestas-rapidas", label: "Respuestas rápidas", icon: MessageSquareQuote },
  { href: "/pro/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/pro/evaluaciones", label: "Evaluaciones", icon: ClipboardList },
] as { href: string | null; label: string; icon: LucideIcon }[];

export function ProNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/pro"
      ? pathname === "/pro" || pathname.startsWith("/pro/pacientes")
      : pathname.startsWith(href);

  return (
    <nav
      aria-label="Principal"
      className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0"
    >
      {nav.map(({ href, label, icon: Icon }) =>
        href === null ? (
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
            aria-current={isActive(href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors",
              isActive(href)
                ? "bg-primary-soft text-primary font-medium"
                : "text-foreground hover:bg-muted",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        ),
      )}
    </nav>
  );
}
