import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Logo className="size-14" />
          <p className="text-muted-foreground">Un lugar tranquilo para lo que sentís.</p>
        </div>
        {children}
        <p className="text-muted-foreground mt-10 text-center text-xs leading-relaxed">
          Esta app no es un servicio de urgencias. Si estás en peligro ahora, llamá al 911.
        </p>
      </div>
    </main>
  );
}
