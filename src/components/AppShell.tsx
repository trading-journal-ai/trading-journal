"use client";

import { usePathname } from "next/navigation";
import AccountSelector from "@/components/AccountSelector";
import ImportForm from "@/components/ImportForm";
import NavLinks from "@/components/NavLinks";
import SettingsLink from "@/components/SettingsLink";
import type { AccountOption } from "@/lib/accountScope";

export default function AppShell({
  accounts,
  activeAccountId,
  brandHref,
  showImport,
  showSettings,
  children,
}: {
  accounts: AccountOption[];
  activeAccountId: number;
  brandHref?: string;
  showImport: boolean;
  showSettings: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const brandClassName = "font-semibold tracking-tight";

  return (
    <>
      {!isLanding ? (
        <header className="sticky top-0 z-40 flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-[var(--border)] bg-[var(--background)] px-5 py-3">
          {brandHref ? (
            <a href={brandHref} className={brandClassName}>
              Trading&nbsp;Journal&nbsp;AI
            </a>
          ) : (
            <span className={brandClassName}>Trading&nbsp;Journal&nbsp;AI</span>
          )}
          <NavLinks />
          <div className="ml-auto flex flex-wrap items-start justify-end gap-3">
            <AccountSelector accounts={accounts} activeAccountId={activeAccountId} />
            {showImport ? <ImportForm /> : null}
            {showSettings ? <SettingsLink /> : null}
          </div>
        </header>
      ) : null}
      <main className={isLanding ? "flex-1" : "flex-1 px-5 py-6"}>{children}</main>
    </>
  );
}
