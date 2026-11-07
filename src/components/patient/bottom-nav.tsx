"use client";

import { BookHeart, CalendarDays, House, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Inicio", icon: House },
  { href: "/app/diario", label: "Diario", icon: BookHeart },
  { href: "/app/turnos", label: "Turnos", icon: CalendarDays },
  { href: "/app/ajustes", label: "Ajustes", icon: Settings },
];

/** Barra de abajo del diseño "nuevo": cuatro secciones y, en el medio, la rueda. */
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);
  const [left, right] = [items.slice(0, 2), items.slice(2)];

  const renderItem = ({ href, label, icon: Icon }: (typeof items)[number]) => {
    const active = isActive(href);
    return (
      <Link
        key={href}
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        <Icon className="size-5" aria-hidden />
        {label}
        <span
          className={cn("size-1 rounded-full", active ? "bg-block-sun-deep" : "bg-transparent")}
          aria-hidden
        />
      </Link>
    );
  };

  return (
    <nav
      aria-label="Secciones"
      className="bg-card/95 fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <div className="mx-auto flex h-[var(--nav-h)] max-w-md items-center px-2">
        {left.map(renderItem)}
        <div className="flex flex-1 justify-center">
          <Link
            href="/app/rueda"
            aria-label="Registrar cómo me siento"
            className="bg-block-sun text-block-sun-foreground ring-block-sun-soft -mt-8 flex size-16 items-center justify-center rounded-full shadow-lg ring-8 transition-transform active:scale-95"
          >
            <Plus className="size-7" strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
        {right.map(renderItem)}
      </div>
    </nav>
  );
}
