"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        email: form.email || undefined,
        password: form.password,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Auto sign-in after signup
    const signInRes = await signIn("credentials", {
      phone: form.phone,
      password: form.password,
      redirect: false,
    });
    setLoading(false);
    if (!signInRes?.ok) {
      // Account was created but sign-in failed — send them to login
      router.push("/login");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="animate-fade-up">
      <span className="label-caps">Create account</span>
      <h1 className="display text-4xl md:text-5xl mt-3 tracking-tight">
        Get <span className="italic text-accent">on</span> the calendar.
      </h1>
      <p className="mt-3 text-muted-foreground">
        Phone is how we'll recognise you. Email if you'd like a copy of things.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Grace Banda"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">
            Phone number <span className="text-muted-foreground font-normal">· required</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+265 999 000 000"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">Include country code, e.g. +265 for Malawi.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            Email <span className="text-muted-foreground font-normal">· optional</span>
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="grace@example.com"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="at least 8 characters"
            value={form.password}
            onChange={(e) => update("password", e.target.value)}
            minLength={8}
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
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
        </Button>
      </form>

      <p className="mt-8 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-ink underline-offset-4 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
