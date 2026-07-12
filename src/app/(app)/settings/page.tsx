import AccountSettings from "@/components/AccountSettings";
import CoachModelSettings from "@/components/CoachModelSettings";
import CoachPlaybookSettings from "@/components/CoachPlaybookSettings";
import DevResetImports from "@/components/DevResetImports";
import ThemeSettings from "@/components/ThemeSettings";
import { ensureCoachPlaybook } from "@/app/coach/actions";
import { eq, desc, sql } from "drizzle-orm";
import { getActiveAccount, listAccounts } from "@/lib/accountScope";
import { db, schema } from "@/lib/db";
import { isDemoReadOnly } from "@/lib/demoMode";
import Link from "next/link";
import { redirect } from "next/navigation";

type SetupState = "complete" | "attention" | "later";

async function loadImportStatus(accountId: number) {
  const [tradeRows, importRows, lastImportRows] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.trades)
      .where(eq(schema.trades.accountId, accountId)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.importBatches)
      .where(eq(schema.importBatches.accountId, accountId)),
    db
      .select({ importedAt: schema.importBatches.importedAt })
      .from(schema.importBatches)
      .where(eq(schema.importBatches.accountId, accountId))
      .orderBy(desc(schema.importBatches.importedAt))
      .limit(1),
  ]);

  return {
    importCount: importRows[0]?.count ?? 0,
    tradeCount: tradeRows[0]?.count ?? 0,
    lastImportedAt: lastImportRows[0]?.importedAt ?? null,
  };
}

function statusText(state: SetupState) {
  if (state === "complete") return "Complete";
  if (state === "attention") return "Needs setup";
  return "Add over time";
}

function statusClassName(state: SetupState) {
  if (state === "complete") return "border-[var(--green)] text-[var(--green)]";
  if (state === "attention") return "border-[var(--accent)] text-[var(--accent)]";
  return "border-[var(--hairline)] text-[var(--muted)]";
}

function formatImportSummary({
  importCount,
  tradeCount,
  lastImportedAt,
}: {
  importCount: number;
  tradeCount: number;
  lastImportedAt: Date | null;
}) {
  if (tradeCount <= 0 && importCount <= 0) return "No broker data imported yet.";

  const tradeCopy = tradeCount === 1 ? "1 trade" : `${tradeCount} trades`;
  if (!lastImportedAt) return `${tradeCopy} imported.`;

  return `${tradeCopy} imported. Last import ${lastImportedAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}.`;
}

