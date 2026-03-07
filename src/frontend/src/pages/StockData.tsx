import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Building2,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  Loader2,
  Monitor,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Computer } from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import { useActor } from "../hooks/useActor";
import { useGetAllComputers, useGetAllSections } from "../hooks/useQueries";
import { formatDate, getAMCStatus } from "../utils/formatters";

// ─── Datasheet CSV ────────────────────────────────────────────────────────────

const AMC_SHEET_HEADERS = [
  "Company Name",
  "CPU SL No",
  "Monitor SL No",
  "AMC Start Date",
  "AMC Expiry Date",
  "AMC Company",
];

interface AmcRow {
  companyName: string;
  cpuSlNo: string;
  monitorSlNo: string;
  amcStartDate: string;
  amcExpiryDate: string;
  amcCompany: string;
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
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function parseAmcCSV(text: string): AmcRow[] {
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
        companyName: (cols[0] ?? "").trim(),
        cpuSlNo: (cols[1] ?? "").trim(),
        monitorSlNo: (cols[2] ?? "").trim(),
        amcStartDate: (cols[3] ?? "").trim(),
        amcExpiryDate: (cols[4] ?? "").trim(),
        amcCompany: (cols[5] ?? "").trim(),
      };
    })
    .filter((r) => r.cpuSlNo);
}

/**
 * Parse date strings in DD/MM/YYYY or YYYY-MM-DD format to bigint ms.
 */
function parseDateToBigInt(dateStr: string): bigint {
  if (!dateStr) return BigInt(0);
  // Try DD/MM/YYYY
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const ms = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    return BigInt(Number.isNaN(ms) ? 0 : ms);
  }
  // Try YYYY-MM-DD
  const ms = new Date(dateStr).getTime();
  return BigInt(Number.isNaN(ms) ? 0 : ms);
}

