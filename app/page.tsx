import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ArrowRight, CalendarCheck, ShieldCheck, Clock } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <div className="container flex h-14 items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="default" size="sm">
              <Link href="/signup">Create account</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="container pt-20 pb-24 md:pt-32 md:pb-36 relative">
          {/* Decorative rule */}
          <div className="absolute left-6 right-6 top-20 h-px bg-line hidden md:block" />
          <div className="absolute left-6 top-20 -mt-2.5 hidden md:block">
            <span className="label-caps bg-paper pr-3">Scheduling, no back & forth</span>
          </div>

          <div className="max-w-[780px] animate-fade-up">
            <h1 className="display text-[56px] md:text-[96px] leading-[0.95] tracking-[-0.02em] text-ink">
              Meetings,
              <br />
              <span className="italic text-accent" style={{ fontVariationSettings: "'SOFT' 100" }}>
                without the
              </span>{" "}
              chaos.
            </h1>
            <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-[58ch] leading-relaxed">
              A quiet scheduling tool for an assistant and the people who want
              their time. Request a slot, get a clear answer — approved,
              rescheduled, or declined with a reason.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent">
                <Link href="/signup">
                  Request a meeting <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Feature triad */}
        <section className="border-y border-line bg-surface/50">
          <div className="container grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
            <Feature
              Icon={CalendarCheck}
              eyebrow="01"
              title="Request with confidence"
              body="Pick a day and time that works. Conflicts show up before you submit — no more guessing."
            />
            <Feature
              Icon={Clock}
              eyebrow="02"
              title="See the status, clearly"
              body="Pending, approved, or rescheduled — every request has a clear state and a clear next step."
            />
            <Feature
              Icon={ShieldCheck}
              eyebrow="03"
              title="Your phone, your account"
              body="Sign in with the same phone number each time. Email is optional; trust is not."
            />
          </div>
        </section>

        {/* How it works */}
        <section className="container py-24 md:py-32">
          <div className="grid md:grid-cols-[280px_1fr] gap-12">
            <div>
              <span className="label-caps">How it works</span>
              <h2 className="mt-3 display text-3xl md:text-4xl text-ink leading-tight">
                A short, predictable flow.
              </h2>
            </div>
            <ol className="space-y-10 md:mt-2">
              {[
                {
                  n: "01",
                  t: "Create a quick account",
                  d: "Phone number and password. Name too. Email if you want to.",
                },
                {
                  n: "02",
                  t: "Request a time",
                  d: "Pick a day and duration. We show you which times are actually open.",
                },
                {
                  n: "03",
                  t: "The assistant responds",
                  d: "Approved as-is, approved at a new time, or declined with a reason — you'll see it on your dashboard.",
                },
              ].map((step) => (
                <li key={step.n} className="grid grid-cols-[56px_1fr] gap-5 border-b border-line pb-10 last:border-0">
                  <div className="tabular text-muted-foreground text-sm pt-1">{step.n}</div>
                  <div>
                    <h3 className="display text-xl text-ink">{step.t}</h3>
                    <p className="mt-2 text-muted-foreground leading-relaxed">{step.d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-line py-8">
        <div className="container flex flex-wrap items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-muted-foreground tabular">
            © {new Date().getFullYear()} Scheduler. A single host, a single source of truth.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  Icon,
  eyebrow,
  title,
  body,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="p-8 md:p-10">
      <div className="flex items-start justify-between">
        <Icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
        <span className="tabular text-xs text-muted-foreground">{eyebrow}</span>
      </div>
      <h3 className="display text-xl text-ink mt-6">{title}</h3>
      <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{body}</p>
    </div>
  );
}
