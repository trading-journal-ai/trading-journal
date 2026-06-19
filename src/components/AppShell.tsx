"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountSelector from "@/components/AccountSelector";
import ImportForm from "@/components/ImportForm";
import NavLinks from "@/components/NavLinks";
import SettingsLink from "@/components/SettingsLink";
import type { AccountOption } from "@/lib/accountScope";

export default function AppShell({
  accounts,
  activeAccountId,
  showImport,
  children,
}: {
  accounts: AccountOption[];
  activeAccountId: number;
  showImport: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <>
      {!isLanding ? (
        <header className="border-b border-[var(--border)] px-5 py-3 flex items-center gap-6">
          <Link href="/" className="font-semibold tracking-tight">
            Trading&nbsp;Journal&nbsp;AI
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-start gap-3">
            <AccountSelector accounts={accounts} activeAccountId={activeAccountId} />
            {showImport ? <ImportForm /> : null}
            <SettingsLink />
          </div>
        </header>
      ) : null}
      <main className={isLanding ? "flex-1" : "flex-1 px-5 py-6"}>{children}</main>
    </>
  );
}
