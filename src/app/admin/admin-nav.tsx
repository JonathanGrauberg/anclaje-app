"use client";

import {
  ClipboardList,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  ScrollText,
  Settings,
  Stethoscope,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/admin", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/profesionales", label: "Profesionales", icon: UserRound },
  { href: "/admin/interesados", label: "Interesados", icon: Inbox },
  { href: "/admin/lineas", label: "Líneas de ayuda", icon: LifeBuoy },
  { href: "/admin/plantillas", label: "Plantillas", icon: ClipboardList },
  { href: "/admin/auditoria", label: "Auditoría", icon: ScrollText },
  { href: "/admin/ajustes", label: "Ajustes", icon: Settings },
];

export function AdminNav({ hasProfessionalProfile }: { hasProfessionalProfile: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
  const items = hasProfessionalProfile
    ? [...nav, { href: "/pro", label: "Panel profesional", icon: Stethoscope }]
    : nav;

  return (
    <nav
      aria-label="Administración"
      className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0"
    >
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
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
      ))}
    </nav>
  );
}
