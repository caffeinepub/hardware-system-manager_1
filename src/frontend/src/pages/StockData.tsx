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
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Database,
  Download,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useAdmin } from "../contexts/AdminContext";
import { useActor } from "../hooks/useActor";
import { formatDate, getAMCStatus } from "../utils/formatters";

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVICE_TYPES = [
  "CPU",
  "Monitor",
  "Micro Computer",
  "All-in-One PC",
  "Printer",
  "Scanner",
  "UPS",
  "Laptop",
  "Biometric Device",
  "Thermal Printer",
  "Franking Machine",
  "Photocopier",
  "Other",
] as const;

const STATUS_OPTIONS = [
  "Available",
  "Working",
  "Issue Reported",
  "e-Waste",
  "Others",
] as const;

const DEVICE_TYPE_COLORS: Record<string, string> = {
  CPU: "bg-blue-100 text-blue-700 border-blue-200",
  Monitor: "bg-purple-100 text-purple-700 border-purple-200",
  "Micro Computer": "bg-cyan-100 text-cyan-700 border-cyan-200",
  "All-in-One PC": "bg-violet-100 text-violet-700 border-violet-200",
  Printer: "bg-green-100 text-green-700 border-green-200",
  Scanner: "bg-teal-100 text-teal-700 border-teal-200",
  UPS: "bg-orange-100 text-orange-700 border-orange-200",
  Laptop: "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Biometric Device": "bg-pink-100 text-pink-700 border-pink-200",
  "Thermal Printer": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Franking Machine": "bg-amber-100 text-amber-700 border-amber-200",
  Photocopier: "bg-gray-100 text-gray-700 border-gray-200",
  Other: "bg-slate-100 text-slate-700 border-slate-200",
};

const STATUS_COLORS: Record<string, string> = {
  Available: "bg-green-100 text-green-700 border-green-200",
  Working: "bg-green-100 text-green-700 border-green-200",
  "Issue Reported": "bg-orange-100 text-orange-700 border-orange-200",
  "e-Waste": "bg-red-100 text-red-700 border-red-200",
  Others: "bg-gray-100 text-gray-700 border-gray-200",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvRow {
  deviceType: string;
  serialNumber: string;
  cpuSerialNumber: string;
  monitorSerialNumber: string;
  makeAndModel: string;
  section: string;
  ipAddress: string;
  status: string;
  amcTeam: string;
  amcStartDate: string;
  amcEndDate: string;
  remarks: string;
}

interface FormState {
  deviceType: string;
  serialNumber: string;
  cpuSerialNumber: string;
  monitorSerialNumber: string;
  makeAndModel: string;
  section: string;
  ipAddress: string;
  status: string;
  amcTeam: string;
  amcStartDate: string;
  amcEndDate: string;
  remarks: string;
}

const EMPTY_FORM: FormState = {
  deviceType: "CPU",
  serialNumber: "",
  cpuSerialNumber: "",
  monitorSerialNumber: "",
  makeAndModel: "",
  section: "",
  ipAddress: "",
  status: "Available",
  amcTeam: "",
  amcStartDate: "",
  amcEndDate: "",
  remarks: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function parseUnifiedCSV(text: string): CsvRow[] {
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
        deviceType: (cols[0] ?? "").trim(),
        serialNumber: (cols[1] ?? "").trim(),
        cpuSerialNumber: (cols[2] ?? "").trim(),
        monitorSerialNumber: (cols[3] ?? "").trim(),
        makeAndModel: (cols[4] ?? "").trim(),
        section: (cols[5] ?? "").trim(),
        ipAddress: (cols[6] ?? "").trim(),
        status: (cols[7] ?? "").trim(),
        amcTeam: (cols[8] ?? "").trim(),
        amcStartDate: (cols[9] ?? "").trim(),
        amcEndDate: (cols[10] ?? "").trim(),
        remarks: (cols[11] ?? "").trim(),
      };
    })
    .filter((r) => r.serialNumber);
}

