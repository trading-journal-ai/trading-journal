import AppShell from "@/components/AppShell";
import { getActiveAccount, listAccounts } from "@/lib/accountScope";
import { canImportData } from "@/lib/demoMode";

export const dynamic = "force-dynamic";

export default async function JournalAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const accounts = await listAccounts();
  const activeAccount = await getActiveAccount(accounts);
  const showImport = canImportData();

  return (
    <AppShell accounts={accounts} activeAccountId={activeAccount.id} showImport={showImport}>
      {children}
    </AppShell>
  );
}
