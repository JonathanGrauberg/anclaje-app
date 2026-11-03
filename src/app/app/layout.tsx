import { Settings } from "lucide-react";
import Link from "next/link";
import { InstallAppBanner } from "@/components/install-app-banner";
import { Logo } from "@/components/logo";
import { HelpButton } from "@/components/patient/help-button";
import { SignOutButton } from "@/components/sign-out-button";
import { DISCLAIMER } from "@/lib/constants";
import { getCrisisLines } from "@/lib/queries/common";
import { requirePatient } from "@/lib/session";

export default async function PatientLayout({ children }: LayoutProps<"/app">) {
  await requirePatient();
  const lines = await getCrisisLines();

  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-background/85 supports-[backdrop-filter]:bg-background/70 sticky top-0 z-30 border-b border-transparent backdrop-blur">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
          <Link href="/app" className="rounded-full">
            <Logo withText />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/app/ajustes"
              aria-label="Ajustes"
              className="hover:bg-muted flex size-10 items-center justify-center rounded-full"
            >
              <Settings className="size-5" aria-hidden />
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pt-4 pb-28">{children}</main>
      <footer className="text-muted-foreground mx-auto w-full max-w-2xl px-4 pb-24 text-center text-xs leading-relaxed">
        {DISCLAIMER}
      </footer>
      <HelpButton lines={lines} />
      <InstallAppBanner />
    </div>
  );
}
