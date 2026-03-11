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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import type { Computer } from "../backend";
import type { Variant_active_standby_retired } from "../backend";
import { ExternalBlob } from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import { useActor } from "../hooks/useActor";
import {
  useCreateComputer,
  useCreateSection,
  useDeleteComputer,
  useGetAllComputers,
  useGetAllSections,
  useUpdateComputer,
} from "../hooks/useQueries";
import {
  bigIntToDateStr,
  dateToBigInt,
  getAMCStatus,
} from "../utils/formatters";

const emptyForm = () => ({
  sectionId: "",
  seatNumber: "",
  currentUser: "",
  serialNumber: "",
  model: "",
  brand: "",
  companyName: "",
  amcCompany: "",
  monitorSerial: "",
  monitorModel: "",
  ip1: "",
  ip2: "",
  remarks: "",
  purchaseDate: "",
  amcStartDate: "",
  amcEndDate: "",
  status: "active" as "active" | "standby" | "retired",
  notes: "",
});

export default function Computers() {
  const { isLoggedIn } = useAdmin();
  const { data: computers = [], isLoading } = useGetAllComputers();
  const { data: sections = [] } = useGetAllSections();
  const createComputerMutation = useCreateComputer();
  const updateMutation = useUpdateComputer();
  const deleteMutation = useDeleteComputer();
  const createSectionMutation = useCreateSection();
  const { actor, isFetching: isActorFetching } = useActor();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingComputer, setEditingComputer] = useState<Computer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // ---- Data Import state ----
  const [importRows, setImportRows] = useState<
    Array<{
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
    }>
  >([]);
  const [importFileName, setImportFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [importSuccess, setImportSuccess] = useState(0);
  const [importErrors, setImportErrors] = useState(0);
  const importFileRef = useRef<HTMLInputElement>(null);

  const CSV_IMPORT_HEADERS = [
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

  const handleImportFile = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      toast.error("Please select a .csv file");
      return;
    }
    const text = await file.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      toast.error("No data rows found in CSV");
      return;
    }
    const rows = lines
      .slice(1)
      .map((line) => {
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
      .filter((r) => r.sectionName || r.cpuSerial || r.seat);
    setImportRows(rows);
    setImportFileName(file.name);
    setImportDone(false);
    setImportProgress(0);
    setImportSuccess(0);
    setImportErrors(0);
    if (rows.length === 0) toast.error("No valid rows found");
    else toast.success(`${rows.length} rows parsed`);
  };

  const downloadImportTemplate = () => {
    const blob = new Blob(
      [
        `${CSV_IMPORT_HEADERS.join(",")}
`,
      ],
      {
        type: "text/csv;charset=utf-8;",
      },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "device_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadExportCSV = () => {
    const rows = computers.map((c, i) => {
      const sec = sections.find((s) => s.id === c.sectionId);
      return [
        i + 1,
        sec?.name ?? "",
        c.seatNumber,
        c.currentUser,
        c.model,
        c.serialNumber,
        c.monitorModel,
        c.monitorSerial,
        c.ip1,
        c.ip2,
        c.remarks,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(",");
    });
    const header = [
      "Sl No",
      "Section Name",
      "Seat",
      "Current User",
      "CPU Model",
      "CPU Serial",
      "Monitor Model",
      "Monitor Serial",
      "IP 1",
      "IP 2",
      "Remarks",
    ].join(",");
    const blob = new Blob([[header, ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "computers_export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleRunImport = async () => {
    if (!isLoggedIn) {
      toast.error("Please log in first");
      return;
    }
    if (isActorFetching || !actor) {
      toast.error("Backend not ready");
      return;
    }
    if (importRows.length === 0) return;
    setIsImporting(true);
    setImportProgress(0);
    const sectionMap = new Map<string, string>(
      sections.map((s) => [s.name.toLowerCase(), s.id]),
    );
    let successes = 0;
    let errors = 0;
    for (let i = 0; i < importRows.length; i++) {
      const row = importRows[i];
      try {
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
          setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
          continue;
        }
        await createComputerMutation.mutateAsync({
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
          status: "active" as Variant_active_standby_retired,
          notes: "",
          createdAt: BigInt(Date.now()),
        });
        successes++;
      } catch {
        errors++;
      }
      setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
    }
    await queryClient.invalidateQueries({ queryKey: ["computers"] });
    await queryClient.invalidateQueries({ queryKey: ["sections"] });
    setImportSuccess(successes);
    setImportErrors(errors);
    setIsImporting(false);
    setImportDone(true);
    if (errors === 0)
      toast.success(`${successes} devices imported successfully`);
    else toast.error(`Import: ${successes} succeeded, ${errors} failed`);
  };

  const resetImport = () => {
    setImportRows([]);
    setImportFileName("");
    setImportDone(false);
    setImportProgress(0);
    setImportSuccess(0);
    setImportErrors(0);
    if (importFileRef.current) importFileRef.current.value = "";
  };
  // ---- End Data Import state ----

  const openAdd = () => {
    setEditingComputer(null);
    setForm(emptyForm());
    setDatasheetFile(null);
    setUploadProgress(0);
    setDialogOpen(true);
  };

  const openEdit = (computer: Computer) => {
    setEditingComputer(computer);
    setForm({
      sectionId: computer.sectionId,
      seatNumber: computer.seatNumber,
      currentUser: computer.currentUser,
      serialNumber: computer.serialNumber,
      model: computer.model,
      brand: computer.brand,
      companyName: computer.companyName ?? "",
      amcCompany: computer.amcCompany ?? "",
      monitorSerial: computer.monitorSerial,
      monitorModel: computer.monitorModel,
      ip1: computer.ip1,
      ip2: computer.ip2,
      remarks: computer.remarks,
      purchaseDate: bigIntToDateStr(computer.purchaseDate),
      amcStartDate: bigIntToDateStr(computer.amcStartDate),
      amcEndDate: bigIntToDateStr(computer.amcEndDate),
      status: computer.status as "active" | "standby" | "retired",
      notes: computer.notes,
    });
    setDatasheetFile(null);
    setUploadProgress(0);
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.serialNumber.trim() || !form.model.trim() || !form.sectionId) {
      toast.error("Serial number, model, and section are required");
      return;
    }

    let datasheetBlob: ExternalBlob | undefined =
      editingComputer?.datasheetBlob;

    if (datasheetFile) {
      try {
        const bytes = new Uint8Array(await datasheetFile.arrayBuffer());
        datasheetBlob = ExternalBlob.fromBytes(bytes).withUploadProgress(
          (pct) => setUploadProgress(Math.round(pct)),
        );
      } catch {
        toast.error("Failed to prepare datasheet");
        return;
      }
    }

    const computerData: Computer = {
      id: editingComputer?.id ?? crypto.randomUUID(),
      sectionId: form.sectionId,
      seatNumber: form.seatNumber,
      currentUser: form.currentUser,
      serialNumber: form.serialNumber,
      model: form.model,
      brand: form.brand,
      companyName: form.companyName,
      amcCompany: form.amcCompany,
      monitorSerial: form.monitorSerial,
      monitorModel: form.monitorModel,
      ip1: form.ip1,
      ip2: form.ip2,
      remarks: form.remarks,
      purchaseDate: dateToBigInt(form.purchaseDate),
      amcStartDate: dateToBigInt(form.amcStartDate),
      amcEndDate: dateToBigInt(form.amcEndDate),
      status: form.status as Variant_active_standby_retired,
      notes: form.notes,
      datasheetBlob,
      createdAt: editingComputer?.createdAt ?? BigInt(Date.now()),
    };

    try {
      if (editingComputer) {
        await updateMutation.mutateAsync(computerData);
        toast.success("Computer updated");
      } else {
        await createComputerMutation.mutateAsync(computerData);
        toast.success("Computer created");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save computer");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success("Computer deleted");
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete computer");
    }
  };

  const isPending =
    createComputerMutation.isPending || updateMutation.isPending;

  // Fixed section name ordering
  const SECTION_ORDER = [
    "officers",
    "d1",
    "d2",
    "d5",
    "d3",
    "d4",
    "dss",
    "utilities",
  ];

  // Normalize section names: treat roman numeral variants as their numeric equivalents
  const normalizeSectionName = (name: string) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/\bd\s+i\b/g, "d1")
      .replace(/\bd\s+ii\b/g, "d2")
      .replace(/\bd\s+iii\b/g, "d3")
      .replace(/\bd\s+iv\b/g, "d4")
      .replace(/\bd\s+v\b/g, "d5")
      .replace(/\s+/g, ""); // collapse remaining spaces
  };

  // Sort seats: SO first, then numeric ascending, then Computer Assistants, then others
  const sortSeats = (comps: typeof computers) => {
    return [...comps].sort((a, b) => {
      const getSeatRank = (seat: string) => {
        const s = (seat || "").trim().toLowerCase();
        if (s === "so") return 0;
        const num = Number.parseInt(s, 10);
        if (!Number.isNaN(num)) return 1000 + num;
        if (s.includes("computer assistant") || s.includes("ca")) return 9000;
        return 10000;
      };
      const rankA = getSeatRank(a.seatNumber);
      const rankB = getSeatRank(b.seatNumber);
      if (rankA !== rankB) return rankA - rankB;
      return (a.seatNumber || "").localeCompare(b.seatNumber || "");
    });
  };

  // Group computers by section
  const groupedComputers = computers.reduce<Record<string, typeof computers>>(
    (acc, computer) => {
      const key = computer.sectionId || "__unassigned__";
      if (!acc[key]) acc[key] = [];
      acc[key].push(computer);
      return acc;
    },
    {},
  );

  // Build ordered list of section keys by SECTION_ORDER, remaining sections after, then unassigned
  const sectionsSortedByOrder = sections.slice().sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(normalizeSectionName(a.name));
    const bi = SECTION_ORDER.indexOf(normalizeSectionName(b.name));
    const ar = ai === -1 ? 9999 : ai;
    const br = bi === -1 ? 9999 : bi;
    return ar - br;
  });

  const orderedSectionKeys = [
    ...sectionsSortedByOrder
      .map((s) => s.id)
      .filter((id) => groupedComputers[id]),
    ...(groupedComputers.__unassigned__ ? ["__unassigned__"] : []),
  ];

  const getSectionLabel = (key: string) =>
    key === "__unassigned__"
      ? "Unassigned"
      : (sections.find((s) => s.id === key)?.name ?? key);

  const getSectionDescription = (key: string) =>
    key === "__unassigned__"
      ? ""
      : (sections.find((s) => s.id === key)?.description ?? "");

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="computers.section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Computers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage registered computers with AMC details and serial numbers
          </p>
        </div>
        {isLoggedIn && (
          <Button
            onClick={openAdd}
            size="sm"
            className="gap-2"
            data-ocid="computers.primary_button"
          >
            <Plus className="w-4 h-4" />
            Add Computer
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4" data-ocid="computers.loading_state">
          {["sk1", "sk2"].map((sk) => (
            <div
              key={sk}
              className="rounded-xl border border-border bg-card shadow-card p-4 space-y-3"
            >
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      ) : computers.length === 0 ? (
        <div
          className="rounded-xl border border-border bg-card shadow-card flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
          data-ocid="computers.empty_state"
        >
          <Monitor className="w-12 h-12 opacity-30" />
          <p className="font-display font-semibold">No computers registered</p>
          <p className="text-sm">
            {isLoggedIn
              ? "Add the first computer to get started"
              : "No computers have been added yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orderedSectionKeys.map((sectionKey, sectionIdx) => {
            const rawSectionComputers = groupedComputers[sectionKey];
            const sectionComputers = sortSeats(rawSectionComputers);
            const label = getSectionLabel(sectionKey);
            const description = getSectionDescription(sectionKey);
            return (
              <div
                key={sectionKey}
                className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
                data-ocid={`computers.card.${sectionIdx + 1}`}
              >
                {/* Section heading */}
                <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary opacity-70" />
                  <div className="flex flex-col min-w-0">
                    <h3 className="font-display font-bold text-base text-foreground tracking-tight">
                      {label}
                    </h3>
                    {description && (
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                        {description}
                      </p>
                    )}
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground font-medium flex-shrink-0">
                    {sectionComputers.length}{" "}
                    {sectionComputers.length === 1 ? "device" : "devices"}
                  </span>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <Table data-ocid="computers.table">
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="font-display text-xs uppercase tracking-wide w-12">
                          Sl No
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          Seat No
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          Current User
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          CPU Model
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          CPU Serial No
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          Monitor Model
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          Monitor Serial No
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          IP1
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          IP2
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          Remarks
                        </TableHead>
                        {isLoggedIn && (
                          <TableHead className="font-display text-xs uppercase tracking-wide text-right">
                            Actions
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sectionComputers.map((computer, idx) => {
                        const amcStatus = getAMCStatus(computer.amcEndDate);
                        return (
                          <TableRow
                            key={computer.id}
                            data-ocid={`computers.row.${idx + 1}`}
                            className={cn(
                              "transition-colors hover:bg-muted/20",
                              amcStatus === "expired" && "amc-expired",
                              amcStatus === "expiring" && "amc-expiring",
                            )}
                          >
                            <TableCell className="text-xs text-muted-foreground font-medium text-center">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {computer.seatNumber || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {computer.currentUser || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {computer.model || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {computer.serialNumber || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {computer.monitorModel || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {computer.monitorSerial || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {computer.ip1 || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {computer.ip2 || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                              {computer.remarks || "—"}
                            </TableCell>
                            {isLoggedIn && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  {computer.datasheetBlob && (
                                    <a
                                      href={computer.datasheetBlob.getDirectURL()}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                      <FileText className="w-3 h-3" />
                                      Sheet
                                    </a>
                                  )}
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => openEdit(computer)}
                                    data-ocid={`computers.edit_button.${idx + 1}`}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 hover:text-destructive"
                                    onClick={() => openDelete(computer.id)}
                                    data-ocid={`computers.delete_button.${idx + 1}`}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Computer Asset Data Import / Export */}
      <div className="mt-8 space-y-4" data-ocid="computers.import.section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-display font-bold text-foreground">
              Computer Asset Data Import / Export
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bulk import device records from CSV or export current data
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={downloadImportTemplate}
              data-ocid="computers.import.secondary_button"
            >
              <Download className="w-4 h-4" /> Download Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={downloadExportCSV}
              data-ocid="computers.import.secondary_button"
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Expected CSV Columns
          </p>
          <div className="flex flex-wrap gap-1.5">
            {CSV_IMPORT_HEADERS.map((h) => (
              <Badge key={h} variant="outline" className="text-xs font-mono">
                {h}
              </Badge>
            ))}
          </div>
        </div>

        {isLoggedIn ? (
          <>
            <button
              type="button"
              className={`w-full text-left rounded-xl border-2 border-dashed transition-all cursor-pointer ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/20"}`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleImportFile(f);
              }}
              onClick={() => importFileRef.current?.click()}
              data-ocid="computers.import.dropzone"
            >
              <input
                ref={importFileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportFile(f);
                }}
                data-ocid="computers.import.upload_button"
              />
              <div className="flex flex-col items-center justify-center py-10 gap-3 pointer-events-none">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Upload
                    className={`w-5 h-5 ${isDragging ? "text-primary" : "text-primary/60"}`}
                  />
                </div>
                {importFileName ? (
                  <>
                    <p className="font-display font-semibold text-foreground">
                      {importFileName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {importRows.length} rows found — click to replace
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-display font-semibold text-foreground">
                      Drop CSV file here
                    </p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse — .csv files only
                    </p>
                  </>
                )}
              </div>
            </button>

            {isImporting && (
              <div
                className="rounded-xl border border-border bg-card p-4 space-y-2"
                data-ocid="computers.import.loading_state"
              >
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  <p className="text-sm font-semibold">
                    Importing… {importProgress}%
                  </p>
                </div>
                <Progress value={importProgress} className="h-2" />
              </div>
            )}

            {importDone && !isImporting && (
              <div
                className={`rounded-xl border p-4 ${importErrors === 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}`}
                data-ocid={
                  importErrors === 0
                    ? "computers.import.success_state"
                    : "computers.import.error_state"
                }
              >
                <div className="flex items-center gap-2">
                  {importErrors === 0 ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  <p className="font-semibold text-sm">
                    Import Complete —{" "}
                    <span className="text-green-700">
                      {importSuccess} imported
                    </span>
                    {importErrors > 0 && (
                      <span className="text-red-600">
                        , {importErrors} failed
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {importRows.length > 0 && !isImporting && (
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  <span className="text-primary">
                    {importRows.length} rows ready
                  </span>
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-muted-foreground"
                    onClick={resetImport}
                  >
                    <X className="w-4 h-4" />
                    Clear
                  </Button>
                  {importDone ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={resetImport}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Import Another
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={handleRunImport}
                      disabled={isImporting || isActorFetching}
                      data-ocid="computers.import.primary_button"
                    >
                      {isImporting || isActorFetching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isActorFetching
                        ? "Connecting…"
                        : `Import ${importRows.length} Rows`}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div
            className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground"
            data-ocid="computers.import.section"
          >
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-semibold">Login required to import data</p>
            <p className="text-sm mt-1">
              Log in as Admin or User to use the import feature.
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="computers.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingComputer ? "Edit Computer" : "Add New Computer"}
            </DialogTitle>
            <DialogDescription>
              Fill in all required fields. AMC dates and serial number are
              important for tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-serial">Serial Number *</Label>
              <Input
                id="c-serial"
                placeholder="SN-XXXX-YYYY"
                value={form.serialNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, serialNumber: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-model">Model *</Label>
              <Input
                id="c-model"
                placeholder="e.g. ThinkPad X1 Carbon"
                value={form.model}
                onChange={(e) =>
                  setForm((f) => ({ ...f, model: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-brand">Brand</Label>
              <Input
                id="c-brand"
                placeholder="e.g. Lenovo"
                value={form.brand}
                onChange={(e) =>
                  setForm((f) => ({ ...f, brand: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-company">Company Name</Label>
              <Input
                id="c-company"
                placeholder="e.g. Acme Corp"
                value={form.companyName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, companyName: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-amc-company">AMC Company</Label>
              <Input
                id="c-amc-company"
                placeholder="e.g. TechCare Services"
                value={form.amcCompany}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amcCompany: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-section">Section *</Label>
              <Select
                value={form.sectionId}
                onValueChange={(v) => setForm((f) => ({ ...f, sectionId: v }))}
              >
                <SelectTrigger id="c-section" data-ocid="computers.select">
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-seat">Seat Number</Label>
              <Input
                id="c-seat"
                placeholder="e.g. A1, 12"
                value={form.seatNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seatNumber: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-user">Current User</Label>
              <Input
                id="c-user"
                placeholder="e.g. John Doe"
                value={form.currentUser}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currentUser: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-purchase">Purchase Date</Label>
              <Input
                id="c-purchase"
                type="date"
                value={form.purchaseDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, purchaseDate: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: v as "active" | "standby" | "retired",
                  }))
                }
              >
                <SelectTrigger id="c-status" data-ocid="computers.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="standby">Standby</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-amc-start">AMC Start Date</Label>
              <Input
                id="c-amc-start"
                type="date"
                value={form.amcStartDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amcStartDate: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-amc-end">AMC End Date</Label>
              <Input
                id="c-amc-end"
                type="date"
                value={form.amcEndDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amcEndDate: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-mon-serial">Monitor Serial</Label>
              <Input
                id="c-mon-serial"
                placeholder="e.g. MON-12345"
                value={form.monitorSerial}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monitorSerial: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-mon-model">Monitor Model</Label>
              <Input
                id="c-mon-model"
                placeholder="e.g. Dell P2422H"
                value={form.monitorModel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, monitorModel: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-ip1">IP Address 1</Label>
              <Input
                id="c-ip1"
                placeholder="e.g. 192.168.1.100"
                value={form.ip1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ip1: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-ip2">IP Address 2</Label>
              <Input
                id="c-ip2"
                placeholder="e.g. 10.0.0.50"
                value={form.ip2}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ip2: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-remarks">Remarks</Label>
              <Textarea
                id="c-remarks"
                placeholder="Any remarks about this device..."
                rows={2}
                value={form.remarks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remarks: e.target.value }))
                }
                data-ocid="computers.textarea"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-datasheet">Datasheet Upload</Label>
              <label
                htmlFor="c-datasheet-input"
                className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors"
                data-ocid="computers.upload_button"
              >
                <Upload className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {datasheetFile
                    ? datasheetFile.name
                    : editingComputer?.datasheetBlob
                      ? "Replace existing datasheet"
                      : "Upload PDF or image"}
                </span>
              </label>
              <input
                id="c-datasheet-input"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => setDatasheetFile(e.target.files?.[0] ?? null)}
                data-ocid="computers.upload_button"
              />
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
              {editingComputer?.datasheetBlob && !datasheetFile && (
                <a
                  href={editingComputer.datasheetBlob.getDirectURL()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <FileText className="w-3 h-3" />
                  View existing datasheet
                </a>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-notes">Notes</Label>
              <Textarea
                id="c-notes"
                placeholder="Any additional notes..."
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                data-ocid="computers.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="computers.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-ocid="computers.submit_button"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingComputer ? "Update" : "Register"} Computer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="computers.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete Computer?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the computer and all associated
              records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="computers.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="computers.confirm_button"
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