function SettingsNav() {
  const items = [
    ["setup", "Setup"],
    ["imports", "Imports"],
    ["coach", "AI Coach"],
    ["rules", "Rules"],
    ["accounts", "Accounts"],
    ["data", "Data"],
    ["preferences", "Preferences"],
  ] as const;

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-2">
        <div className="px-3 pb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--faint)]">
          Settings
        </div>
        <nav className="grid gap-1">
          {items.map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}

function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 border-t border-[var(--border)] pt-7">
      <div>
        <h2 className="text-base font-semibold text-[var(--foreground)]">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SetupRow({
  title,
  description,
  state,
  href,
  action,
}: {
  title: string;
  description: string;
  state: SetupState;
  href: string;
  action: string;
}) {
  return (
    <div className="grid gap-4 border-t border-[var(--hairline)] py-4 first:border-t-0 md:grid-cols-[1fr_auto] md:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>
          <span
            className={[
              "rounded-sm border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.16em]",
              statusClassName(state),
            ].join(" ")}
          >
            {statusText(state)}
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-[var(--body)]">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex h-10 items-center justify-center rounded-md border border-[var(--border)] px-4 text-sm font-semibold text-[var(--muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--foreground)]"
      >
        {action}
      </Link>
    </div>
  );
}

export default async function SettingsPage() {
  if (isDemoReadOnly()) redirect("/journal");

  const accounts = await listAccounts();
  const activeAccount = await getActiveAccount(accounts);
  const [playbook, importStatus] = await Promise.all([
    ensureCoachPlaybook(activeAccount.id),
    loadImportStatus(activeAccount.id),
  ]);
  const showDevReset = process.env.NODE_ENV !== "production";
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim();
  const openAiConfigured = Boolean(openAiApiKey && openAiApiKey !== "your_openai_key_here");
  const openAiModel = process.env.OPENAI_MODEL?.trim() || "gpt-5.5";
  const hasImportedTrades = importStatus.tradeCount > 0 || importStatus.importCount > 0;
  const hasPlaybook = playbook.body.trim().length > 0 && playbook.rubric.trim().length > 0;

  return (
    <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[180px_minmax(0,1fr)]">
      <SettingsNav />
      <main className="min-w-0 space-y-12">
        <section className="space-y-2">
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Setup control center
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            Settings
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
            Get the journal useful first: import broker data, connect the AI coach, then
            add rules and setups as your process gets sharper.
          </p>
        </section>

        <SettingsSection
          id="setup"
          title="First-run Setup"
          description="The app works best once these pieces are in place. Rules can stay lightweight at first and grow from your journal notes."
        >
          <div className="border-y border-[var(--border)]">
            <SetupRow
              title="Import broker statement"
              description={formatImportSummary(importStatus)}
              state={hasImportedTrades ? "complete" : "attention"}
              href="/import"
              action={hasImportedTrades ? "Import more" : "Start import"}
            />
            <SetupRow
              title="Connect AI coach"
              description={
                openAiConfigured
                  ? `OpenAI / ChatGPT is configured with ${openAiModel}.`
                  : "Add a model provider so coach reviews can run locally from your app."
              }
              state={openAiConfigured ? "complete" : "attention"}
              href="#coach"
              action={openAiConfigured ? "Review" : "Connect"}
            />
            <SetupRow
              title="Add rules and setups"
              description={
                hasPlaybook
                  ? `${playbook.title} is ready. Keep adding setups as they show up in notes.`
                  : "Start with rough rules now, then capture setups from notes as they appear."
              }
              state={hasPlaybook ? "complete" : "later"}
              href="#rules"
              action={hasPlaybook ? "Open" : "Add rules"}
            />
          </div>
        </SettingsSection>

        <SettingsSection
          id="imports"
          title="Imports"
          description="Bring in broker files, refresh your trade history, and keep unsupported broker mapping visible as a next step."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/import"
              className="rounded-md border border-[var(--border)] px-4 py-4 transition-colors hover:border-[var(--accent)]"
            >
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Broker data
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                Import statement
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--body)]">
                Upload DAS or ThinkorSwim CSV files. Re-importing the same file is safe.
              </p>
            </Link>
            <div className="rounded-md border border-[var(--border)] px-4 py-4">
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Adapter path
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--foreground)]">
                Unsupported broker
              </div>
              <p className="mt-1 text-sm leading-6 text-[var(--body)]">
                Next pass: use AI to inspect a file shape and draft a broker adapter.
              </p>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection
          id="coach"
          title="AI Coach"
          description="Keep model setup compact by default. Open it only when you need to add or change a provider."
        >
          <CoachModelSettings
            status={{
              openAiConfigured,
              openAiModel,
            }}
          />
        </SettingsSection>

        <SettingsSection
          id="rules"
          title="Rules & Playbook"
          description="The coach needs your standards, but this should evolve naturally from the review workflow and notes."
        >
          <CoachPlaybookSettings
            playbook={{
              title: playbook.title,
              body: playbook.body,
              rubric: playbook.rubric,
            }}
          />
        </SettingsSection>

        <SettingsSection
          id="accounts"
          title="Accounts"
          description="Manage account names and the selected account used by imports, journals, reports, and trade views."
        >
          <AccountSettings accounts={accounts} activeAccountId={activeAccount.id} />
        </SettingsSection>

        <SettingsSection
          id="data"
          title="Data"
          description="Export your trade history for spreadsheets, backups, or testing another trading journal."
        >
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/export/trades"
              className="inline-flex h-10 items-center rounded-md bg-[var(--foreground)] px-4 text-sm font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
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
        </SettingsSection>

        <SettingsSection
          id="preferences"
          title="Preferences"
          description="Lower-priority app comfort settings live here after the setup-critical work."
        >
          <ThemeSettings />
        </SettingsSection>
      </main>
    </div>
  );
}
