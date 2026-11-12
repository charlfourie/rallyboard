"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Board" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/releases", label: "Releases" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex items-center gap-1 text-sm">
      {LINKS.map((link) => {
        const active =
          link.href === "/" ? pathname === "/" || pathname.startsWith("/ideas") : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 transition ${
              active ? "bg-surface-2 text-text" : "text-muted hover:bg-surface-2 hover:text-text"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
