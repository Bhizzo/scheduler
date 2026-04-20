import { TopNav } from "@/components/top-nav";

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav
        items={[
          { href: "/dashboard", label: "My meetings" },
          { href: "/book", label: "Book" },
        ]}
      />
      <main className="flex-1">{children}</main>
    </div>
  );
}
