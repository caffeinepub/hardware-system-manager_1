import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  Loader2,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAdmin } from "../contexts/AdminContext";
import { useActor } from "../hooks/useActor";
import {
  useCreateStockEntry,
  useDeleteStockEntry,
  useGetAllStockEntries,
} from "../hooks/useQueries";
import { formatDate, getAMCStatus } from "../utils/formatters";

// ─── CSV Template ─────────────────────────────────────────────────────────────

const STOCK_CSV_HEADERS = [
  "Company & Model",
  "CPU Sl No",
  "Monitor Sl No",
  "AMC Start Date",
  "AMC Expiry Date",
  "AMC Team",
];

interface StockRow {
  companyAndModel: string;
  cpuSlNo: string;
  monitorSlNo: string;
  amcStartDate: string;
  amcExpiryDate: string;
  amcTeam: string;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function parseStockCSV(text: string): StockRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  return lines
    .slice(1)
    .map((line) => {
      const cols = parseCSVLine(line);
      return {
        companyAndModel: (cols[0] ?? "").trim(),
        cpuSlNo: (cols[1] ?? "").trim(),
        monitorSlNo: (cols[2] ?? "").trim(),
        amcStartDate: (cols[3] ?? "").trim(),
        amcExpiryDate: (cols[4] ?? "").trim(),
        amcTeam: (cols[5] ?? "").trim(),
      };
    })
    .filter((r) => r.cpuSlNo || r.companyAndModel);
}

function parseDateToBigInt(dateStr: string): bigint {
  if (!dateStr) return BigInt(0);
  // Try DD/MM/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const ms = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    return BigInt(Number.isNaN(ms) ? 0 : ms);
  }
  // Try YYYY-MM-DD or other ISO formats
  const ms = new Date(dateStr).getTime();
  return BigInt(Number.isNaN(ms) ? 0 : ms);
}

