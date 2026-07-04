"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/journal", label: "Journal" },
  { href: "/coach", label: "AI Coach" },
  { href: "/calendar", label: "Calendar" },
  { href: "/trades", label: "Trades" },
  { href: "/reports", label: "Analytics" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/journal" && pathname === "/demo") return true;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
      {nav.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`transition-colors ${
              active
                ? "font-semibold text-[var(--foreground)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
