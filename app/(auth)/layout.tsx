import Link from "next/link";
import { Logo } from "@/components/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">
      {/* Editorial side */}
      <aside className="hidden lg:flex relative bg-ink text-paper overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, hsl(var(--accent)) 0%, transparent 60%), radial-gradient(circle at 80% 70%, hsl(var(--accent)) 0%, transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link href="/" className="text-paper">
            <Logo className="[&>span]:text-paper [&>svg]:text-paper" />
          </Link>

          <div className="max-w-[480px]">
            <p className="label-caps text-paper/50">An invitation, not a hurdle</p>
            <h2
              className="display mt-5 text-[44px] leading-[1.05] tracking-[-0.02em]"
              style={{ fontVariationSettings: "'SOFT' 60" }}
            >
              A single calendar.
              <br />
              <span className="italic text-accent-foreground/80">A single answer</span>
              <br />
              per request.
            </h2>
            <p className="mt-6 text-paper/70 leading-relaxed">
              Every meeting you request moves through one clear path — pending,
              reviewed, decided. No lost threads, no back-and-forth.
            </p>
          </div>

          <div className="flex items-center justify-between text-xs text-paper/40 tabular">
            <span>© {new Date().getFullYear()} Scheduler</span>
            <span>Built for calm</span>
          </div>
        </div>
      </aside>

      {/* Form side */}
      <main className="flex flex-col">
        <div className="lg:hidden border-b border-line">
          <div className="container flex h-14 items-center">
            <Link href="/">
              <Logo />
            </Link>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
