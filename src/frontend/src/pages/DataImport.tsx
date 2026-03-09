import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  LogIn,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Computer } from "../backend";
import { Variant_active_standby_retired } from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import { useActor } from "../hooks/useActor";
import {
  useCreateComputer,
  useCreateSection,
  useGetAllSections,
} from "../hooks/useQueries";

const CSV_HEADERS = [
  "Section Name",
  "Seat",
  "Current User Name",
  "CPU Serial Number",
  "CPU Model",
  "Monitor Serial Number",
  "Monitor Model",
  "IP 1",
  "IP 2",
  "Remarks",
];

interface ParsedRow {
  sectionName: string;
  seat: string;
  currentUser: string;
  cpuSerial: string;
  cpuModel: string;
  monitorSerial: string;
  monitorModel: string;
  ip1: string;
  ip2: string;
  remarks: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  // skip header row
  const dataLines = lines.slice(1);
  return dataLines
    .map((line) => {
      // Basic CSV parse: split by comma (handles quoted values minimally)
      const cols = parseCSVLine(line);
      return {
        sectionName: (cols[0] ?? "").trim(),
        seat: (cols[1] ?? "").trim(),
        currentUser: (cols[2] ?? "").trim(),
        cpuSerial: (cols[3] ?? "").trim(),
        cpuModel: (cols[4] ?? "").trim(),
        monitorSerial: (cols[5] ?? "").trim(),
        monitorModel: (cols[6] ?? "").trim(),
        ip1: (cols[7] ?? "").trim(),
        ip2: (cols[8] ?? "").trim(),
        remarks: (cols[9] ?? "").trim(),
      };
    })
    .filter(
      (r) =>
        r.sectionName || r.cpuSerial || r.seat || r.currentUser || r.cpuModel,
    );
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

function downloadTemplate() {
  const csvContent = `${CSV_HEADERS.join(",")}\n`;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "device_import_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function DataImport() {
  const { isLoggedIn } = useAdmin();
  const { actor, isFetching: isActorFetching } = useActor();
  const { data: sections = [] } = useGetAllSections();
  const createSectionMutation = useCreateSection();
  const createComputerMutation = useCreateComputer();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a .csv file");
      return;
    }
    const text = await file.text();
    const rows = parseCSV(text);
    setParsedRows(rows);
    setFileName(file.name);
    setImportDone(false);
    setProgress(0);
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
    if (!isLoggedIn) {
      toast.error("Please log in first to import data");
      return;
    }

    if (isActorFetching || !actor) {
      toast.error("Backend not ready — please wait a moment and try again");
      return;
    }

    if (parsedRows.length === 0) return;

    setIsImporting(true);
    setProgress(0);

    // Build a fresh section map from current data + any we create
    const sectionMap = new Map<string, string>(
      sections.map((s) => [s.name.toLowerCase(), s.id]),
    );

    let successes = 0;
    let errors = 0;
    let firstError: unknown = null;

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      try {
        // Resolve or create section
        const sectionKey = row.sectionName.toLowerCase();
        let sectionId = sectionMap.get(sectionKey);

        if (!sectionId && row.sectionName) {
          const newId = crypto.randomUUID();
          await createSectionMutation.mutateAsync({
            id: newId,
            name: row.sectionName,
            description: "",
            location: "",
            createdAt: BigInt(Date.now()),
          });
          sectionId = newId;
          sectionMap.set(sectionKey, newId);
        }

        if (!sectionId) {
          errors++;
          if (!firstError)
            firstError = new Error(`Row ${i + 1}: missing section name`);
          setProgress(Math.round(((i + 1) / parsedRows.length) * 100));
          continue;
        }

        const computer: Computer = {
          id: crypto.randomUUID(),
          sectionId,
          seatNumber: row.seat,
          currentUser: row.currentUser,
          serialNumber: row.cpuSerial,
          model: row.cpuModel,
          brand: "",
          companyName: "",
          amcCompany: "",
          monitorSerial: row.monitorSerial,
          monitorModel: row.monitorModel,
          ip1: row.ip1,
          ip2: row.ip2,
          remarks: row.remarks,
          purchaseDate: BigInt(0),
          amcStartDate: BigInt(0),
          amcEndDate: BigInt(0),
          status: Variant_active_standby_retired.active,
          notes: "",
          createdAt: BigInt(Date.now()),
        };

        await createComputerMutation.mutateAsync(computer);
        successes++;
      } catch (err) {
        errors++;
        if (!firstError) firstError = err;
        if (errors <= 3) {
          console.error(`Import row ${i + 1} error:`, err);
        }
      }

