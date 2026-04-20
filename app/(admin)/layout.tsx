import { TopNav } from "@/components/top-nav";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  if (!user) redirect("/login");
  if (user.role !== "ASSISTANT") redirect("/dashboard");

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav
        items={[
          { href: "/admin", label: "Requests" },
          { href: "/admin/schedule", label: "Schedule" },
          { href: "/admin/availability", label: "Availability" },
          { href: "/admin/settings", label: "Settings" },
        ]}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
