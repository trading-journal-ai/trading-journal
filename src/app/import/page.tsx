import ImportForm from "@/components/ImportForm";

export default function ImportPage() {
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Upload a <strong>ThinkorSwim Account Statement</strong> CSV. Fills are
          parsed from the <em>Account Trade History</em> section, deduped, and
          grouped into trades. Re-importing the same statement is safe.
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
