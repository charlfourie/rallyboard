import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { getSettings } from "@/lib/settings";

const NAV = [
  { href: "/admin/settings", label: "Settings" },
  { href: "/admin/categories", label: "Categories" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireRole("owner", "/admin/settings");
  if (!(await getSettings())) redirect("/setup");

  return (
    <div className="grid gap-8 md:grid-cols-[180px_minmax(0,1fr)]">
      <nav aria-label="Admin" className="flex gap-1 md:flex-col">
        <p className="mb-2 hidden px-3 text-xs font-medium uppercase tracking-wide text-muted md:block">
          Admin
        </p>
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="btn-ghost justify-start px-3 py-1.5">
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