      setProgress(Math.round(((i + 1) / parsedRows.length) * 100));
    }

    await queryClient.invalidateQueries({ queryKey: ["computers"] });
    await queryClient.invalidateQueries({ queryKey: ["sections"] });

    setSuccessCount(successes);
    setErrorCount(errors);
    setIsImporting(false);
    setImportDone(true);

    if (errors === 0) {
      toast.success(`${successes} devices imported successfully`);
    } else if (successes === 0) {
      toast.error(
        `Import failed — all ${errors} rows encountered errors. Make sure you are logged in and the data is correct.`,
      );
    } else {
      toast.error(`Import done: ${successes} succeeded, ${errors} failed`);
    }
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName("");
    setImportDone(false);
    setProgress(0);
    setSuccessCount(0);
    setErrorCount(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (!isLoggedIn) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 rounded-xl border-2 border-dashed border-border text-muted-foreground gap-5"
        data-ocid="import.section"
      >
        <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
          <FileSpreadsheet className="w-8 h-8 text-muted-foreground/50" />
        </div>
        <div className="text-center space-y-1">
          <p className="font-display font-bold text-xl text-foreground">
            Login Required
          </p>
          <p className="text-sm text-muted-foreground max-w-xs">
            You need to be logged in as Admin or User to import device data.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => navigate({ to: "/login" })}
            className="gap-2"
            data-ocid="import.primary_button"
          >
            <LogIn className="w-4 h-4" />
            Go to User Login
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/admin" })}
            className="gap-2"
            data-ocid="import.secondary_button"
          >
            <LogIn className="w-4 h-4" />
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="import.section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Data Import
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Upload a CSV file to bulk-import device records into the system
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 flex-shrink-0"
          onClick={downloadTemplate}
          data-ocid="import.secondary_button"
        >
          <Download className="w-4 h-4" />
          Download Template
        </Button>
      </div>

      {/* CSV Format info */}
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Expected CSV Columns
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CSV_HEADERS.map((h) => (
            <Badge key={h} variant="outline" className="text-xs font-mono-data">
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
        aria-label="Upload CSV file"
        data-ocid="import.dropzone"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileInput}
          data-ocid="import.upload_button"
        />
        <div className="flex flex-col items-center justify-center py-12 gap-3 pointer-events-none">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Upload
              className={`w-6 h-6 ${isDragging ? "text-primary" : "text-primary/60"}`}
            />
          </div>
          {fileName ? (
            <>
              <p className="font-display font-semibold text-foreground">
                {fileName}
              </p>
              <p className="text-sm text-muted-foreground">
                {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""}{" "}
                found — click to replace
              </p>
            </>
          ) : (
            <>
              <p className="font-display font-semibold text-foreground">
                Drop your CSV file here
              </p>
              <p className="text-sm text-muted-foreground">
                or click to browse — .csv files only
              </p>
            </>
          )}
        </div>
      </button>

      {/* Progress / results */}
      {isImporting && (
        <div
          className="rounded-xl border border-border bg-card p-5 space-y-3"
          data-ocid="import.loading_state"
        >
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="font-semibold text-sm text-foreground">
              Importing… {progress}%
            </p>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-muted-foreground">
            Processing {parsedRows.length} rows — please wait
          </p>
        </div>
      )}

      {importDone && !isImporting && (
        <div
          className={`rounded-xl border p-5 space-y-2 ${
            errorCount === 0
              ? "border-green-200 bg-green-50"
              : "border-yellow-200 bg-yellow-50"
          }`}
          data-ocid={
            errorCount === 0 ? "import.success_state" : "import.error_state"
          }
        >
          <div className="flex items-center gap-2">
            {errorCount === 0 ? (
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
              {successCount} imported successfully
            </span>
            {errorCount > 0 && (
              <>
                {" "}
                &mdash;{" "}
                <span className="text-red-600 font-semibold">
                  {errorCount} rows failed
                </span>
              </>
            )}
          </p>
          {errorCount > 0 && (
            <p className="text-xs text-yellow-700 mt-1">
              Some rows failed to import. Make sure you are logged in and the
              CSV data is correct, then try again.
            </p>
          )}
        </div>
      )}

      {/* Preview table */}
      {parsedRows.length > 0 && !isImporting && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">
              Preview —{" "}
              <span className="text-primary">
                {parsedRows.length} rows found
              </span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={handleReset}
                disabled={isImporting}
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
                >
                  <RefreshCw className="w-4 h-4" />
                  Import Another
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={handleImport}
                  disabled={
                    isImporting || parsedRows.length === 0 || isActorFetching
                  }
                  data-ocid="import.primary_button"
                >
                  {isImporting || isActorFetching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isActorFetching
                    ? "Connecting…"
                    : `Import ${parsedRows.length} Rows`}
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
                    {CSV_HEADERS.map((h) => (
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
                  {parsedRows.map((row, idx) => (
                    <TableRow
                      key={`row-${idx + 1}-${row.cpuSerial}-${row.seat}`}
                      data-ocid={`import.row.${idx + 1}`}
                      className="hover:bg-muted/20"
                    >
                      <TableCell className="text-xs text-muted-foreground font-mono-data">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.sectionName || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.seat || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.currentUser || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono-data text-xs text-muted-foreground whitespace-nowrap">
                        {row.cpuSerial || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.cpuModel || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono-data text-xs text-muted-foreground whitespace-nowrap">
                        {row.monitorSerial || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {row.monitorModel || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono-data text-xs whitespace-nowrap">
                        {row.ip1 || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono-data text-xs whitespace-nowrap">
                        {row.ip2 || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                        {row.remarks || (
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

      {/* Empty state */}
      {parsedRows.length === 0 && !fileName && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          <p>
            Download the template above, fill in your device data, then upload
            it here.
          </p>
        </div>
      )}
    </div>
  );
}
