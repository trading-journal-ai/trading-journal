import ImportForm from "@/components/ImportForm";
import { canImportData } from "@/lib/demoMode";

export default function ImportPage() {
  const showImport = canImportData();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Import</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          {showImport
            ? "Upload a CSV file. Fills are parsed, deduped, and grouped into trades. Re-importing the same file is safe. Supported formats include ThinkorSwim account statements and DAS trade-summary exports."
            : "This hosted demo is read-only and uses simulated paper-trading data. Download the app to import your own CSV data locally."}
        </p>
      </div>
      {showImport ? <ImportForm /> : null}
    </div>
  );
}
