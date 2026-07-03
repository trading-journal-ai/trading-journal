import AppShell from "@/components/AppShell";
import { getActiveAccount, listAccounts } from "@/lib/accountScope";
import { canImportData, isDemoReadOnly } from "@/lib/demoMode";

export const dynamic = "force-dynamic";

export default async function JournalAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const accounts = await listAccounts();
  const activeAccount = await getActiveAccount(accounts);
  const demoReadOnly = isDemoReadOnly();
  const brandHref = demoReadOnly ? "https://trading-journal.ai" : undefined;
  const showImport = canImportData();
  const showSettings = !demoReadOnly;

  return (
    <AppShell
      accounts={accounts}
      activeAccountId={activeAccount.id}
      brandHref={brandHref}
      showImport={showImport}
      showSettings={showSettings}
    >
      {children}
    </AppShell>
  );
}
