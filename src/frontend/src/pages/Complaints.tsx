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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Complaint } from "../backend";
import { type ComplaintStatus, Priority } from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import {
  useCreateComplaint,
  useDeleteComplaint,
  useGetAllComplaints,
  useUpdateComplaint,
} from "../hooks/useQueries";

// ── helpers ────────────────────────────────────────────────────────────────

const UNIT_TYPES = [
  "CPU",
  "Monitor",
  "Printer",
  "UPS",
  "Keyboard",
  "Mouse",
  "Other",
];

function nsToDatStr(ns: bigint | undefined): string {
  if (!ns || ns === 0n) return "";
  const ms = Number(ns) / 1_000_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateStrToNs(s: string): bigint | undefined {
  if (!s) return undefined;
  const ms = new Date(s).getTime();
  if (Number.isNaN(ms)) return undefined;
  return BigInt(ms) * 1_000_000n;
}

function fmtNs(ns: bigint | undefined): string {
  if (!ns || ns === 0n) return "—";
  const ms = Number(ns) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function calcDays(fromNs: bigint, toNs?: bigint): number {
  const startMs = Number(fromNs) / 1_000_000;
  const endMs = toNs ? Number(toNs) / 1_000_000 : Date.now();
  return Math.max(0, Math.floor((endMs - startMs) / (1000 * 60 * 60 * 24)));
}

function getStatus(c: Complaint): "Cleared" | "Long Pending" | "Pending" {
  if (c.caseClearedDate && c.caseClearedDate > 0n) return "Cleared";
  const pending = calcDays(c.createdAt);
  if (pending > 7) return "Long Pending";
  return "Pending";
}

function StatusBadge({ complaint }: { complaint: Complaint }) {
  const status = getStatus(complaint);
  if (status === "Cleared")
    return (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border text-xs">
        Cleared
      </Badge>
    );
  if (status === "Long Pending")
    return (
      <Badge className="bg-red-100 text-red-700 border-red-200 border text-xs">
        Long Pending
      </Badge>
    );
  return (
    <Badge className="bg-orange-100 text-orange-700 border-orange-200 border text-xs">
      Pending
    </Badge>
  );
}

// ── export CSV ────────────────────────────────────────────────────────────

function exportToCSV(data: Complaint[]) {
  const headers = [
    "Sl No",
    "Unit Type",
    "Unit Serial No",
    "User",
    "AMC Team",
    "Case Logged Date",
    "Case Attended Date",
    "Spare(s) Taken",
    "Spare Taken Date",
    "Case Cleared Date",
    "Days Taken",
    "Pending Days",
    "Status",
    "Remarks 1",
    "Remarks 2",
  ];
  const rows = data.map((c, i) => [
    i + 1,
    c.unit,
    c.unitSlNo,
    c.reportedBy,
    c.amcTeam,
    fmtNs(c.createdAt),
    fmtNs(c.caseAttendedDate),
    c.sparesTaken,
    fmtNs(c.spareTakenDate),
    fmtNs(c.caseClearedDate),
    c.caseClearedDate && c.caseClearedDate > 0n
      ? calcDays(c.createdAt, c.caseClearedDate)
      : "",
    c.caseClearedDate && c.caseClearedDate > 0n ? "" : calcDays(c.createdAt),
    getStatus(c),
    c.extraCol1,
    c.extraCol2,
  ]);
  const csv = [headers, ...rows]
    .map((r) =>
      r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `complaint-log-register-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── empty form ─────────────────────────────────────────────────────────────

const emptyForm = () => ({
  unitSlNo: "",
  unit: "",
  caseLoggedDate: "",
  caseAttendedDate: "",
  sparesTaken: "",
  spareTakenDate: "",
  caseClearedDate: "",
  reportedBy: "",
  amcTeam: "",
  extraCol1: "",
  extraCol2: "",
  description: "",
});

// ── main component ────────────────────────────────────────────────────────

export default function Complaints() {
  const { isLoggedIn } = useAdmin();
  const { data: complaints = [], isLoading } = useGetAllComplaints();
  const createMutation = useCreateComplaint();
  const updateMutation = useUpdateComplaint();
  const deleteMutation = useDeleteComplaint();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  // Filters
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterAMCTeam, setFilterAMCTeam] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortByPending, setSortByPending] = useState(false);

  // ── summary stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = complaints.length;
    const cleared = complaints.filter(
      (c) => c.caseClearedDate && c.caseClearedDate > 0n,
    ).length;
    const pending = total - cleared;
    const longPending = complaints.filter((c) => {
      if (c.caseClearedDate && c.caseClearedDate > 0n) return false;
      return calcDays(c.createdAt) > 7;
    }).length;
    return { total, cleared, pending, longPending };
  }, [complaints]);

  // ── filtering ────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = [...complaints];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.unitSlNo.toLowerCase().includes(q) ||
          c.unit.toLowerCase().includes(q) ||
          c.reportedBy.toLowerCase().includes(q) ||
          c.amcTeam.toLowerCase().includes(q) ||
          c.extraCol1.toLowerCase().includes(q) ||
          c.extraCol2.toLowerCase().includes(q),
      );
    }

    // Unit type filter
    if (filterUnit !== "all") {
      list = list.filter((c) => c.unit === filterUnit);
    }

    // AMC team filter
    if (filterAMCTeam.trim()) {
      list = list.filter((c) =>
        c.amcTeam.toLowerCase().includes(filterAMCTeam.toLowerCase()),
      );
    }

    // Date range filter (case logged date)
    if (filterDateFrom) {
      const fromNs = dateStrToNs(filterDateFrom);
      if (fromNs) list = list.filter((c) => c.createdAt >= fromNs);
    }
    if (filterDateTo) {
      const toNs = dateStrToNs(filterDateTo);
      if (toNs)
        list = list.filter((c) => c.createdAt <= toNs + 86_400_000_000_000n);
    }

    // Status filter
    if (filterStatus !== "all") {
      list = list.filter((c) => {
        const s = getStatus(c);
        if (filterStatus === "pending") return s === "Pending";
        if (filterStatus === "longpending") return s === "Long Pending";
        if (filterStatus === "cleared") return s === "Cleared";
        return true;
      });
    }

    return list;
  }, [
    complaints,
    search,
    filterUnit,
    filterAMCTeam,
    filterDateFrom,
    filterDateTo,
    filterStatus,
  ]);

  const pendingList = useMemo(() => {
    const list = filtered.filter(
      (c) => !(c.caseClearedDate && c.caseClearedDate > 0n),
    );
    if (sortByPending) {
      return [...list].sort(
        (a, b) => calcDays(b.createdAt) - calcDays(a.createdAt),
      );
    }
    return list;
  }, [filtered, sortByPending]);

  const clearedList = useMemo(
    () => filtered.filter((c) => c.caseClearedDate && c.caseClearedDate > 0n),
    [filtered],
  );

  // ── dialog actions ────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingComplaint(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (c: Complaint) => {
    setEditingComplaint(c);
    setForm({
      unitSlNo: c.unitSlNo,
      unit: c.unit,
      caseLoggedDate: nsToDatStr(c.createdAt),
      caseAttendedDate: nsToDatStr(c.caseAttendedDate),
      sparesTaken: c.sparesTaken,
      spareTakenDate: nsToDatStr(c.spareTakenDate),
      caseClearedDate: nsToDatStr(c.caseClearedDate),
      reportedBy: c.reportedBy,
      amcTeam: c.amcTeam,
      extraCol1: c.extraCol1,
      extraCol2: c.extraCol2,
      description: c.description,
    });
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.reportedBy.trim()) {
      toast.error("User / Reported By is required");
      return;
    }
    if (!form.caseLoggedDate) {
      toast.error("Case Logged Date is required");
      return;
    }

    const clearedNs = dateStrToNs(form.caseClearedDate);
    const loggedNs = dateStrToNs(form.caseLoggedDate) ?? BigInt(Date.now());
    const autoStatus: ComplaintStatus = clearedNs
      ? ("resolved" as ComplaintStatus)
      : ("open" as ComplaintStatus);

    const data: Complaint = {
      id: editingComplaint?.id ?? crypto.randomUUID(),
      unitSlNo: form.unitSlNo,
      unit: form.unit,
      caseAttendedDate: dateStrToNs(form.caseAttendedDate),
      sparesTaken: form.sparesTaken,
      spareTakenDate: dateStrToNs(form.spareTakenDate),
      caseClearedDate: clearedNs,
      reportedBy: form.reportedBy,
      amcTeam: form.amcTeam,
      extraCol1: form.extraCol1,
      extraCol2: form.extraCol2,
      status: autoStatus,
      priority: (editingComplaint?.priority ?? Priority.medium) as Priority,
      sectionId: editingComplaint?.sectionId ?? undefined,
      computerId: editingComplaint?.computerId ?? undefined,
      description: form.description,
      createdAt: loggedNs,
      resolvedAt: clearedNs ?? editingComplaint?.resolvedAt,
    };

    try {
      if (editingComplaint) {
        await updateMutation.mutateAsync(data);
        toast.success("Entry updated");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Entry added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save entry");
    }
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

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="complaints.section">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Complaint Log Register
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Internal record of hardware complaints logged with AMC teams
          </p>
        </div>
        <div className="flex gap-2">
          {complaints.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => exportToCSV(filtered)}
              data-ocid="complaints.secondary_button"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          )}
          {isLoggedIn && (
            <Button
              onClick={openAdd}
              size="sm"
              className="gap-2"
              data-ocid="complaints.primary_button"
            >
              <Plus className="w-4 h-4" />
              Log Entry
            </Button>
          )}
        </div>
      </div>

      {/* Summary Dashboard */}
      {!isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border shadow-sm">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-1.5">
                <ClipboardList className="w-3.5 h-3.5" />
                Total Cases
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-2xl font-bold font-display">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm border-orange-200 bg-orange-50/40">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-orange-600 font-medium uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Pending
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-2xl font-bold font-display text-orange-600">
                {stats.pending}
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm border-emerald-200 bg-emerald-50/40">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-emerald-600 font-medium uppercase tracking-wide flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cleared
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-2xl font-bold font-display text-emerald-600">
                {stats.cleared}
              </p>
            </CardContent>
          </Card>

          <Card className="border shadow-sm border-red-200 bg-red-50/40">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-red-600 font-medium uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Long Pending (&gt;7d)
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-2xl font-bold font-display text-red-600">
                {stats.longPending}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Global search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by serial, user, AMC team..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-ocid="complaints.search_input"
            />
          </div>

          {/* Unit type */}
          <Select value={filterUnit} onValueChange={setFilterUnit}>
            <SelectTrigger className="w-[140px]" data-ocid="complaints.select">
              <SelectValue placeholder="Unit Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Units</SelectItem>
              {UNIT_TYPES.map((u) => (
                <SelectItem key={u} value={u}>
                  {u}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]" data-ocid="complaints.select">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="longpending">Long Pending</SelectItem>
              <SelectItem value="cleared">Cleared</SelectItem>
            </SelectContent>
          </Select>

          {/* AMC Team */}
          <Input
            placeholder="AMC Team"
            className="w-[140px]"
            value={filterAMCTeam}
            onChange={(e) => setFilterAMCTeam(e.target.value)}
            data-ocid="complaints.input"
          />

          {/* Date range */}
          <Input
            type="date"
            className="w-[140px]"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            data-ocid="complaints.input"
            title="From date"
          />
          <Input
            type="date"
            className="w-[140px]"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            data-ocid="complaints.input"
            title="To date"
          />

          {/* Sort toggle */}
          <Button
            variant={sortByPending ? "default" : "outline"}
            size="sm"
            onClick={() => setSortByPending((v) => !v)}
            className="gap-1.5"
            data-ocid="complaints.toggle"
          >
            Sort by Pending Days
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4" data-ocid="complaints.loading_state">
          {["sk1", "sk2"].map((sk) => (
            <div
              key={sk}
              className="rounded-xl border border-border bg-card p-4 space-y-3"
            >
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Pending Cases ── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-orange-50/60 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" />
              <h3 className="font-display font-bold text-base text-foreground">
                Pending Cases
              </h3>
              <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-200 border">
                {pendingList.length}
              </Badge>
            </div>

            {pendingList.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3"
                data-ocid="complaints.empty_state"
              >
                <CheckCircle2 className="w-10 h-10 opacity-20" />
                <p className="text-sm">No pending cases</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="complaints.table">
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs uppercase tracking-wide w-10 text-center">
                        Sl No
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">
                        Unit
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Serial No
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">
                        User
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        AMC Team
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Case Logged Date
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Case Attended Date
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Pending Days
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Spare Taken
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">
                        Remarks
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">
                        Status
                      </TableHead>
                      {isLoggedIn && (
                        <TableHead className="text-xs uppercase tracking-wide text-right">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingList.map((c, idx) => {
                      const pDays = calcDays(c.createdAt);
                      const isLong = pDays > 7;
                      return (
                        <TableRow
                          key={c.id}
                          data-ocid={`complaints.row.${idx + 1}`}
                          className={cn(
                            "transition-colors",
                            isLong
                              ? "bg-red-50/50 hover:bg-red-50"
                              : "hover:bg-muted/20",
                          )}
                        >
                          <TableCell className="text-xs text-muted-foreground font-medium text-center">
                            {idx + 1}
                          </TableCell>
                          <TableCell className="text-sm font-medium whitespace-nowrap">
                            {c.unit || "—"}
                          </TableCell>
                          <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                            {c.unitSlNo || "—"}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {c.reportedBy || "—"}
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {c.amcTeam || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtNs(c.createdAt)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {fmtNs(c.caseAttendedDate)}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex items-center justify-center min-w-[2rem] text-xs font-semibold px-2 py-0.5 rounded-full border",
                                isLong
                                  ? "bg-red-100 text-red-700 border-red-200"
                                  : "bg-orange-100 text-orange-700 border-orange-200",
                              )}
                            >
                              {pDays}d
                            </span>
                          </TableCell>
                          <TableCell className="text-sm max-w-[120px] truncate">
                            {c.sparesTaken || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                            {[c.extraCol1, c.extraCol2]
                              .filter(Boolean)
                              .join(" | ") || "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge complaint={c} />
                          </TableCell>
                          {isLoggedIn && (
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7"
                                  onClick={() => openEdit(c)}
                                  data-ocid={`complaints.edit_button.${idx + 1}`}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 hover:text-destructive"
                                  onClick={() => openDelete(c.id)}
                                  data-ocid={`complaints.delete_button.${idx + 1}`}
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
            )}
          </div>

          {/* ── Cleared Cases ── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-emerald-50/60 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h3 className="font-display font-bold text-base text-foreground">
                Cleared Cases
              </h3>
              <Badge className="ml-auto bg-emerald-100 text-emerald-700 border-emerald-200 border">
                {clearedList.length}
              </Badge>
            </div>

            {clearedList.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3"
                data-ocid="complaints.empty_state"
              >
                <ClipboardList className="w-10 h-10 opacity-20" />
                <p className="text-sm">No cleared cases</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table data-ocid="complaints.table">
                  <TableHeader>
                    <TableRow className="bg-muted/20">
                      <TableHead className="text-xs uppercase tracking-wide w-10 text-center">
                        Sl No
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">
                        Unit
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Serial No
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">
                        User
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        AMC Team
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Case Logged Date
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Case Attended Date
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Case Cleared Date
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Days Taken
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide whitespace-nowrap">
                        Spare Taken
                      </TableHead>
                      <TableHead className="text-xs uppercase tracking-wide">
                        Remarks
                      </TableHead>
                      {isLoggedIn && (
                        <TableHead className="text-xs uppercase tracking-wide text-right">
                          Actions
                        </TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clearedList.map((c, idx) => (
                      <TableRow
                        key={c.id}
                        data-ocid={`complaints.row.${idx + 1}`}
                        className="hover:bg-muted/20 transition-colors"
                      >
                        <TableCell className="text-xs text-muted-foreground font-medium text-center">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="text-sm font-medium whitespace-nowrap">
                          {c.unit || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {c.unitSlNo || "—"}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {c.reportedBy || "—"}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {c.amcTeam || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtNs(c.createdAt)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtNs(c.caseAttendedDate)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtNs(c.caseClearedDate)}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center justify-center min-w-[2rem] text-xs font-semibold px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-700 border-emerald-200">
                            {calcDays(c.createdAt, c.caseClearedDate)}d
                          </span>
                        </TableCell>
                        <TableCell className="text-sm max-w-[120px] truncate">
                          {c.sparesTaken || "—"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                          {[c.extraCol1, c.extraCol2]
                            .filter(Boolean)
                            .join(" | ") || "—"}
                        </TableCell>
                        {isLoggedIn && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7"
                                onClick={() => openEdit(c)}
                                data-ocid={`complaints.edit_button.${idx + 1}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 hover:text-destructive"
                                onClick={() => openDelete(c.id)}
                                data-ocid={`complaints.delete_button.${idx + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="complaints.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingComplaint ? "Edit Log Entry" : "Add Log Entry"}
            </DialogTitle>
            <DialogDescription>
              Record the details of a complaint already logged with the AMC
              team.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* Unit Type */}
            <div className="space-y-1.5">
              <Label>Unit Type</Label>
              <Select
                value={form.unit || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, unit: v === "__none__" ? "" : v }))
                }
              >
                <SelectTrigger data-ocid="complaints.select">
                  <SelectValue placeholder="Select unit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select...</SelectItem>
                  {UNIT_TYPES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Unit Serial No */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-unit-slno">Unit Serial No</Label>
              <Input
                id="cp-unit-slno"
                placeholder="e.g. SN-00123"
                value={form.unitSlNo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unitSlNo: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* Case Logged Date */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-logged">
                Case Logged Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cp-logged"
                type="date"
                value={form.caseLoggedDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, caseLoggedDate: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* Case Attended Date */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-attended">Case Attended Date</Label>
              <Input
                id="cp-attended"
                type="date"
                value={form.caseAttendedDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, caseAttendedDate: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* Spare(s) Taken */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-spares">Spare(s) Taken for Repair</Label>
              <Input
                id="cp-spares"
                placeholder="e.g. HDD, RAM module"
                value={form.sparesTaken}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sparesTaken: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* Spare Taken Date */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-spare-date">Spare Taken Date</Label>
              <Input
                id="cp-spare-date"
                type="date"
                value={form.spareTakenDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, spareTakenDate: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* Case Cleared Date */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-cleared">Case Cleared Date</Label>
              <Input
                id="cp-cleared"
                type="date"
                value={form.caseClearedDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, caseClearedDate: e.target.value }))
                }
                data-ocid="complaints.input"
              />
              <p className="text-xs text-muted-foreground">
                Leave blank if case is still pending
              </p>
            </div>

            {/* User */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-reporter">
                User (Reported By) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cp-reporter"
                placeholder="Name of person reporting"
                value={form.reportedBy}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reportedBy: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* AMC Team */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-amc-team">AMC Team</Label>
              <Input
                id="cp-amc-team"
                placeholder="e.g. TechCare Services"
                value={form.amcTeam}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amcTeam: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* Remarks 1 */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-extra1">Remarks 1</Label>
              <Input
                id="cp-extra1"
                placeholder="Additional remark"
                value={form.extraCol1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, extraCol1: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* Remarks 2 */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-extra2">Remarks 2</Label>
              <Input
                id="cp-extra2"
                placeholder="Additional remark"
                value={form.extraCol2}
                onChange={(e) =>
                  setForm((f) => ({ ...f, extraCol2: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cp-desc">Description (Optional)</Label>
              <Textarea
                id="cp-desc"
                placeholder="Describe the issue in detail..."
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                data-ocid="complaints.textarea"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="complaints.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-ocid="complaints.submit_button"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingComplaint ? "Update" : "Add"} Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="complaints.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete Log Entry?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The log entry will be permanently
              removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="complaints.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="complaints.confirm_button"
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
