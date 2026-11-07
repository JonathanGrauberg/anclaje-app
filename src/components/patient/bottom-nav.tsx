"use client";

import { BookHeart, CalendarDays, House, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/app", label: "Inicio", icon: House },
  { href: "/app/diario", label: "Diario", icon: BookHeart },
  { href: "/app/turnos", label: "Turnos", icon: CalendarDays },
  { href: "/app/ajustes", label: "Ajustes", icon: Settings },
];

/** Barra del diseño "nuevo": una pastilla chica y flotante; solo la sección actual muestra su nombre. */
export function BottomNav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname.startsWith(href);

  return (
    <nav
      aria-label="Secciones"
      className="pointer-events-none fixed inset-x-0 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 flex justify-center"
    >
      <div className="bg-card/90 pointer-events-auto flex items-center gap-1 rounded-full border p-1.5 shadow-lg backdrop-blur">
        {items.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-block-night text-white"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-[1.15rem]" aria-hidden />
              {active && <span>{label}</span>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
