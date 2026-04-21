"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Logo } from "./logo";
import { cn, initials } from "@/lib/utils";
import { Button } from "./ui/button";
import { LogOut, Menu, X } from "lucide-react";
import { NotificationBell } from "./notification-bell";

type NavItem = { href: string; label: string };

export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { data } = useSession();
  const name = data?.user?.name ?? "";
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the mobile menu on navigation
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [mobileOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-paper/80 backdrop-blur border-b border-line">
        <div className="container flex h-14 items-center">
          {/* Mobile: hamburger first, then logo */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden mr-3 h-9 w-9 grid place-items-center rounded-md hover:bg-muted transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link href="/" className="shrink-0">
            <Logo />
          </Link>

          {/* Desktop nav */}
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
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 top-14 z-30 bg-paper animate-fade-in"
          onClick={() => setMobileOpen(false)}
        >
          <nav
            className="border-b border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="container py-2">
              {/* Profile summary on mobile */}
              <div className="flex items-center gap-3 px-2 py-3 border-b border-line mb-2">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-accent text-xs font-medium tabular">
                  {initials(name) || "·"}
                </div>
                <div>
                  <div className="text-sm text-ink font-medium">{name || "Guest"}</div>
                  <div className="text-xs text-muted-foreground">
                    {data?.user?.role === "ASSISTANT" ? "Assistant" : "Guest"}
                    {data?.user?.phone && (
                      <>
                        {" "}· <span className="tabular">{data.user.phone}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Nav links */}
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center px-3 py-3 rounded-md text-base transition-colors",
                      active
                        ? "bg-accent/10 text-accent font-medium"
                        : "text-ink hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
