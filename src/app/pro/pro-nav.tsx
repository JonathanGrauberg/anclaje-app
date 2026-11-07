"use client";

import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  MessageSquareQuote,
  Settings,
  ShieldCheck,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/pro", label: "Pacientes", icon: LayoutDashboard },
  { href: "/pro/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pro/honorarios", label: "Honorarios", icon: Wallet },
  { href: "/pro/invitaciones", label: "Agregar paciente", icon: UserPlus },
  { href: "/pro/respuestas-rapidas", label: "Respuestas rápidas", icon: MessageSquareQuote },
  { href: "/pro/biblioteca", label: "Biblioteca", icon: BookOpen },
  { href: "/pro/evaluaciones", label: "Evaluaciones", icon: ClipboardList },
  { href: "/pro/ajustes", label: "Ajustes", icon: Settings },
] as { href: string | null; label: string; icon: LucideIcon }[];

export function ProNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin
    ? [...nav, { href: "/admin", label: "Administración", icon: ShieldCheck }]
    : nav;
  const isActive = (href: string) =>
    href === "/pro"
      ? pathname === "/pro" || pathname.startsWith("/pro/pacientes")
      : pathname.startsWith(href);

  return (
    <nav
      aria-label="Principal"
      className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0"
    >
      {items.map(({ href, label, icon: Icon }) =>
        href === null ? (
          <span
            key={label}
            className="text-muted-foreground/70 nuevo:text-white/50 flex items-center gap-3 rounded-xl px-3 py-2 text-sm whitespace-nowrap"
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
                ? "bg-primary-soft text-primary nuevo:bg-block-sun nuevo:text-block-sun-foreground font-medium"
                : "text-foreground hover:bg-muted nuevo:text-white/80 nuevo:hover:bg-white/10 nuevo:hover:text-white",
            )}
          >
            <Icon className="size-4" aria-hidden /> {label}
          </Link>
        ),
      )}
    </nav>
  );
}
