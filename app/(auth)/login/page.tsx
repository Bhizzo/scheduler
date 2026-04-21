"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || null;

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const res = await signIn("credentials", {
      phone,
      password,
      redirect: false,
    });
    setLoading(false);
    if (!res?.ok) {
      setError("That phone number and password don't match. Try again.");
      return;
    }
    // Route based on role handled by middleware, but push to next or /dashboard
    router.push(next || "/dashboard");
    router.refresh();
  }

  return (
    <div className="animate-fade-up">
      <span className="label-caps">Sign in</span>
      <h1 className="display text-4xl md:text-5xl mt-3 tracking-tight">
        Welcome <span className="italic text-accent">back</span>.
      </h1>
      <p className="mt-3 text-muted-foreground">
        Enter the phone number you signed up with.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+265 999 000 000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && (
          <div className="flex gap-2 text-sm text-danger rounded-md bg-danger/5 border border-danger/15 px-3 py-2.5">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" variant="accent" size="lg" className="w-full" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted-foreground">
        First time here?{" "}
        <Link href="/signup" className="text-ink underline-offset-4 hover:underline font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