function parseDateToBigInt(dateStr: string): bigint {
  if (!dateStr) return BigInt(0);
  const dmyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const ms = new Date(Number(y), Number(m) - 1, Number(d)).getTime();
    return BigInt(Number.isNaN(ms) ? 0 : ms);
  }
  const ms = new Date(dateStr).getTime();
  return BigInt(Number.isNaN(ms) ? 0 : ms);
}

function downloadTemplate() {
  const headers = [
    "Device Type",
    "Serial Number",
    "CPU Serial Number",
    "Monitor Serial Number",
    "Make and Model",
    "Section",
    "IP Address",
    "Status",
    "AMC Team",
    "AMC Start Date",
    "AMC End Date",
    "Remarks",
  ];
  const rows = [
    headers.join(","),
    "CPU,SN123456789,,,HP EliteDesk 800 G5,D1,,Available,TechAMC Solutions,01/04/2024,31/03/2025,Main workstation",
    "Monitor,MON987654321,,,Dell P2422H,D1,,Available,TechAMC Solutions,01/04/2024,31/03/2025,",
    "Micro Computer,MC001,CPU-SN-001,MON-SN-001,Dell OptiPlex Micro,D2,,Available,TechAMC Solutions,01/04/2024,31/03/2025,Micro PC with paired monitor",
    "Printer,PRN001,,,HP LaserJet Pro M404n,Officers,,Working,PrintAMC,01/04/2024,31/03/2025,",
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "full_stock_template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportDevicesCSV(devices: any[]) {
  const headers = [
    "Device Type",
    "Serial Number",
    "CPU Serial Number",
    "Monitor Serial Number",
    "Make and Model",
    "Section",
    "IP Address",
    "Status",
    "AMC Team",
    "AMC Start Date",
    "AMC End Date",
    "Remarks",
  ];
  const rows = devices.map((d) => [
    d.deviceType ?? "",
    d.serialNumber ?? "",
    d.cpuSerialNumber ?? "",
    d.monitorSerialNumber ?? "",
    d.makeAndModel ?? d.companyName ?? "",
    d.sectionId ?? "",
    d.ipAddress ?? "",
    d.workingStatus ?? "",
    d.amcTeam ?? "",
    d.amcStartDate && d.amcStartDate > BigInt(0)
      ? formatDate(d.amcStartDate)
      : "",
    d.amcExpiryDate && d.amcExpiryDate > BigInt(0)
      ? formatDate(d.amcExpiryDate)
      : "",
    d.remarks ?? "",
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c: string) => `"${c}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "full_stock_export.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AmcExpiryBadge({ date }: { date: bigint }) {
  if (!date || date === BigInt(0)) {
    return <span className="text-muted-foreground text-xs">—</span>;
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
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}
    >
      {label}
    </span>
  );
}

function DeviceTypeBadge({ type }: { type: string }) {
  const cls =
    DEVICE_TYPE_COLORS[type] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}
    >
      {type}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}
    >
      {status}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StockData() {
  const { isLoggedIn } = useAdmin();
  const { actor, isFetching: actorFetching } = useActor();
  const queryClient = useQueryClient();

  const { data: devices = [], isLoading } = useQuery<any[]>({
    queryKey: ["devices"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllDevices();
    },
    enabled: !!actor && !actorFetching,
  });

  const { data: sections = [] } = useQuery<any[]>({
    queryKey: ["sections"],
    queryFn: async () => {
      if (!actor) return [];
      return (actor as any).getAllSections();
    },
    enabled: !!actor && !actorFetching,
  });

  // CSV upload state
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [importErrors, setImportErrors] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search
  const [search, setSearch] = useState("");

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Add / Edit dialog
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<any | null>(null);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["devices"] });
    queryClient.invalidateQueries({ queryKey: ["computers"] });
    queryClient.invalidateQueries({ queryKey: ["standby"] });
    queryClient.invalidateQueries({ queryKey: ["other-devices"] });
  };

  const resolveSectionId = async (sectionName: string): Promise<string> => {
    if (!sectionName.trim() || !actor) return "";
    const key = sectionName.trim().toLowerCase();
    const existing = sections.find((s: any) => s.name.toLowerCase() === key);
    if (existing) return existing.id;
    const newId = crypto.randomUUID();
    await (actor as any).createSection({
      id: newId,
      name: sectionName.trim(),
      description: "",
      location: "",
      createdAt: BigInt(Date.now()),
    });
    queryClient.invalidateQueries({ queryKey: ["sections"] });
    return newId;
  };

  const getSectionDisplay = (sectionId: string): string => {
    if (!sectionId) return "";
    const found = sections.find((s: any) => s.id === sectionId);
    if (found) return found.name;
    return sectionId;
  };

  const COMPUTER_TYPES_SET = new Set([
    "CPU",
    "Monitor",
    "Micro Computer",
    "All-in-One PC",
  ]);

  const autoCreateSeat = async (
    device: any,
    sectionId: string,
  ): Promise<void> => {
    if (!actor || !sectionId || !COMPUTER_TYPES_SET.has(device.deviceType))
      return;
    try {
      const allSeats: any[] = await (actor as any).getAllSeats();
      const alreadySeated = allSeats.some(
        (s: any) =>
          s.cpuSerial === device.serialNumber ||
          s.monitorSerial === device.serialNumber,
      );
      if (alreadySeated) return;

      let cpuSerial = "";
      let monitorSerial = "";
      if (device.deviceType === "Monitor") {
        monitorSerial = device.serialNumber;
      } else if (device.deviceType === "Micro Computer") {
        cpuSerial = device.cpuSerialNumber || device.serialNumber;
        monitorSerial = device.monitorSerialNumber || "";
      } else {
        cpuSerial = device.serialNumber;
      }

      await (actor as any).createSeat({
        id: crypto.randomUUID(),
        sectionId,
        seatNumber: "",
        currentUser: "",
        cpuSerial,
        monitorSerial,
        ip1: device.ipAddress || "",
        ip2: "",
        remarks: "",
        createdAt: BigInt(Date.now()),
      });
      queryClient.invalidateQueries({ queryKey: ["seats"] });
      queryClient.invalidateQueries({ queryKey: ["computers"] });
    } catch (e) {
      console.warn("autoCreateSeat failed:", e);
    }
  };

  // ── File handling ──────────────────────────────────────────────────────────

  const handleFile = (file: File) => {
    setCsvFileName(file.name);
    setImportDone(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseUnifiedCSV(text);
      setCsvRows(rows);
    };
    reader.readAsText(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.name.endsWith(".csv")) handleFile(file);
  };

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async () => {
    if (!actor || csvRows.length === 0) return;
    setIsImporting(true);
    setImportProgress(0);
    setSavedCount(0);
    setImportErrors(0);

    let saved = 0;
    let errors = 0;

    // Pre-fetch sections to build a name → id map
    let sectionMap = new Map<string, string>(
      sections.map(
        (s: any) => [s.name.toLowerCase(), s.id] as [string, string],
      ),
    );

    const getOrCreateSection = async (name: string): Promise<string> => {
      if (!name.trim()) return "";
      const key = name.trim().toLowerCase();
      if (sectionMap.has(key)) return sectionMap.get(key)!;
      const newId = crypto.randomUUID();
      await (actor as any).createSection({
        id: newId,
        name: name.trim(),
        description: "",
        location: "",
        createdAt: BigInt(Date.now()),
      });
      sectionMap.set(key, newId);
      return newId;
    };

    // Pre-fetch seats to avoid creating duplicates
    let existingSeats: any[] = [];
    try {
      existingSeats = await (actor as any).getAllSeats();
    } catch (_) {}
    const seatedSerials = new Set<string>([
      ...existingSeats.map((s: any) => s.cpuSerial).filter(Boolean),
      ...existingSeats.map((s: any) => s.monitorSerial).filter(Boolean),
    ]);

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      try {
        const sectionId = await getOrCreateSection(row.section);

        const device: any = {
          id: row.serialNumber,
          serialNumber: row.serialNumber,
          deviceType: row.deviceType || "CPU",
          cpuSerialNumber: row.cpuSerialNumber ?? "",
          monitorSerialNumber: row.monitorSerialNumber ?? "",
          makeAndModel: row.makeAndModel,
          companyName: row.makeAndModel,
          amcTeam: row.amcTeam,
          amcStartDate: parseDateToBigInt(row.amcStartDate),
          amcExpiryDate: parseDateToBigInt(row.amcEndDate),
          assignedSeatId: "",
          sectionId,
          workingStatus: row.status || "Available",
          ipAddress: row.ipAddress,
          remarks: row.remarks,
          previousSection: "",
          dateMovedToStandby: BigInt(0),
          createdAt: BigInt(Date.now()),
        };

        // Upsert: try update first, then create
        try {
          await (actor as any).updateDevice(device);
        } catch (_) {
          await (actor as any).createDevice(device);
        }

        // Auto-create seat for computer types with section
        if (
          sectionId &&
          COMPUTER_TYPES_SET.has(row.deviceType) &&
          !seatedSerials.has(row.serialNumber)
        ) {
          let cpuSerial = "";
          let monitorSerial = "";
          if (row.deviceType === "Monitor") {
            monitorSerial = row.serialNumber;
          } else if (row.deviceType === "Micro Computer") {
            cpuSerial = row.cpuSerialNumber || row.serialNumber;
            monitorSerial = row.monitorSerialNumber || "";
          } else {
            cpuSerial = row.serialNumber;
          }
          try {
            await (actor as any).createSeat({
              id: crypto.randomUUID(),
              sectionId,
              seatNumber: "",
              currentUser: "",
              cpuSerial,
              monitorSerial,
              ip1: row.ipAddress || "",
              ip2: "",
              remarks: "",
              createdAt: BigInt(Date.now()),
            });
            seatedSerials.add(row.serialNumber);
          } catch (se) {
            console.warn("Auto-seat creation failed:", se);
          }
        }

        saved++;
      } catch (err) {
        console.error("Import row failed:", err);
        errors++;
      }
      setImportProgress(Math.round(((i + 1) / csvRows.length) * 100));
    }

    setSavedCount(saved);
    setImportErrors(errors);
    setIsImporting(false);
    setImportDone(true);
    invalidateAll();
    queryClient.invalidateQueries({ queryKey: ["sections"] });
    queryClient.invalidateQueries({ queryKey: ["computers"] });
    queryClient.invalidateQueries({ queryKey: ["seats"] });

    if (errors === 0) {
      toast.success(`Imported ${saved} device(s) successfully`);
    } else {
      toast.warning(`Imported ${saved} device(s), ${errors} error(s)`);
    }
  };

  // ── Add / Edit ─────────────────────────────────────────────────────────────

  const openAddDialog = () => {
    setEditingDevice(null);
    setFormState(EMPTY_FORM);
    setEntryDialogOpen(true);
  };

  const openEditDialog = (device: any) => {
    setEditingDevice(device);
    setFormState({
      deviceType: device.deviceType ?? "CPU",
      serialNumber: device.serialNumber ?? "",
      cpuSerialNumber: device.cpuSerialNumber ?? "",
      monitorSerialNumber: device.monitorSerialNumber ?? "",
      makeAndModel: device.makeAndModel ?? device.companyName ?? "",
      section:
        (getSectionDisplay(device.sectionId ?? "") || device.sectionId) ?? "",
      ipAddress: device.ipAddress ?? "",
      status: device.workingStatus ?? "Available",
      amcTeam: device.amcTeam ?? "",
      amcStartDate:
        device.amcStartDate && device.amcStartDate > BigInt(0)
          ? formatDate(device.amcStartDate)
          : "",
      amcEndDate:
        device.amcExpiryDate && device.amcExpiryDate > BigInt(0)
          ? formatDate(device.amcExpiryDate)
          : "",
      remarks: device.remarks ?? "",
    });
    setEntryDialogOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!actor || !formState.serialNumber.trim()) {
      toast.error("Serial Number is required");
      return;
    }
    setIsSaving(true);
    try {
      const isMicroComputer = formState.deviceType === "Micro Computer";

      // If editing a Micro Computer and CPU/Monitor SN changed, move old to standby
      if (editingDevice && isMicroComputer) {
        const oldCpu = editingDevice.cpuSerialNumber ?? "";
        const oldMon = editingDevice.monitorSerialNumber ?? "";
        const newCpu = formState.cpuSerialNumber.trim();
        const newMon = formState.monitorSerialNumber.trim();

        if (oldCpu && newCpu && oldCpu !== newCpu) {
          // Move old CPU to standby
          const standbyDevice = {
            id: oldCpu,
            serialNumber: oldCpu,
            deviceType: "CPU",
            cpuSerialNumber: "",
            monitorSerialNumber: "",
            makeAndModel: editingDevice.makeAndModel ?? "",
            companyName: editingDevice.makeAndModel ?? "",
            amcTeam: editingDevice.amcTeam ?? "",
            amcStartDate: editingDevice.amcStartDate ?? BigInt(0),
            amcExpiryDate: editingDevice.amcExpiryDate ?? BigInt(0),
            assignedSeatId: "",
            sectionId: "",
            workingStatus: "Available",
            ipAddress: "",
            remarks: `Replaced from Micro Computer ${formState.serialNumber}`,
            previousSection: editingDevice.sectionId ?? "",
            dateMovedToStandby: BigInt(Date.now()),
            createdAt: BigInt(Date.now()),
          };
          try {
            await (actor as any).createDevice(standbyDevice);
          } catch (_) {
            // might already exist; try update
            try {
              await (actor as any).updateDevice(standbyDevice);
            } catch (_2) {
              /* ignore */
            }
          }
        }

        if (oldMon && newMon && oldMon !== newMon) {
          // Move old Monitor to standby
          const standbyDevice = {
            id: oldMon,
            serialNumber: oldMon,
            deviceType: "Monitor",
            cpuSerialNumber: "",
            monitorSerialNumber: "",
            makeAndModel: editingDevice.makeAndModel ?? "",
            companyName: editingDevice.makeAndModel ?? "",
            amcTeam: editingDevice.amcTeam ?? "",
            amcStartDate: editingDevice.amcStartDate ?? BigInt(0),
            amcExpiryDate: editingDevice.amcExpiryDate ?? BigInt(0),
            assignedSeatId: "",
            sectionId: "",
            workingStatus: "Available",
            ipAddress: "",
            remarks: `Replaced from Micro Computer ${formState.serialNumber}`,
            previousSection: editingDevice.sectionId ?? "",
            dateMovedToStandby: BigInt(Date.now()),
            createdAt: BigInt(Date.now()),
          };
          try {
            await (actor as any).createDevice(standbyDevice);
          } catch (_) {
            try {
              await (actor as any).updateDevice(standbyDevice);
            } catch (_2) {
              /* ignore */
            }
          }
        }
      }

      const device = {
        id: formState.serialNumber.trim(),
        serialNumber: formState.serialNumber.trim(),
        deviceType: formState.deviceType,
        cpuSerialNumber: isMicroComputer
          ? formState.cpuSerialNumber.trim()
          : "",
        monitorSerialNumber: isMicroComputer
          ? formState.monitorSerialNumber.trim()
          : "",
        makeAndModel: formState.makeAndModel,
        companyName: formState.makeAndModel,
        amcTeam: formState.amcTeam,
        amcStartDate: parseDateToBigInt(formState.amcStartDate),
        amcExpiryDate: parseDateToBigInt(formState.amcEndDate),
        assignedSeatId: editingDevice?.assignedSeatId ?? "",
        sectionId: await resolveSectionId(formState.section),
        workingStatus: formState.status,
        ipAddress: formState.ipAddress,
        remarks: formState.remarks,
        previousSection: editingDevice?.previousSection ?? "",
        dateMovedToStandby: editingDevice?.dateMovedToStandby ?? BigInt(0),
        createdAt: editingDevice?.createdAt ?? BigInt(Date.now()),
      };
      if (editingDevice) {
        await (actor as any).updateDevice(device);
        toast.success("Device updated successfully");
      } else {
        await (actor as any).createDevice(device);
        toast.success("Device added successfully");
      }
      // Auto-create seat for computer types with section
      const resolvedSectionId = device.sectionId as string;
      if (resolvedSectionId && COMPUTER_TYPES_SET.has(formState.deviceType)) {
        await autoCreateSeat(device, resolvedSectionId);
      }
      // If section was removed and device was computer type, delete seat
      if (
        !resolvedSectionId &&
        editingDevice?.sectionId &&
        COMPUTER_TYPES_SET.has(formState.deviceType)
      ) {
        try {
          const allSeats: any[] = await (actor as any).getAllSeats();
          const seat = allSeats.find(
            (s: any) =>
              s.cpuSerial === formState.serialNumber ||
              s.monitorSerial === formState.serialNumber,
          );
          if (seat) {
            await (actor as any).deleteSeat(seat.id);
            queryClient.invalidateQueries({ queryKey: ["seats"] });
            queryClient.invalidateQueries({ queryKey: ["computers"] });
          }
        } catch (_) {}
      }
      invalidateAll();
      setEntryDialogOpen(false);
    } catch (err) {
      toast.error(`Save failed: ${err}`);
    } finally {
      setIsSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDeleteConfirm = async () => {
    if (!actor || !deletingId) return;
    try {
      await (actor as any).deleteDevice(deletingId);
      toast.success("Device deleted");
      invalidateAll();
    } catch (err) {
      toast.error(`Delete failed: ${err}`);
    } finally {
      setDeleteDialogOpen(false);
      setDeletingId(null);
    }
  };

  // ── Filtered devices ───────────────────────────────────────────────────────

  const filteredDevices = devices.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (d.serialNumber ?? "").toLowerCase().includes(q) ||
      (d.deviceType ?? "").toLowerCase().includes(q) ||
      (d.makeAndModel ?? d.companyName ?? "").toLowerCase().includes(q) ||
      (d.sectionId ?? "").toLowerCase().includes(q) ||
      (d.amcTeam ?? "").toLowerCase().includes(q) ||
      (d.cpuSerialNumber ?? "").toLowerCase().includes(q) ||
      (d.monitorSerialNumber ?? "").toLowerCase().includes(q)
    );
  });

  // Column counts for skeleton
  const colCount = isLoggedIn ? 11 : 10;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Unified Stock Register
            </h1>
            <p className="text-sm text-muted-foreground">
              All devices — CPUs, Monitors, Micro Computers, All-in-One PCs,
              Printers, UPS, Laptops and more
            </p>
          </div>
        </div>
        {isLoggedIn && (
          <Button
            onClick={openAddDialog}
            size="sm"
            data-ocid="stock.open_modal_button"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Device
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Devices",
            value: devices.length,
            color: "text-primary",
          },
          {
            label: "CPUs",
            value: devices.filter((d) => d.deviceType === "CPU").length,
            color: "text-blue-600",
          },
          {
            label: "Monitors",
            value: devices.filter((d) => d.deviceType === "Monitor").length,
            color: "text-purple-600",
          },
          {
            label: "Other Devices",
            value: devices.filter(
              (d) => d.deviceType !== "CPU" && d.deviceType !== "Monitor",
            ).length,
            color: "text-green-600",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-card border border-border rounded-lg p-4 text-center"
          >
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Import Section (auth-gated) */}
      {isLoggedIn && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Import Full Stock (CSV)</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadTemplate}
              data-ocid="stock.upload_button"
            >
              <Download className="h-4 w-4 mr-1" />
              Download Template
            </Button>
          </div>

          {/* Drop zone */}
          <label
            htmlFor="stock-file-input"
            className={`block border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            data-ocid="stock.dropzone"
          >
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            {csvFileName ? (
              <>
                <p className="font-medium text-sm">{csvFileName}</p>
                <p className="text-xs text-muted-foreground">
                  {csvRows.length} row(s) ready to import
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Drop a CSV file here or click to select
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Columns: Device Type, Serial Number, CPU Serial Number,
                  Monitor Serial Number, Make and Model, Section, IP Address,
                  Status, AMC Team, AMC Start Date, AMC End Date, Remarks
                </p>
              </>
            )}
            <input
              id="stock-file-input"
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </label>

          {/* Import progress */}
          {isImporting && (
            <div className="space-y-1" data-ocid="stock.loading_state">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Importing…</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}

          {/* Import result */}
          {importDone && (
            <div
              className={`flex items-center gap-2 text-sm rounded-lg px-3 py-2 ${
                importErrors === 0
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
              data-ocid="stock.success_state"
            >
              {importErrors === 0 ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0" />
              )}
              <span>
                {savedCount} device(s) imported
                {importErrors > 0 ? `, ${importErrors} error(s)` : ""}
              </span>
            </div>
          )}

          {/* Import button */}
          {csvRows.length > 0 && !isImporting && (
            <Button
              onClick={handleImport}
              disabled={!actor}
              data-ocid="stock.primary_button"
            >
              {!actor ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Import {csvRows.length} Device(s)
            </Button>
          )}
        </div>
      )}

      {/* Stock Register Table */}
      <div className="bg-card border border-border rounded-lg">
        <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold">Stock Register</h2>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search devices…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56 h-8 text-sm"
              data-ocid="stock.search_input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportDevicesCSV(filteredDevices)}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Sl No</TableHead>
                <TableHead>Device Type</TableHead>
                <TableHead>Serial Number</TableHead>
                <TableHead>CPU / Monitor SN</TableHead>
                <TableHead>Make &amp; Model</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>AMC Team</TableHead>
                <TableHead>AMC Expiry</TableHead>
                <TableHead>Remarks</TableHead>
                {isLoggedIn && <TableHead className="w-20">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={`skel-row-${i}`}>
                    {[
                      "sl",
                      "type",
                      "sn",
                      "cpumon",
                      "model",
                      "sec",
                      "status",
                      "amc",
                      "expiry",
                      "rem",
                      "act",
                    ]
                      .slice(0, colCount)
                      .map((col) => (
                        <TableCell key={`skel-${i}-${col}`}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                  </TableRow>
                ))
              ) : filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={colCount}
                    className="text-center py-10 text-muted-foreground"
                    data-ocid="stock.empty_state"
                  >
                    {search
                      ? "No devices match your search."
                      : "No devices in stock. Import a CSV or add manually."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDevices.map((device, idx) => (
                  <TableRow
                    key={device.id ?? device.serialNumber ?? idx}
                    data-ocid={`stock.item.${idx + 1}`}
                  >
                    <TableCell className="text-muted-foreground text-sm">
                      {idx + 1}
                    </TableCell>
                    <TableCell>
                      <DeviceTypeBadge type={device.deviceType ?? "Other"} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {device.serialNumber}
                    </TableCell>
                    <TableCell>
                      {device.deviceType === "Micro Computer" ? (
                        <div className="text-xs space-y-0.5">
                          <div className="font-mono">
                            <span className="text-muted-foreground">CPU: </span>
                            {device.cpuSerialNumber || "—"}
                          </div>
                          <div className="font-mono">
                            <span className="text-muted-foreground">MON: </span>
                            {device.monitorSerialNumber || "—"}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {device.makeAndModel ?? device.companyName ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getSectionDisplay(device.sectionId) || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={device.workingStatus ?? "Others"} />
                    </TableCell>
                    <TableCell className="text-sm">
                      {device.amcTeam || "—"}
                    </TableCell>
                    <TableCell>
                      <AmcExpiryBadge
                        date={device.amcExpiryDate ?? BigInt(0)}
                      />
                    </TableCell>
                    <TableCell className="text-sm max-w-[140px] truncate">
                      {device.remarks || "—"}
                    </TableCell>
                    {isLoggedIn && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => openEditDialog(device)}
                            data-ocid="stock.edit_button"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeletingId(device.id ?? device.serialNumber);
                              setDeleteDialogOpen(true);
                            }}
                            data-ocid="stock.delete_button"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="stock.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingDevice ? "Edit Device" : "Add Device"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            {/* Device Type */}
            <div className="col-span-2 space-y-1">
              <Label>Device Type</Label>
              <Select
                value={formState.deviceType}
                onValueChange={(v) =>
                  setFormState((p) => ({ ...p, deviceType: v }))
                }
              >
                <SelectTrigger data-ocid="stock.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEVICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Serial Number */}
            <div className="col-span-2 space-y-1">
              <Label>Serial Number *</Label>
              <Input
                value={formState.serialNumber}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, serialNumber: e.target.value }))
                }
                placeholder="Unique serial number"
                disabled={!!editingDevice}
                data-ocid="stock.input"
              />
            </div>

            {/* CPU / Monitor Serial Numbers — only for Micro Computer */}
            {formState.deviceType === "Micro Computer" && (
              <>
                <div className="col-span-2">
                  <p className="text-xs text-muted-foreground italic mb-2">
                    Used for Micro Computer component tracking
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>CPU Serial Number</Label>
                  <Input
                    value={formState.cpuSerialNumber}
                    onChange={(e) =>
                      setFormState((p) => ({
                        ...p,
                        cpuSerialNumber: e.target.value,
                      }))
                    }
                    placeholder="CPU S/N"
                    data-ocid="stock.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Monitor Serial Number</Label>
                  <Input
                    value={formState.monitorSerialNumber}
                    onChange={(e) =>
                      setFormState((p) => ({
                        ...p,
                        monitorSerialNumber: e.target.value,
                      }))
                    }
                    placeholder="Monitor S/N"
                    data-ocid="stock.input"
                  />
                </div>
              </>
            )}

            {/* Make and Model */}
            <div className="col-span-2 space-y-1">
              <Label>Make and Model</Label>
              <Input
                value={formState.makeAndModel}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, makeAndModel: e.target.value }))
                }
                placeholder="e.g. HP EliteDesk 800 G5"
              />
            </div>

            {/* Section */}
            <div className="space-y-1">
              <Label>Section</Label>
              <Input
                value={formState.section}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, section: e.target.value }))
                }
                placeholder="e.g. D1"
                list="section-suggestions"
              />
              <datalist id="section-suggestions">
                {sections.map((s: any) => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>

            {/* IP Address */}
            <div className="space-y-1">
              <Label>IP Address</Label>
              <Input
                value={formState.ipAddress}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, ipAddress: e.target.value }))
                }
                placeholder="Optional"
              />
            </div>

            {/* Status */}
            <div className="col-span-2 space-y-1">
              <Label>Status</Label>
              <Select
                value={formState.status}
                onValueChange={(v) =>
                  setFormState((p) => ({ ...p, status: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AMC Team */}
            <div className="col-span-2 space-y-1">
              <Label>AMC Team</Label>
              <Input
                value={formState.amcTeam}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, amcTeam: e.target.value }))
                }
                placeholder="Service provider name"
              />
            </div>

            {/* AMC Start Date */}
            <div className="space-y-1">
              <Label>AMC Start Date</Label>
              <Input
                value={formState.amcStartDate}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, amcStartDate: e.target.value }))
                }
                placeholder="DD/MM/YYYY"
              />
            </div>

            {/* AMC End Date */}
            <div className="space-y-1">
              <Label>AMC End Date</Label>
              <Input
                value={formState.amcEndDate}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, amcEndDate: e.target.value }))
                }
                placeholder="DD/MM/YYYY"
              />
            </div>

            {/* Remarks */}
            <div className="col-span-2 space-y-1">
              <Label>Remarks</Label>
              <Input
                value={formState.remarks}
                onChange={(e) =>
                  setFormState((p) => ({ ...p, remarks: e.target.value }))
                }
                placeholder="Optional notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEntryDialogOpen(false)}
              data-ocid="stock.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEntry}
              disabled={isSaving}
              data-ocid="stock.save_button"
            >
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingDevice ? "Update" : "Add Device"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="stock.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the device from stock. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="stock.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="stock.confirm_button"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
