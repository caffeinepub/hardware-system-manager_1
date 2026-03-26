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
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Edit2,
  FileSpreadsheet,
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
import type { Seat } from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import { useActor } from "../hooks/useActor";
import {
  useCreateSeat,
  useDeleteSeat,
  useGetAllDevices,
  useGetAllSeats,
  useGetAllSections,
  useUpdateSeat,
} from "../hooks/useQueries";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SystemRow {
  seatId: string;
  seatNumber: string;
  currentUser: string;
  sectionId: string;
  systemType: string; // "Micro Computer" | "All-in-One PC" | "Desktop"
  cpuSerial: string;
  cpuModel: string;
  monitorSerial: string;
  monitorModel: string;
  ip1: string;
  ip2: string;
  remarks: string;
}

const emptyForm = () => ({
  sectionId: "",
  seatNumber: "",
  currentUser: "",
  cpuSerial: "",
  monitorSerial: "",
  ip1: "",
  ip2: "",
  remarks: "",
});

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

const normalizeSectionName = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/\bd\s+i\b/g, "d1")
    .replace(/\bd\s+ii\b/g, "d2")
    .replace(/\bd\s+iii\b/g, "d3")
    .replace(/\bd\s+iv\b/g, "d4")
    .replace(/\bd\s+v\b/g, "d5")
    .replace(/\s+/g, "");

const getSeatRank = (seat: string) => {
  const s = (seat || "").trim().toLowerCase();
  if (s === "so") return 0;
  const num = Number.parseInt(s, 10);
  if (!Number.isNaN(num)) return 1000 + num;
  if (s.includes("computer assistant") || s.includes("ca")) return 9000;
  return 10000;
};

