import * as React from "react";
import { BackLink } from "@/components/back-link";
import { cn } from "@/lib/utils";

export function Badge({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        className,
      )}
      {...props}
    />
  );
}

export function Progress({
  value,
  label,
  className,
}: {
  value: number;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn("bg-muted h-2 w-full overflow-hidden rounded-full", className)}
    >
      <div
        className="bg-primary h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

/** Estado vacío cálido, con guía. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-card/60 flex flex-col items-center gap-3 rounded-2xl border border-dashed px-6 py-10 text-center">
      {icon && <div className="text-primary [&_svg]:size-10">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="text-muted-foreground max-w-sm">{children}</div>}
      {action}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Botón "volver" a la pantalla madre. */
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col">
        {back && <BackLink href={back.href} label={back.label} className="mb-1" />}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}
