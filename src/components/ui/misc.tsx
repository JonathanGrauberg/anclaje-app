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

const HEADER_TONES = {
  sage: "nuevo:bg-block-sage nuevo:text-block-sage-foreground",
  sun: "nuevo:bg-block-sun nuevo:text-block-sun-foreground",
  forest: "nuevo:bg-block-forest nuevo:text-block-forest-foreground",
  night: "nuevo:bg-block-night nuevo:text-white",
} as const;

export type HeaderTone = keyof typeof HEADER_TONES;

export function PageHeader({
  title,
  description,
  action,
  back,
  tone = "sage",
}: {
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  /** Botón "volver" a la pantalla madre. */
  back?: { href: string; label: string };
  /** Color del encabezado en el diseño "nuevo" (en el actual no cambia nada). */
  tone?: HeaderTone;
}) {
  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-3",
        "nuevo:relative nuevo:isolate nuevo:overflow-hidden nuevo:rounded-[2rem] nuevo:px-6 nuevo:pt-4 nuevo:pb-7",
        HEADER_TONES[tone],
      )}
    >
      <span
        className="nuevo:block absolute -top-14 -right-12 -z-10 hidden size-44 rounded-full bg-white/15"
        aria-hidden
      />
      <div className="flex flex-col">
        {back && (
          <BackLink
            href={back.href}
            label={back.label}
            className="nuevo:mb-4 nuevo:text-current nuevo:bg-white/20 nuevo:hover:bg-white/30 nuevo:hover:text-current nuevo:ml-0 mb-1"
          />
        )}
        <h1 className="nuevo:text-[2rem] nuevo:leading-[1.05] nuevo:font-bold text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="text-muted-foreground nuevo:text-current nuevo:opacity-80 nuevo:mt-2 mt-1">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="nuevo:[&_a]:bg-block-night nuevo:[&_button]:bg-block-night nuevo:[&_a]:text-white nuevo:[&_button]:text-white">
          {action}
        </div>
      )}
    </div>
  );
}