export default function Computers() {
  const { isLoggedIn } = useAdmin();
  const { data: seats = [], isLoading: seatsLoading } = useGetAllSeats();
  const { data: devices = [], isLoading: devicesLoading } = useGetAllDevices();
  const { data: sections = [] } = useGetAllSections();
  const createSeat = useCreateSeat();
  const updateSeat = useUpdateSeat();
  const deleteSeat = useDeleteSeat();
  const { actor, isFetching: isActorFetching } = useActor();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSeat, setEditingSeat] = useState<Seat | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  // ---- Data Import state ----
  const CSV_IMPORT_HEADERS = [
    "Section Name",
    "Seat Number",
    "Current User",
    "CPU Serial Number",
    "Monitor Serial Number",
    "IP 1",
    "IP 2",
    "Remarks",
  ];
  const [importRows, setImportRows] = useState<
    Array<{
      sectionName: string;
      seat: string;
      currentUser: string;
      cpuSerial: string;
      monitorSerial: string;
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

  function parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') inQuotes = !inQuotes;
      else if (char === "," && !inQuotes) {
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
          monitorSerial: (cols[4] ?? "").trim(),
          ip1: (cols[5] ?? "").trim(),
          ip2: (cols[6] ?? "").trim(),
          remarks: (cols[7] ?? "").trim(),
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
    const blob = new Blob([`${CSV_IMPORT_HEADERS.join(",")}\n`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "computers_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadExportCSV = () => {
    const rows = systemRows.map((r, i) =>
      [
        i + 1,
        sections.find((s) => s.id === r.sectionId)?.name ?? "",
        r.seatNumber,
        r.currentUser,
        r.systemType,
        r.cpuSerial,
        r.cpuModel,
        r.monitorSerial,
        r.monitorModel,
        r.ip1,
        r.ip2,
        r.remarks,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const header = [
      "Sl No",
      "Section",
      "Seat",
      "Current User",
      "System Type",
      "CPU Serial",
      "CPU Model",
      "Monitor Serial",
      "Monitor Model",
      "IP1",
      "IP2",
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
        const key = row.sectionName.toLowerCase();
        let sectionId = sectionMap.get(key);
        if (!sectionId && row.sectionName) {
          const newId = crypto.randomUUID();
          await (actor as any).createSection({
            id: newId,
            name: row.sectionName,
            description: "",
            location: "",
            createdAt: BigInt(Date.now()),
          });
          sectionId = newId;
          sectionMap.set(key, newId);
        }
        if (!sectionId) {
          errors++;
          setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
          continue;
        }
        await createSeat.mutateAsync({
          id: crypto.randomUUID(),
          sectionId,
          seatNumber: row.seat,
          currentUser: row.currentUser,
          cpuSerial: row.cpuSerial,
          monitorSerial: row.monitorSerial,
          ip1: row.ip1,
          ip2: row.ip2,
          remarks: row.remarks,
          createdAt: BigInt(Date.now()),
        });
        successes++;
      } catch {
        errors++;
      }
      setImportProgress(Math.round(((i + 1) / importRows.length) * 100));
    }
    setImportSuccess(successes);
    setImportErrors(errors);
    setIsImporting(false);
    setImportDone(true);
    if (errors === 0) toast.success(`${successes} seats imported`);
    else toast.error(`Import: ${successes} ok, ${errors} failed`);
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

  // ─── Build system rows from Seat + Device data ───────────────────────────────
  const deviceBySerial = new Map(devices.map((d) => [d.serialNumber, d]));

  const systemRows: SystemRow[] = seats.map((seat) => {
    const cpuDev = deviceBySerial.get(seat.cpuSerial);
    const monitorDev = deviceBySerial.get(seat.monitorSerial);

    // Determine system type — also search for Micro Computer by component serial
    const microDev =
      cpuDev?.deviceType === "Micro Computer"
        ? cpuDev
        : devices.find(
            (d) =>
              d.deviceType === "Micro Computer" &&
              (d.cpuSerialNumber === seat.cpuSerial ||
                d.serialNumber === seat.cpuSerial),
          );

    let systemType = "Desktop";
    let cpuSerial = seat.cpuSerial;
    let monitorSerial = seat.monitorSerial;
    let cpuModel = cpuDev?.makeAndModel ?? "";
    const monitorModel = monitorDev?.makeAndModel ?? "";

    if (microDev) {
      systemType = "Micro Computer";
      cpuSerial = microDev.cpuSerialNumber || seat.cpuSerial;
      monitorSerial = microDev.monitorSerialNumber || seat.monitorSerial;
      cpuModel = microDev.makeAndModel;
    } else if (cpuDev?.deviceType === "All-in-One PC") {
      systemType = "All-in-One PC";
    }

    return {
      seatId: seat.id,
      seatNumber: seat.seatNumber,
      currentUser: seat.currentUser,
      sectionId: seat.sectionId,
      systemType,
      cpuSerial,
      cpuModel,
      monitorSerial,
      monitorModel,
      ip1: seat.ip1,
      ip2: seat.ip2,
      remarks: seat.remarks,
    };
  });

  // ─── Group and sort ───────────────────────────────────────────────────────────
  const grouped = systemRows.reduce<Record<string, SystemRow[]>>((acc, row) => {
    const key = row.sectionId || "__unassigned__";
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const sectionsSorted = [...sections].sort((a, b) => {
    const ai = SECTION_ORDER.indexOf(normalizeSectionName(a.name));
    const bi = SECTION_ORDER.indexOf(normalizeSectionName(b.name));
    return (ai === -1 ? 9999 : ai) - (bi === -1 ? 9999 : bi);
  });

  const orderedKeys = [
    ...sectionsSorted.map((s) => s.id).filter((id) => grouped[id]),
    ...(grouped.__unassigned__ ? ["__unassigned__"] : []),
  ];

  const getSectionLabel = (key: string) =>
    key === "__unassigned__"
      ? "Unassigned"
      : (sections.find((s) => s.id === key)?.name ?? key);

  const sortBySeats = (rows: SystemRow[]) =>
    [...rows].sort((a, b) => {
      const ra = getSeatRank(a.seatNumber);
      const rb = getSeatRank(b.seatNumber);
      return ra !== rb ? ra - rb : a.seatNumber.localeCompare(b.seatNumber);
    });

  const isLoading = seatsLoading || devicesLoading;

  // ─── Add/Edit form ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingSeat(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row: SystemRow) => {
    const seat = seats.find((s) => s.id === row.seatId);
    if (!seat) return;
    setEditingSeat(seat);
    setForm({
      sectionId: seat.sectionId,
      seatNumber: seat.seatNumber,
      currentUser: seat.currentUser,
      cpuSerial: seat.cpuSerial,
      monitorSerial: seat.monitorSerial,
      ip1: seat.ip1,
      ip2: seat.ip2,
      remarks: seat.remarks,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.sectionId) {
      toast.error("Section is required");
      return;
    }
    const seatData: Seat = {
      id: editingSeat?.id ?? crypto.randomUUID(),
      sectionId: form.sectionId,
      seatNumber: form.seatNumber,
      currentUser: form.currentUser,
      cpuSerial: form.cpuSerial,
      monitorSerial: form.monitorSerial,
      ip1: form.ip1,
      ip2: form.ip2,
      remarks: form.remarks,
      createdAt: editingSeat?.createdAt ?? BigInt(Date.now()),
    };
    try {
      if (editingSeat) {
        await updateSeat.mutateAsync(seatData);
        toast.success("Seat updated");
      } else {
        await createSeat.mutateAsync(seatData);
        toast.success("Seat added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteSeat.mutateAsync(deletingId);
      toast.success("Seat removed");
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete");
    }
  };

  const isPending = createSeat.isPending || updateSeat.isPending;

  const SYSTEM_TYPE_COLORS: Record<string, string> = {
    "Micro Computer": "bg-cyan-100 text-cyan-700 border-cyan-200",
    "All-in-One PC": "bg-violet-100 text-violet-700 border-violet-200",
    Desktop: "bg-blue-100 text-blue-700 border-blue-200",
  };

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="computers.section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Computers
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Seat-wise system view — one row per workstation
          </p>
        </div>
        {isLoggedIn && (
          <Button
            onClick={openAdd}
            size="sm"
            className="gap-2"
            data-ocid="computers.primary_button"
          >
            <Plus className="w-4 h-4" /> Add Seat
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
            </div>
          ))}
        </div>
      ) : systemRows.length === 0 ? (
        <div
          className="rounded-xl border border-border bg-card shadow-card flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
          data-ocid="computers.empty_state"
        >
          <Monitor className="w-12 h-12 opacity-30" />
          <p className="font-display font-semibold">No systems found</p>
          <p className="text-sm">
            {isLoggedIn
              ? "Import stock data or add a seat to get started"
              : "No computers have been assigned yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orderedKeys.map((sectionKey, sectionIdx) => {
            const rows = sortBySeats(grouped[sectionKey]);
            const label = getSectionLabel(sectionKey);
            return (
              <div
                key={sectionKey}
                className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
                data-ocid={`computers.card.${sectionIdx + 1}`}
              >
                <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary opacity-70" />
                  <h3 className="font-display font-bold text-base text-foreground tracking-tight">
                    {label}
                  </h3>
                  <span className="ml-auto text-xs text-muted-foreground font-medium">
                    {rows.length} {rows.length === 1 ? "system" : "systems"}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <Table data-ocid="computers.table">
                    <TableHeader>
                      <TableRow className="bg-muted/20">
                        <TableHead className="font-display text-xs uppercase tracking-wide w-12">
                          Sl No
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          Seat
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          Current User
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          System Type
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          CPU / Main Serial
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          CPU / Main Model
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          Monitor Serial
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          Monitor Model
                        </TableHead>
                        <TableHead className="font-display text-xs uppercase tracking-wide">
                          IP
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
                      {rows.map((row, idx) => {
                        const isMicro = row.systemType === "Micro Computer";
                        const isAIO = row.systemType === "All-in-One PC";
                        return (
                          <TableRow
                            key={row.seatId}
                            data-ocid={`computers.row.${idx + 1}`}
                            className="transition-colors hover:bg-muted/20"
                          >
                            <TableCell className="text-xs text-muted-foreground font-medium text-center">
                              {idx + 1}
                            </TableCell>
                            <TableCell className="text-sm font-medium">
                              {row.seatNumber || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.currentUser || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  SYSTEM_TYPE_COLORS[row.systemType] ??
                                    SYSTEM_TYPE_COLORS.Desktop,
                                )}
                              >
                                {row.systemType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {row.cpuSerial ? (
                                row.cpuSerial
                              ) : isAIO ? (
                                <span className="text-muted-foreground/60">
                                  —
                                </span>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-orange-500 border-orange-300"
                                >
                                  CPU Missing
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.cpuModel || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {isMicro || isAIO ? (
                                isMicro && row.monitorSerial ? (
                                  row.monitorSerial
                                ) : (
                                  <span className="text-muted-foreground/60">
                                    —
                                  </span>
                                )
                              ) : row.monitorSerial ? (
                                row.monitorSerial
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-orange-500 border-orange-300"
                                >
                                  Monitor Missing
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">
                              {row.monitorModel || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {row.ip1 || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                              {row.remarks || "—"}
                            </TableCell>
                            {isLoggedIn && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => openEdit(row)}
                                    data-ocid={`computers.edit_button.${idx + 1}`}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 hover:text-destructive"
                                    onClick={() => {
                                      setDeletingId(row.seatId);
                                      setDeleteDialogOpen(true);
                                    }}
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

      {/* ─── Computer Asset Data Import / Export ─── */}
      <div className="mt-8 space-y-4" data-ocid="computers.import.section">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-display font-bold text-foreground">
              Computer Asset Data Import / Export
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bulk import seat records from CSV or export current data
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={downloadImportTemplate}
            >
              <Download className="w-4 h-4" /> Download Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={downloadExportCSV}
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
                    <X className="w-4 h-4" /> Clear
                  </Button>
                  {importDone ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={resetImport}
                    >
                      <RefreshCw className="w-4 h-4" /> Import Another
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
          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center text-muted-foreground">
            <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="font-semibold">Login required to import data</p>
            <p className="text-sm mt-1">
              Log in as Admin or User to use the import feature.
            </p>
          </div>
        )}
      </div>

      {/* ─── Add/Edit Seat Dialog ─── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="computers.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingSeat ? "Edit Seat" : "Add Seat"}
            </DialogTitle>
            <DialogDescription>
              {editingSeat
                ? "Update seat details. Serial numbers can be managed from the Stock page."
                : "Add a new seat assignment. Link it to devices already in Stock by serial number."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Section *</Label>
              <Select
                value={form.sectionId}
                onValueChange={(v) => setForm((f) => ({ ...f, sectionId: v }))}
              >
                <SelectTrigger data-ocid="computers.select">
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
              <Label>Seat Number</Label>
              <Input
                placeholder="e.g. 1, SO, CA"
                value={form.seatNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, seatNumber: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Current User</Label>
              <Input
                placeholder="e.g. John Doe"
                value={form.currentUser}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currentUser: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>CPU / Micro Computer Serial Number</Label>
              <Select
                value={form.cpuSerial || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    cpuSerial: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger data-ocid="computers.select">
                  <SelectValue placeholder="Select standby CPU / Micro Computer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None / Clear —</SelectItem>
                  {devices
                    .filter(
                      (d) =>
                        (d.deviceType === "CPU" ||
                          d.deviceType === "Micro Computer") &&
                        (!d.sectionId || d.sectionId === ""),
                    )
                    .map((d) => (
                      <SelectItem key={d.serialNumber} value={d.serialNumber}>
                        {d.serialNumber} — {d.makeAndModel || d.deviceType}
                      </SelectItem>
                    ))}
                  {form.cpuSerial &&
                    form.cpuSerial !== "__none__" &&
                    !devices.find(
                      (d) =>
                        d.serialNumber === form.cpuSerial &&
                        (d.deviceType === "CPU" ||
                          d.deviceType === "Micro Computer") &&
                        (!d.sectionId || d.sectionId === ""),
                    ) && (
                      <SelectItem value={form.cpuSerial}>
                        Current: {form.cpuSerial}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
              {form.cpuSerial && form.cpuSerial !== "__none__" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {devices.find((d) => d.serialNumber === form.cpuSerial)
                    ?.makeAndModel || ""}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Monitor Serial Number</Label>
              <Select
                value={form.monitorSerial || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    monitorSerial: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger data-ocid="computers.select">
                  <SelectValue placeholder="Select standby Monitor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— None / Clear —</SelectItem>
                  {devices
                    .filter(
                      (d) =>
                        d.deviceType === "Monitor" &&
                        (!d.sectionId || d.sectionId === ""),
                    )
                    .map((d) => (
                      <SelectItem key={d.serialNumber} value={d.serialNumber}>
                        {d.serialNumber} — {d.makeAndModel || d.deviceType}
                      </SelectItem>
                    ))}
                  {form.monitorSerial &&
                    form.monitorSerial !== "__none__" &&
                    !devices.find(
                      (d) =>
                        d.serialNumber === form.monitorSerial &&
                        d.deviceType === "Monitor" &&
                        (!d.sectionId || d.sectionId === ""),
                    ) && (
                      <SelectItem value={form.monitorSerial}>
                        Current: {form.monitorSerial}
                      </SelectItem>
                    )}
                </SelectContent>
              </Select>
              {form.monitorSerial && form.monitorSerial !== "__none__" && (
                <p className="text-xs text-muted-foreground mt-1">
                  {devices.find((d) => d.serialNumber === form.monitorSerial)
                    ?.makeAndModel || ""}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>IP Address</Label>
              <Input
                placeholder="e.g. 192.168.1.100"
                value={form.ip1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ip1: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>IP Address 2</Label>
              <Input
                placeholder="optional"
                value={form.ip2}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ip2: e.target.value }))
                }
                data-ocid="computers.input"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Remarks</Label>
              <Input
                placeholder="optional"
                value={form.remarks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remarks: e.target.value }))
                }
                data-ocid="computers.input"
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
              {editingSeat ? "Update" : "Add"} Seat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="computers.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Remove Seat?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the seat assignment. The devices will remain in
              Stock.
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
              {deleteSeat.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
