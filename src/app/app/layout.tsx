import { Settings } from "lucide-react";
import Link from "next/link";
import { ColorModeToggle } from "@/components/color-mode-toggle";
import { InstallAppBanner } from "@/components/install-app-banner";
import { Logo } from "@/components/logo";
import { BottomNav } from "@/components/patient/bottom-nav";
import { HelpButton } from "@/components/patient/help-button";
import { SignOutButton } from "@/components/sign-out-button";
import { DISCLAIMER } from "@/lib/constants";
import { getCrisisLines } from "@/lib/queries/common";
import { requirePatient } from "@/lib/session";
import { getUiTheme } from "@/lib/ui-theme";
import { cn } from "@/lib/utils";

export default async function PatientLayout({ children }: LayoutProps<"/app">) {
  const { isDemoView, user } = await requirePatient();
  const [lines, theme] = await Promise.all([getCrisisLines(), getUiTheme()]);
  const isNew = theme === "nuevo";

  return (
    <div
      data-theme={isNew ? "nuevo" : undefined}
      className={cn("flex flex-1 flex-col", isNew && "bg-background text-foreground")}
    >
      {isDemoView && (
        <div
          role="status"
          className="bg-block-sun text-block-sun-foreground relative z-40 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-4 py-2 text-center text-sm"
        >
          <span>
            Estás viendo la app como <strong>{user.name}</strong>, tu paciente de ejemplo.
          </span>
          <a
            href="/demo/salir"
            className="rounded-full bg-[#1e3331] px-3 py-1 font-semibold text-white"
          >
            Volver a mi panel
          </a>
        </div>
      )}
      <header className="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b border-transparent backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/app" className="rounded-full">
            <Logo withText />
          </Link>
          <div className="flex items-center gap-1">
            <ColorModeToggle className="size-10" />
            <Link
              href="/app/ajustes"
              aria-label="Ajustes"
              className="hover:bg-muted flex size-10 items-center justify-center rounded-full"
            >
              <Settings className="size-5" aria-hidden />
            </Link>
            {!isDemoView && <SignOutButton />}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-28">{children}</main>
      <footer className="text-muted-foreground mx-auto w-full max-w-2xl px-4 pb-[calc(var(--nav-h,0px)+6rem)] text-center text-xs leading-relaxed">
        {DISCLAIMER}
      </footer>
      {isNew && <BottomNav />}
      <HelpButton lines={lines} />
      <InstallAppBanner />
    </div>
  );
}
