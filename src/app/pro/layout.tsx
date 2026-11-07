import Link from "next/link";
import { ColorModeToggle } from "@/components/color-mode-toggle";
import { InstallAppBanner } from "@/components/install-app-banner";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { requireProfessional } from "@/lib/session";
import { getUiTheme } from "@/lib/ui-theme";
import { cn } from "@/lib/utils";
import { ProNav } from "./pro-nav";

export default async function ProfessionalLayout({ children }: LayoutProps<"/pro">) {
  const [{ user, professional }, theme] = await Promise.all([requireProfessional(), getUiTheme()]);
  const isNew = theme === "nuevo";

  return (
    <div
      data-theme={isNew ? "nuevo" : undefined}
      // En el panel no hay barra de abajo: el banner de instalar no se tiene que correr.
      className={cn(
        "flex flex-1 flex-col md:flex-row",
        isNew && "bg-background text-foreground [--nav-h:0px]",
      )}
    >
      <aside className="bg-card nuevo:bg-block-night nuevo:text-white nuevo:border-white/10 border-b md:sticky md:top-0 md:h-dvh md:w-64 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex h-14 items-center justify-between px-5 md:h-16">
          <Link href="/pro">
            <Logo withText className="nuevo:text-white" />
          </Link>
          <div className="nuevo:[&_button]:text-white/80 nuevo:[&_button:hover]:bg-white/10 nuevo:[&_button:hover]:text-white flex items-center gap-1 md:hidden">
            <ColorModeToggle className="nuevo:text-white/80 nuevo:hover:bg-white/10 nuevo:hover:text-white" />
            <SignOutButton />
          </div>
        </div>
        <ProNav isAdmin={user.role === "ADMIN"} />
        <div className="nuevo:[&_button]:text-white/80 nuevo:[&_button:hover]:bg-white/10 nuevo:[&_button:hover]:text-white hidden px-5 py-6 md:block">
          <p className="text-sm font-medium">{professional.displayName}</p>
          <div className="mt-1 flex items-center gap-1">
            <SignOutButton />
            <ColorModeToggle className="nuevo:text-white/80 nuevo:hover:bg-white/10 nuevo:hover:text-white" />
          </div>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8 md:px-10">{children}</main>
      <InstallAppBanner />
    </div>
  );
}
