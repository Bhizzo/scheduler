"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Logo } from "./logo";
import { cn, initials } from "@/lib/utils";
import { Button } from "./ui/button";
import { LogOut } from "lucide-react";
import { NotificationBell } from "./notification-bell";

type NavItem = { href: string; label: string };

export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { data } = useSession();
  const name = data?.user?.name ?? "";

  return (
    <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur border-b border-line">
      <div className="container flex h-14 items-center">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="ml-10 hidden md:flex items-center gap-1">
          {items.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative px-3 py-2 text-sm rounded-md transition-colors",
                  active
                    ? "text-ink"
                    : "text-muted-foreground hover:text-ink"
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute left-3 right-3 -bottom-[11px] h-[2px] bg-ink rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <div className="hidden sm:flex items-center gap-2.5 pr-2 pl-2 border-l border-line">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/10 text-accent text-[11px] font-medium tabular">
              {initials(name) || "·"}
            </div>
            <div className="text-sm leading-tight">
              <div className="text-ink">{name}</div>
              <div className="text-muted-foreground text-[11px]">
                {data?.user?.role === "ASSISTANT" ? "Assistant" : "Guest"}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