function downloadStockTemplate() {
  const rows = [
    STOCK_CSV_HEADERS.join(","),
    "HP EliteDesk 800 G5,SN123456789,MON987654321,01/04/2024,31/03/2025,TechAMC Solutions",
  ];
  const csvContent = rows.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "stock_data_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── AMC Badge ────────────────────────────────────────────────────────────────

function AmcExpiryBadge({ date }: { date: bigint }) {
  if (!date || date === BigInt(0)) {
    return <span className="text-muted-foreground">—</span>;
  }
  const status = getAMCStatus(date);
  const label = formatDate(date);
  const cls =
    status === "expired"
      ? "bg-red-100 text-red-700 border-red-200"
      : status === "expiring"
        ? "bg-amber-100 text-amber-700 border-amber-200"
        : "bg-green-100 text-green-700 border-green-200";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}
    >
      {label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StockData() {
  const { isLoggedIn } = useAdmin();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const { data: stockEntries = [], isLoading } = useGetAllStockEntries();
  const createMutation = useCreateStockEntry();
  const deleteMutation = useDeleteStockEntry();

  // CSV upload state
  const [csvRows, setCsvRows] = useState<StockRow[]>([]);
  const [csvFileName, setCsvFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [updatedCount, setUpdatedCount] = useState(0);
  const [standbyCount, setStandbyCount] = useState(0);
  const [importErrors, setImportErrors] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Sorted entries by slNo
  const sortedEntries = [...stockEntries].sort((a, b) =>
    Number(a.slNo) < Number(b.slNo) ? -1 : 1,
  );

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please select a .csv file");
      return;
    }
    const text = await file.text();
    const rows = parseStockCSV(text);
    setCsvRows(rows);
    setCsvFileName(file.name);
    setImportDone(false);
    setImportProgress(0);
    setSavedCount(0);
    setUpdatedCount(0);
    setStandbyCount(0);
    setImportErrors(0);
    if (rows.length === 0) {
      toast.error("No data rows found in CSV");
    } else {
      toast.success(`${rows.length} rows parsed from ${file.name}`);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!actor || csvRows.length === 0) return;
    setIsImporting(true);
    setImportProgress(0);

    let saved = 0;
    let errors = 0;

    // Save each row as a StockEntry
    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      try {
        const entry = {
          id: crypto.randomUUID(),
          createdAt: BigInt(Date.now()),
          slNo: BigInt(i + 1),
          companyAndModel: row.companyAndModel,
          cpuSlNo: row.cpuSlNo,
          monitorSlNo: row.monitorSlNo,
          amcStartDate: parseDateToBigInt(row.amcStartDate),
          amcExpiryDate: parseDateToBigInt(row.amcExpiryDate),
          amcTeam: row.amcTeam,
        };
        await createMutation.mutateAsync(entry);
        saved++;
      } catch {
        errors++;
      }
      setImportProgress(Math.round(((i + 1) / csvRows.length) * 100));
    }

    // After saving entries, call processStockEntries to update computers & standby
    let updComputers = 0;
    let addedStandby = 0;
    if (saved > 0) {
      try {
        const result = await actor.processStockEntries();
        updComputers = Number(result.updated);
        addedStandby = Number(result.addedToStandby);
      } catch {
        // non-fatal
      }
    }

    // Invalidate all affected queries
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["stock-entries"] }),
      queryClient.invalidateQueries({ queryKey: ["computers"] }),
      queryClient.invalidateQueries({ queryKey: ["standby"] }),
    ]);

    setSavedCount(saved);
    setUpdatedCount(updComputers);
    setStandbyCount(addedStandby);
    setImportErrors(errors);
    setIsImporting(false);
    setImportDone(true);

    if (errors === 0 && saved > 0) {
      toast.success(
        `${saved} entries saved, ${updComputers} computers updated, ${addedStandby} added to standby`,
      );
    } else if (saved === 0) {
      toast.error("Import failed. Check your CSV format.");
    } else {
      toast.error(`${saved} saved, ${errors} failed`);
    }
  };

  const handleReset = () => {
    setCsvRows([]);
    setCsvFileName("");
    setImportDone(false);
    setImportProgress(0);
    setSavedCount(0);
    setUpdatedCount(0);
    setStandbyCount(0);
    setImportErrors(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success("Entry deleted");
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="stock.section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Stock Data
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            CPU &amp; Monitor inventory with AMC details — upload a data sheet
            to populate
          </p>
        </div>
        {isLoggedIn && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 flex-shrink-0"
            onClick={downloadStockTemplate}
            data-ocid="stock.secondary_button"
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>
        )}
      </div>

      {/* ── CSV Upload (logged-in only) ──────────────────────────────────── */}
      {isLoggedIn && (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          {/* Upload header */}
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold text-base text-foreground">
                Upload Stock Data Sheet
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                CSV columns:{" "}
                <span className="font-mono text-foreground/70">
                  {STOCK_CSV_HEADERS.join(", ")}
                </span>
              </p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* CSV column badges */}
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Expected CSV Columns
              </p>
              <div className="flex flex-wrap gap-1.5">
                {STOCK_CSV_HEADERS.map((h) => (
                  <Badge
                    key={h}
                    variant="outline"
                    className="text-xs font-mono"
                  >
                    {h}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <button
              type="button"
              className={`w-full text-left relative rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                isDragging
                  ? "border-primary bg-primary/5 scale-[1.01]"
                  : "border-border hover:border-primary/50 hover:bg-muted/20"
              }`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload stock data CSV"
              data-ocid="stock.dropzone"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileInput}
                data-ocid="stock.upload_button"
              />
              <div className="flex flex-col items-center justify-center py-8 gap-3 pointer-events-none">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Upload
                    className={`w-5 h-5 ${isDragging ? "text-primary" : "text-primary/60"}`}
                  />
                </div>
                {csvFileName ? (
                  <>
                    <p className="font-display font-semibold text-foreground">
                      {csvFileName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {csvRows.length} row{csvRows.length !== 1 ? "s" : ""}{" "}
                      parsed — click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display font-semibold text-foreground">
                      Drop stock data sheet here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse — .csv files only
                    </p>
                  </>
                )}
              </div>
            </button>

            {/* Import progress */}
            {isImporting && (
              <div
                className="rounded-xl border border-border bg-card p-4 space-y-3"
                data-ocid="stock.loading_state"
              >
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  <p className="font-semibold text-sm text-foreground">
                    Saving entries… {importProgress}%
                  </p>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            {/* Import result summary */}
            {importDone && !isImporting && (
              <div
                className={`rounded-xl border p-4 space-y-2 ${
                  importErrors === 0 && savedCount > 0
                    ? "border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-900"
                    : "border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900"
                }`}
                data-ocid={
                  importErrors === 0 && savedCount > 0
                    ? "stock.success_state"
                    : "stock.error_state"
                }
              >
                <div className="flex items-center gap-2">
                  {importErrors === 0 && savedCount > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  )}
                  <p className="font-display font-semibold text-sm">
                    Import Complete
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="text-green-700 dark:text-green-400 font-semibold">
                    {savedCount} entries saved
                  </span>
                  <span className="text-blue-700 dark:text-blue-400 font-semibold">
                    {updatedCount} computers updated
                  </span>
                  <span className="text-purple-700 dark:text-purple-400 font-semibold">
                    {standbyCount} added to standby
                  </span>
                  {importErrors > 0 && (
                    <span className="text-red-600 font-semibold">
                      {importErrors} errors
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Preview + action buttons */}
            {csvRows.length > 0 && !isImporting && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    Preview —{" "}
                    <span className="text-primary">{csvRows.length} rows</span>
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground"
                      onClick={handleReset}
                      disabled={isImporting}
                      data-ocid="stock.cancel_button"
                    >
                      <X className="w-4 h-4" />
                      Clear
                    </Button>
                    {importDone ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-2"
                        onClick={handleReset}
                        data-ocid="stock.secondary_button"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Upload Another
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="gap-2"
                        onClick={handleImport}
                        disabled={isImporting || csvRows.length === 0}
                        data-ocid="stock.primary_button"
                      >
                        <Upload className="w-4 h-4" />
                        Import {csvRows.length} Entries
                      </Button>
                    )}
                  </div>
                </div>

                {/* Preview table */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                            #
                          </TableHead>
                          {STOCK_CSV_HEADERS.map((h) => (
                            <TableHead
                              key={h}
                              className="text-xs uppercase tracking-wide whitespace-nowrap"
                            >
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {csvRows.map((row, idx) => (
                          <TableRow
                            key={`preview-${idx + 1}`}
                            data-ocid={`stock.row.${idx + 1}`}
                            className="hover:bg-muted/20"
                          >
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {row.companyAndModel || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {row.cpuSlNo || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                              {row.monitorSlNo || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {row.amcStartDate || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {row.amcExpiryDate || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {row.amcTeam || (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stock List ───────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-base text-foreground">
              Stock Register
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {sortedEntries.length} entr
              {sortedEntries.length !== 1 ? "ies" : "y"} recorded
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3" data-ocid="stock.loading_state">
            {[1, 2, 3, 4, 5].map((n) => (
              <Skeleton key={n} className="h-10 rounded-lg w-full" />
            ))}
          </div>
        ) : sortedEntries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4"
            data-ocid="stock.empty_state"
          >
            <Database className="w-12 h-12 opacity-30" />
            <p className="font-display font-semibold text-lg text-foreground">
              No stock entries yet
            </p>
            <p className="text-sm text-center max-w-xs">
              {isLoggedIn
                ? "Upload a stock data sheet above to populate this register"
                : "Log in to upload stock data"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap w-14">
                    Sl No
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                    Company &amp; Model
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                    CPU Sl No
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                    Monitor Sl No
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                    AMC Start Date
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                    AMC Expiry Date
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                    AMC Team
                  </TableHead>
                  {isLoggedIn && (
                    <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap w-12">
                      {/* Actions */}
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEntries.map((entry, idx) => (
                  <TableRow
                    key={entry.id}
                    data-ocid={`stock.item.${idx + 1}`}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {Number(entry.slNo)}
                    </TableCell>
                    <TableCell className="text-sm font-medium text-foreground whitespace-nowrap max-w-[200px] truncate">
                      {entry.companyAndModel || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {entry.cpuSlNo || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                      {entry.monitorSlNo || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {entry.amcStartDate && entry.amcStartDate > BigInt(0) ? (
                        <span className="text-foreground">
                          {formatDate(entry.amcStartDate)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      <AmcExpiryBadge date={entry.amcExpiryDate} />
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {entry.amcTeam || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    {isLoggedIn && (
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => openDelete(entry.id)}
                          data-ocid={`stock.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="stock.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete Stock Entry?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this entry from the stock register.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="stock.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="stock.confirm_button"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
