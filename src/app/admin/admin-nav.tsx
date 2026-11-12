"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin/inbox", label: "Inbox", ownerOnly: false },
  { href: "/admin/releases", label: "Releases", ownerOnly: false },
  { href: "/admin/team", label: "Team", ownerOnly: true },
  { href: "/admin/categories", label: "Categories", ownerOnly: true },
  { href: "/admin/settings", label: "Settings", ownerOnly: true },
];

export function AdminNav({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-wrap gap-1 md:flex-col">
      <p className="mb-2 hidden px-3 text-xs font-medium uppercase tracking-wide text-muted md:block">Admin</p>
      {NAV.filter((item) => isOwner || !item.ownerOnly).map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`btn justify-start px-3 py-1.5 ${
              active ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
