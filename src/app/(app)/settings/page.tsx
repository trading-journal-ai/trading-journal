import AccountSettings from "@/components/AccountSettings";
import CoachPlaybookSettings from "@/components/CoachPlaybookSettings";
import DevResetImports from "@/components/DevResetImports";
import ThemeSettings from "@/components/ThemeSettings";
import { ensureCoachPlaybook } from "@/app/coach/actions";
import { getActiveAccount, listAccounts } from "@/lib/accountScope";

export default async function SettingsPage() {
  const accounts = await listAccounts();
  const activeAccount = await getActiveAccount(accounts);
  const playbook = await ensureCoachPlaybook(activeAccount.id);
  const showDevReset = process.env.NODE_ENV !== "production";

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="max-w-xl text-sm leading-6 text-[var(--muted)]">
          App-level preferences live here so the main trading workflow can stay focused.
        </p>
      </section>

      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        <div>
          <h2 className="text-base font-semibold">Accounts</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Manage account names used by the header switcher. Imports, journals, reports, and trade views use the selected account.
          </p>
        </div>
        <AccountSettings accounts={accounts} />
      </section>

      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        <div>
          <h2 className="text-base font-semibold">Theme</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Switch between the current dark and light themes.
          </p>
        </div>
        <ThemeSettings />
      </section>

      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        <div>
          <h2 className="text-base font-semibold">Coach Playbook</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Draft the setups, risk rules, and qualitative rubric the coach should use once generation is enabled.
          </p>
        </div>
        <CoachPlaybookSettings
          playbook={{
            title: playbook.title,
            body: playbook.body,
            rubric: playbook.rubric,
          }}
        />
      </section>

      <section className="space-y-4 border-t border-[var(--border)] pt-6">
        <div>
          <h2 className="text-base font-semibold">Data</h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-[var(--muted)]">
            Export your trade history for spreadsheets, backups, or testing another trading journal.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/export/trades"
            className="inline-flex h-10 items-center rounded-md bg-[var(--blue)] px-4 text-sm font-semibold text-black"
          >
            Export trades CSV
          </a>
          <button
            type="button"
            disabled
            className="inline-flex h-10 items-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)] opacity-60"
          >
            Export database backup
          </button>
        </div>
        {showDevReset && <DevResetImports />}
      </section>
    </div>
  );
}