function downloadAmcTemplate() {
  const csvContent = `${AMC_SHEET_HEADERS.join(",")}\n`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "amc_datasheet_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StockData() {
  const { isLoggedIn } = useAdmin();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const { data: computers = [], isLoading: computersLoading } =
    useGetAllComputers();
  const { data: sections = [], isLoading: sectionsLoading } =
    useGetAllSections();

  const [filterSection, setFilterSection] = useState<string>("all");

  // Datasheet upload state
  const [amcRows, setAmcRows] = useState<AmcRow[]>([]);
  const [amcFileName, setAmcFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLoading = computersLoading || sectionsLoading;

  const sectionName = (id: string) =>
    sections.find((s) => s.id === id)?.name ?? id;

  const filtered =
    filterSection === "all"
      ? computers
      : computers.filter((c) => c.sectionId === filterSection);

  // How many rows match existing computers by CPU SL No
  const matchedCount = amcRows.filter((row) =>
    computers.some(
      (c) => c.serialNumber.toLowerCase() === row.cpuSlNo.toLowerCase(),
    ),
  ).length;

  // File handling
  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a .csv file");
      return;
    }
    const text = await file.text();
    const rows = parseAmcCSV(text);
    setAmcRows(rows);
    setAmcFileName(file.name);
    setImportDone(false);
    setImportProgress(0);
    setSuccessCount(0);
    setErrorCount(0);
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

  const handleImport = async () => {
    if (!actor || amcRows.length === 0) return;
    setIsImporting(true);
    setImportProgress(0);

    let successes = 0;
    let errors = 0;

    for (let i = 0; i < amcRows.length; i++) {
      const row = amcRows[i];
      const matched = computers.find(
        (c) => c.serialNumber.toLowerCase() === row.cpuSlNo.toLowerCase(),
      );
      if (!matched) {
        // No match — skip
        setImportProgress(Math.round(((i + 1) / amcRows.length) * 100));
        continue;
      }

      try {
        const updated: Computer = {
          ...matched,
          companyName: row.companyName,
          monitorSerial: row.monitorSlNo || matched.monitorSerial,
          amcStartDate: parseDateToBigInt(row.amcStartDate),
          amcEndDate: parseDateToBigInt(row.amcExpiryDate),
          amcCompany: row.amcCompany,
          datasheetBlob: undefined,
        };
        await actor.updateComputer(updated);
        successes++;
      } catch {
        errors++;
      }

      setImportProgress(Math.round(((i + 1) / amcRows.length) * 100));
    }

    await queryClient.invalidateQueries({ queryKey: ["computers"] });

    setSuccessCount(successes);
    setErrorCount(errors);
    setIsImporting(false);
    setImportDone(true);

    if (errors === 0 && successes > 0) {
      toast.success(`${successes} records updated successfully`);
    } else if (successes === 0) {
      toast.error("No matching computers found. Check CPU SL No values.");
    } else {
      toast.error(`Updated ${successes}, ${errors} failed`);
    }
  };

  const handleReset = () => {
    setAmcRows([]);
    setAmcFileName("");
    setImportDone(false);
    setImportProgress(0);
    setSuccessCount(0);
    setErrorCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="stock.section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Stock Data
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Default CPU &amp; Monitor pairs per seat, with AMC datasheet upload
          </p>
        </div>
        <div className="flex-shrink-0 w-full sm:w-56">
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger data-ocid="stock.select">
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── AMC Datasheet Upload ─────────────────────────────────────── */}
      {isLoggedIn && (
        <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
          {/* Section header */}
          <div className="px-5 py-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-semibold text-base text-foreground">
                AMC Datasheet Upload
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upload a CSV to update AMC details — matched by CPU SL No
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 flex-shrink-0"
              onClick={downloadAmcTemplate}
              data-ocid="stock.secondary_button"
            >
              <Download className="w-4 h-4" />
              Download Template
            </Button>
          </div>

          <div className="p-5 space-y-4">
            {/* Expected columns */}
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                CSV Columns
              </p>
              <div className="flex flex-wrap gap-1.5">
                {AMC_SHEET_HEADERS.map((h) => (
                  <Badge
                    key={h}
                    variant="outline"
                    className="text-xs font-mono-data"
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
              aria-label="Upload AMC datasheet CSV"
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
                {amcFileName ? (
                  <>
                    <p className="font-display font-semibold text-foreground">
                      {amcFileName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {amcRows.length} row{amcRows.length !== 1 ? "s" : ""}{" "}
                      parsed &mdash;{" "}
                      <span className="text-primary font-medium">
                        {matchedCount} matched
                      </span>{" "}
                      — click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display font-semibold text-foreground">
                      Drop AMC datasheet here
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
                    Updating… {importProgress}%
                  </p>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            {/* Import result */}
            {importDone && !isImporting && (
              <div
                className={`rounded-xl border p-4 space-y-1 ${
                  errorCount === 0 && successCount > 0
                    ? "border-green-200 bg-green-50"
                    : "border-yellow-200 bg-yellow-50"
                }`}
                data-ocid={
                  errorCount === 0 && successCount > 0
                    ? "stock.success_state"
                    : "stock.error_state"
                }
              >
                <div className="flex items-center gap-2">
                  {errorCount === 0 && successCount > 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                  )}
                  <p className="font-display font-semibold text-sm">
                    Import Complete
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">
                  <span className="text-green-700 font-semibold">
                    {successCount} updated
                  </span>
                  {errorCount > 0 && (
                    <>
                      {" — "}
                      <span className="text-red-600 font-semibold">
                        {errorCount} errors
                      </span>
                    </>
                  )}
                  {amcRows.length - matchedCount > 0 && (
                    <>
                      {" — "}
                      <span className="text-muted-foreground">
                        {amcRows.length - matchedCount} unmatched (skipped)
                      </span>
                    </>
                  )}
                </p>
              </div>
            )}

            {/* Preview table */}
            {amcRows.length > 0 && !isImporting && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">
                    Preview —{" "}
                    <span className="text-primary">
                      {matchedCount} of {amcRows.length} rows matched
                    </span>
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
                        disabled={isImporting || matchedCount === 0}
                        data-ocid="stock.primary_button"
                      >
                        {isImporting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        Import {matchedCount} Matched
                      </Button>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                            #
                          </TableHead>
                          <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                            Match
                          </TableHead>
                          {AMC_SHEET_HEADERS.map((h) => (
                            <TableHead
                              key={h}
                              className="font-display text-xs uppercase tracking-wide whitespace-nowrap"
                            >
                              {h}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {amcRows.map((row, idx) => {
                          const isMatched = computers.some(
                            (c) =>
                              c.serialNumber.toLowerCase() ===
                              row.cpuSlNo.toLowerCase(),
                          );
                          return (
                            <TableRow
                              key={`amc-row-${idx + 1}`}
                              data-ocid={`stock.row.${idx + 1}`}
                              className={
                                isMatched
                                  ? "hover:bg-muted/20"
                                  : "opacity-50 hover:bg-muted/10"
                              }
                            >
                              <TableCell className="text-xs text-muted-foreground font-mono-data">
                                {idx + 1}
                              </TableCell>
                              <TableCell>
                                {isMatched ? (
                                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="w-4 h-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {row.companyName || (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono-data text-xs text-muted-foreground whitespace-nowrap">
                                {row.cpuSlNo || (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="font-mono-data text-xs text-muted-foreground whitespace-nowrap">
                                {row.monitorSlNo || (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {row.amcStartDate || (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {row.amcExpiryDate || (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {row.amcCompany || (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stock Cards ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          data-ocid="stock.loading_state"
        >
          {["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"].map((sk) => (
            <Skeleton key={sk} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border text-muted-foreground gap-4"
          data-ocid="stock.empty_state"
        >
          <Database className="w-12 h-12 opacity-30" />
          <p className="font-display font-semibold text-lg text-foreground">
            No stock data
          </p>
          <p className="text-sm text-center max-w-xs">
            {filterSection !== "all"
              ? "No computers registered in this section"
              : "Import devices or add computers to see stock data here"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((computer, idx) => {
            const amcStatus = getAMCStatus(computer.amcEndDate);
            const amcDateStr = formatDate(computer.amcEndDate);
            const hasAmcDate =
              computer.amcEndDate && computer.amcEndDate > BigInt(0);

            return (
              <div
                key={computer.id}
                className="rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all hover:shadow-card-hover hover:border-primary/30"
                data-ocid={`stock.item.${idx + 1}`}
              >
                {/* Card top — section + status */}
                <div className="px-4 py-3 bg-gradient-to-r from-primary/8 to-transparent border-b border-border flex items-center justify-between gap-2">
                  <Badge
                    variant="outline"
                    className="text-xs font-medium truncate max-w-[160px]"
                  >
                    {sectionName(computer.sectionId)}
                  </Badge>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border status-badge-${computer.status}`}
                  >
                    {computer.status}
                  </span>
                </div>

                {/* Seat + user */}
                <div className="px-4 pt-4 pb-2 text-center border-b border-border/50">
                  <p className="text-2xl font-display font-bold text-foreground">
                    Seat {computer.seatNumber || "—"}
                  </p>
                  <sub className="text-xs text-muted-foreground mt-0.5 block not-italic">
                    {computer.currentUser || "Unassigned"}
                  </sub>
                </div>

                {/* Company name */}
                {computer.companyName && (
                  <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <p className="text-xs font-medium text-foreground truncate">
                      {computer.companyName}
                    </p>
                  </div>
                )}

                {/* CPU + Monitor */}
                <div className="px-4 py-3 grid grid-cols-2 gap-3">
                  {/* CPU */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Cpu className="w-3.5 h-3.5" />
                      CPU
                    </div>
                    <p className="font-mono-data text-xs text-foreground truncate">
                      {computer.serialNumber || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {computer.model || "—"}
                    </p>
                  </div>

                  {/* Monitor */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      <Monitor className="w-3.5 h-3.5" />
                      Monitor
                    </div>
                    <p className="font-mono-data text-xs text-foreground truncate">
                      {computer.monitorSerial || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {computer.monitorModel || "—"}
                    </p>
                  </div>
                </div>

                {/* AMC Info */}
                {(hasAmcDate || computer.amcCompany) && (
                  <div className="px-4 pb-3 space-y-1.5 border-t border-border/50 pt-2.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      AMC
                    </p>
                    {computer.amcCompany && (
                      <p className="text-xs text-foreground truncate">
                        {computer.amcCompany}
                      </p>
                    )}
                    {hasAmcDate && (
                      <p
                        className={`text-xs font-medium ${
                          amcStatus === "expired"
                            ? "text-red-600"
                            : amcStatus === "expiring"
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}
                      >
                        {amcStatus === "expired"
                          ? "Expired: "
                          : amcStatus === "expiring"
                            ? "Expiring: "
                            : "Valid until: "}
                        {amcDateStr}
                      </p>
                    )}
                  </div>
                )}

                {/* IPs */}
                {(computer.ip1 || computer.ip2) && (
                  <div className="px-4 pb-3 flex flex-wrap gap-2">
                    {computer.ip1 && (
                      <span className="font-mono-data text-xs bg-muted/60 text-foreground px-2 py-0.5 rounded-md border border-border">
                        {computer.ip1}
                      </span>
                    )}
                    {computer.ip2 && (
                      <span className="font-mono-data text-xs bg-muted/60 text-foreground px-2 py-0.5 rounded-md border border-border">
                        {computer.ip2}
                      </span>
                    )}
                  </div>
                )}

                {/* Remarks */}
                {computer.remarks && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      {computer.remarks}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
