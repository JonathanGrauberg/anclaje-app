import Image from "next/image";
import { cn } from "@/lib/utils";

const initials = (name: string) =>
  name
    .replace(/^(lic|dra|dr|psic)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

/** Foto de perfil redonda, o las iniciales si no hay foto. */
export function Avatar({
  name,
  url,
  size = 64,
  className,
}: {
  name: string;
  url: string | null;
  size?: number;
  className?: string;
}) {
  return url ? (
    <Image
      src={url}
      alt={`Foto de ${name}`}
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0 rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className={cn(
        "bg-primary-soft text-primary inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
