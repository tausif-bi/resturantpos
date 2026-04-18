"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importMenuFromExcel, type ImportResult } from "@/lib/actions/menu-import";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function MenuImportDialog({ open, onOpenChange }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setFile(null);
    setDryRun(true);
    setResult(null);
  }

  function handleClose(v: boolean) {
    if (!v && !isPending) reset();
    onOpenChange(v);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      toast.error("Please select a .xlsx file first");
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("dryRun", dryRun ? "true" : "false");
    startTransition(async () => {
      try {
        const res = await importMenuFromExcel(fd);
        setResult(res);
        if (res.dryRun) {
          if (res.errors.length === 0) {
            toast.success("Preview looks good — uncheck dry-run and upload to commit");
          } else {
            toast.error(`Preview found ${res.errors.length} issue${res.errors.length === 1 ? "" : "s"}`);
          }
        } else {
          toast.success("Menu imported successfully");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Import failed");
      }
    });
  }

  const summary = result?.totals;
  const errors = result?.errors ?? [];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Import Menu from Excel</DialogTitle>
          <DialogDescription>
            Upload a multi-sheet workbook (Categories, Items, Variants, AddOns, Taxes).
            Items are matched by <code className="bg-surface-container px-1 rounded">ItemCode</code>,
            so re-uploading updates existing items.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          <div className="flex items-center justify-between bg-surface-container-low rounded-lg p-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="material-symbols-outlined text-tertiary">download</span>
              <span className="font-medium text-on-surface">Need the template?</span>
            </div>
            <a
              href="/templates/menu-import-template.xlsx"
              download
              className="text-xs font-bold text-tertiary hover:underline"
            >
              Download .xlsx
            </a>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-on-surface">Excel file</label>
            <label className="flex items-center gap-3 px-4 py-6 border-2 border-dashed border-outline-variant/40 rounded-xl cursor-pointer hover:border-primary transition-colors">
              <span className="material-symbols-outlined text-primary text-3xl">
                {file ? "description" : "upload_file"}
              </span>
              <div className="flex-1 min-w-0">
                {file ? (
                  <>
                    <p className="font-bold text-on-surface truncate">{file.name}</p>
                    <p className="text-xs text-secondary">
                      {(file.size / 1024).toFixed(1)} KB · click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-on-surface">Click to select a .xlsx file</p>
                    <p className="text-xs text-secondary">Max 10 MB</p>
                  </>
                )}
              </div>
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setResult(null);
                }}
                className="hidden"
                disabled={isPending}
              />
            </label>
          </div>

          <label className="flex items-start gap-3 bg-surface-container-low rounded-lg p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="mt-0.5 accent-primary w-4 h-4"
              disabled={isPending}
            />
            <div className="text-sm">
              <p className="font-bold text-on-surface">Dry run (preview only)</p>
              <p className="text-xs text-secondary">
                Validate the file and show what would change, without writing to the database.
                Uncheck to commit.
              </p>
            </div>
          </label>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleClose(false)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-outline-variant/30 text-on-surface hover:bg-surface-container disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={!file || isPending}
              className="px-5 py-2 text-sm font-bold rounded-lg primary-gradient text-white shadow disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="material-symbols-outlined text-base animate-spin">
                    progress_activity
                  </span>
                  {dryRun ? "Validating..." : "Importing..."}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">
                    {dryRun ? "science" : "upload"}
                  </span>
                  {dryRun ? "Run preview" : "Import now"}
                </>
              )}
            </button>
          </div>
        </form>

        {summary && (
          <div className="mt-6 border-t pt-5 space-y-4">
            <div className="flex items-center gap-2">
              {errors.length === 0 ? (
                <>
                  <span className="material-symbols-outlined text-green-600">check_circle</span>
                  <h4 className="font-headline font-bold text-on-surface">
                    {result.dryRun ? "Preview — no issues found" : "Import complete"}
                  </h4>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-error">error</span>
                  <h4 className="font-headline font-bold text-on-surface">
                    {errors.length} issue{errors.length === 1 ? "" : "s"} found
                  </h4>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <SummaryRow label="Categories" created={summary.categoriesCreated} updated={summary.categoriesUpdated} />
              <SummaryRow label="Taxes" created={summary.taxesCreated} updated={summary.taxesUpdated} />
              <SummaryRow label="Items" created={summary.itemsCreated} updated={summary.itemsUpdated} />
              <SummaryRow label="Variants" created={summary.variantsCreated} />
              <SummaryRow label="Add-ons" created={summary.addOnsCreated} />
            </div>

            {errors.length > 0 && (
              <div className="bg-error/5 border border-error/30 rounded-lg p-3 max-h-60 overflow-y-auto">
                <p className="text-xs font-bold text-error mb-2 uppercase tracking-wide">Errors</p>
                <ul className="space-y-1.5 text-xs text-on-surface">
                  {errors.slice(0, 100).map((e, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="font-mono text-error shrink-0">
                        {e.sheet}:R{e.row}
                      </span>
                      <span>
                        {e.field ? <strong>{e.field}: </strong> : null}
                        {e.message}
                      </span>
                    </li>
                  ))}
                  {errors.length > 100 && (
                    <li className="italic text-secondary">... and {errors.length - 100} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SummaryRow({
  label,
  created,
  updated,
}: {
  label: string;
  created: number;
  updated?: number;
}) {
  return (
    <div className="bg-surface-container-low rounded-lg px-3 py-2">
      <p className="text-xs font-bold uppercase tracking-wide text-secondary">{label}</p>
      <div className="flex items-baseline gap-3 mt-0.5">
        <span className="font-headline font-extrabold text-lg text-on-surface">{created}</span>
        <span className="text-[10px] font-bold text-green-700 uppercase">new</span>
        {updated != null && (
          <>
            <span className="font-headline font-extrabold text-lg text-tertiary">{updated}</span>
            <span className="text-[10px] font-bold text-tertiary uppercase">updated</span>
          </>
        )}
      </div>
    </div>
  );
}
