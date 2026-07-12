"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/journal", label: "Journal" },
  { href: "/calendar", label: "Calendar" },
  { href: "/trades", label: "Trades" },
  { href: "/reports", label: "Analytics" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/journal" && pathname === "/demo") return true;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function navOrigin(returnTo: string | null): string | null {
  if (!returnTo?.startsWith("/") || returnTo.startsWith("//")) return null;
  return nav.find((item) =>
    returnTo === item.href
    || returnTo.startsWith(`${item.href}/`)
    || returnTo.startsWith(`${item.href}?`),
  )?.href ?? null;
}

export default function NavLinks() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const reviewOrigin = pathname === "/trades/review"
    ? navOrigin(searchParams.get("returnTo"))
    : null;

  return (
    <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
      {nav.map((item) => {
        const active = reviewOrigin != null
          ? item.href === reviewOrigin
          : isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
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
