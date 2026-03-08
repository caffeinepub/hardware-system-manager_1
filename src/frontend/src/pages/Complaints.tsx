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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ClipboardList, Edit2, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Complaint } from "../backend";
import { type ComplaintStatus, Priority } from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import {
  useCreateComplaint,
  useDeleteComplaint,
  useGetAllComplaints,
  useGetAllSections,
  useUpdateComplaint,
} from "../hooks/useQueries";
import { formatDate } from "../utils/formatters";

// ── helpers ────────────────────────────────────────────────────────────────

/** Convert a nanosecond bigint to a YYYY-MM-DD string for <input type="date"> */
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

/** Convert a YYYY-MM-DD string to nanosecond bigint */
function dateStrToNs(s: string): bigint | undefined {
  if (!s) return undefined;
  const ms = new Date(s).getTime();
  if (Number.isNaN(ms)) return undefined;
  return BigInt(ms) * 1_000_000n;
}

/** Format a nanosecond bigint for display in a table cell */
function fmtNs(ns: bigint | undefined): string {
  if (!ns || ns === 0n) return "—";
  const ms = Number(ns) / 1_000_000;
  return new Date(ms).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Calculate pending days between two bigint nanosecond timestamps (or from first to today) */
function calcPendingDays(createdAt: bigint, caseClearedDate?: bigint): number {
  const startMs = Number(createdAt);
  const endMs = caseClearedDate
    ? Number(caseClearedDate) / 1_000_000
    : Date.now();
  const diffMs = endMs - startMs;
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function PendingBadge({
  createdAt,
  caseClearedDate,
}: {
  createdAt: bigint;
  caseClearedDate?: bigint;
}) {
  const days = calcPendingDays(createdAt, caseClearedDate);
  const isCleared = !!caseClearedDate;

  const cls = isCleared
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : days > 30
      ? "bg-red-100 text-red-700 border-red-200"
      : days > 7
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : "bg-slate-100 text-slate-600 border-slate-200";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center min-w-[2rem] text-xs font-semibold px-2 py-0.5 rounded-full border",
        cls,
      )}
    >
      {days}d
    </span>
  );
}

// ── empty form ─────────────────────────────────────────────────────────────

const emptyForm = () => ({
  unitSlNo: "",
  unit: "",
  caseAttendedDate: "",
  sparesTaken: "",
  spareTakenDate: "",
  caseClearedDate: "",
  reportedBy: "",
  amcTeam: "",
  extraCol1: "",
  extraCol2: "",
  status: "open" as "open" | "inProgress" | "resolved",
  sectionId: "",
  description: "",
});

// ── main component ────────────────────────────────────────────────────────

export default function Complaints() {
  const { isLoggedIn } = useAdmin();
  const { data: complaints = [], isLoading } = useGetAllComplaints();
  const { data: sections = [] } = useGetAllSections();
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
  const [activeTab, setActiveTab] = useState("all");

  // ── filtering ────────────────────────────────────────────────────────────

  const filteredComplaints =
    activeTab === "all"
      ? complaints
      : complaints.filter((c) => c.status === activeTab);

  // ── grouping by section ───────────────────────────────────────────────────

  const grouped = filteredComplaints.reduce<Record<string, Complaint[]>>(
    (acc, c) => {
      const key = c.sectionId || "__unassigned__";
      if (!acc[key]) acc[key] = [];
      acc[key].push(c);
      return acc;
    },
    {},
  );

  const orderedKeys = [
    ...sections.map((s) => s.id).filter((id) => grouped[id]),
    ...(grouped.__unassigned__ ? ["__unassigned__"] : []),
  ];

  const getSectionLabel = (key: string) =>
    key === "__unassigned__"
      ? "Unassigned"
      : (sections.find((s) => s.id === key)?.name ?? key);

  // ── tab counts ────────────────────────────────────────────────────────────

  const tabCounts = {
    all: complaints.length,
    open: complaints.filter((c) => c.status === "open").length,
    inProgress: complaints.filter((c) => c.status === "inProgress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  // ── dialog actions ────────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingComplaint(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setForm({
      unitSlNo: complaint.unitSlNo,
      unit: complaint.unit,
      caseAttendedDate: nsToDatStr(complaint.caseAttendedDate),
      sparesTaken: complaint.sparesTaken,
      spareTakenDate: nsToDatStr(complaint.spareTakenDate),
      caseClearedDate: nsToDatStr(complaint.caseClearedDate),
      reportedBy: complaint.reportedBy,
      amcTeam: complaint.amcTeam,
      extraCol1: complaint.extraCol1,
      extraCol2: complaint.extraCol2,
      status: complaint.status as "open" | "inProgress" | "resolved",
      sectionId: complaint.sectionId ?? "",
      description: complaint.description,
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

    const clearedNs = dateStrToNs(form.caseClearedDate);

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
      status: form.status as ComplaintStatus,
      priority: (editingComplaint?.priority ?? Priority.medium) as Priority,
      sectionId: form.sectionId || undefined,
      computerId: editingComplaint?.computerId ?? undefined,
      description: form.description,
      createdAt: editingComplaint?.createdAt ?? BigInt(Date.now()),
      resolvedAt:
        form.status === "resolved" && !editingComplaint?.resolvedAt
          ? BigInt(Date.now())
          : editingComplaint?.resolvedAt,
    };

    try {
      if (editingComplaint) {
        await updateMutation.mutateAsync(data);
        toast.success("Complaint updated");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Complaint filed");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save complaint");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success("Complaint deleted");
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete complaint");
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="complaints.section">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Complaints
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track hardware complaints, repairs, and case resolutions
          </p>
        </div>
        {isLoggedIn && (
          <Button
            onClick={openAdd}
            size="sm"
            className="gap-2"
            data-ocid="complaints.primary_button"
          >
            <Plus className="w-4 h-4" />
            Add Complaint
          </Button>
        )}
      </div>

      {/* Status filter tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="border-b border-border">
          <TabsList
            className="h-10 bg-transparent rounded-none p-0 gap-0"
            data-ocid="complaints.tab"
          >
            {(
              [
                { value: "all", label: "All", count: tabCounts.all },
                { value: "open", label: "Open", count: tabCounts.open },
                {
                  value: "inProgress",
                  label: "In Progress",
                  count: tabCounts.inProgress,
                },
                {
                  value: "resolved",
                  label: "Resolved",
                  count: tabCounts.resolved,
                },
              ] as const
            ).map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                data-ocid="complaints.tab"
                className={cn(
                  "rounded-none border-b-2 border-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition-colors",
                  "data-[state=active]:border-primary data-[state=active]:text-foreground",
                  "hover:text-foreground",
                )}
              >
                {t.label}
                <span className="ml-1.5 text-xs bg-muted px-1.5 py-0.5 rounded-full">
                  {t.count}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {isLoading ? (
          <div className="space-y-4 mt-5" data-ocid="complaints.loading_state">
            {["sk1", "sk2"].map((sk) => (
              <div
                key={sk}
                className="rounded-xl border border-border bg-card shadow-card p-4 space-y-3"
              >
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : (
          ["all", "open", "inProgress", "resolved"].map((tab) => (
            <TabsContent key={tab} value={tab} className="mt-5 space-y-5">
              {orderedKeys.length === 0 ? (
                <div
                  className="rounded-xl border border-border bg-card shadow-card flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
                  data-ocid="complaints.empty_state"
                >
                  <ClipboardList className="w-12 h-12 opacity-30" />
                  <p className="font-display font-semibold">
                    No complaints found
                  </p>
                  <p className="text-sm">
                    {isLoggedIn
                      ? "File the first complaint to get started"
                      : "No complaints have been logged yet"}
                  </p>
                </div>
              ) : (
                orderedKeys.map((sectionKey, sectionIdx) => {
                  const sectionComplaints = grouped[sectionKey] ?? [];
                  const label = getSectionLabel(sectionKey);
                  return (
                    <div
                      key={sectionKey}
                      className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
                      data-ocid={`complaints.card.${sectionIdx + 1}`}
                    >
                      {/* Section heading */}
                      <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                        <ClipboardList className="w-4 h-4 text-primary opacity-70" />
                        <h3 className="font-display font-bold text-base text-foreground tracking-tight">
                          {label}
                        </h3>
                        <span className="ml-auto text-xs text-muted-foreground font-medium">
                          {sectionComplaints.length}{" "}
                          {sectionComplaints.length === 1 ? "case" : "cases"}
                        </span>
                      </div>

                      {/* Table */}
                      <div className="overflow-x-auto">
                        <Table data-ocid="complaints.table">
                          <TableHeader>
                            <TableRow className="bg-muted/20">
                              <TableHead className="font-display text-xs uppercase tracking-wide w-12 text-center">
                                Sl No
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                                Unit Sl No
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide">
                                Unit
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                                Case Logged Date
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                                Case Attended Date
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                                Spare(s) Taken for Repair
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                                Spare Taken Date
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                                Case Cleared Date
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                                Pending Days
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide">
                                User
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide whitespace-nowrap">
                                AMC Team
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide">
                                Remarks 1
                              </TableHead>
                              <TableHead className="font-display text-xs uppercase tracking-wide">
                                Remarks 2
                              </TableHead>
                              {isLoggedIn && (
                                <TableHead className="font-display text-xs uppercase tracking-wide text-right">
                                  Actions
                                </TableHead>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sectionComplaints.map((complaint, idx) => (
                              <TableRow
                                key={complaint.id}
                                data-ocid={`complaints.row.${idx + 1}`}
                                className="hover:bg-muted/20 transition-colors"
                              >
                                <TableCell className="text-xs text-muted-foreground font-medium text-center">
                                  {idx + 1}
                                </TableCell>
                                <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">
                                  {complaint.unitSlNo || "—"}
                                </TableCell>
                                <TableCell className="text-sm font-medium whitespace-nowrap">
                                  {complaint.unit || "—"}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatDate(complaint.createdAt)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {fmtNs(complaint.caseAttendedDate)}
                                </TableCell>
                                <TableCell className="text-sm max-w-[160px] truncate">
                                  {complaint.sparesTaken || "—"}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {fmtNs(complaint.spareTakenDate)}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                  {fmtNs(complaint.caseClearedDate)}
                                </TableCell>
                                <TableCell>
                                  <PendingBadge
                                    createdAt={complaint.createdAt}
                                    caseClearedDate={complaint.caseClearedDate}
                                  />
                                </TableCell>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {complaint.reportedBy || "—"}
                                </TableCell>
                                <TableCell className="text-sm whitespace-nowrap">
                                  {complaint.amcTeam || "—"}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                                  {complaint.extraCol1 || "—"}
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                                  {complaint.extraCol2 || "—"}
                                </TableCell>
                                {isLoggedIn && (
                                  <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7"
                                        onClick={() => openEdit(complaint)}
                                        data-ocid={`complaints.edit_button.${idx + 1}`}
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 hover:text-destructive"
                                        onClick={() => openDelete(complaint.id)}
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
                    </div>
                  );
                })
              )}
            </TabsContent>
          ))
        )}
      </Tabs>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
          data-ocid="complaints.dialog"
        >
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingComplaint ? "Edit Complaint" : "File a Complaint"}
            </DialogTitle>
            <DialogDescription>
              Fill in the complaint details. User / Reported By is required.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            {/* Unit Sl No */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-unit-slno">Unit Sl No</Label>
              <Input
                id="cp-unit-slno"
                placeholder="e.g. CPU-0042"
                value={form.unitSlNo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unitSlNo: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* Unit */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-unit">Unit</Label>
              <Input
                id="cp-unit"
                placeholder="e.g. Desktop PC, Printer"
                value={form.unit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, unit: e.target.value }))
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

            {/* Spare(s) Taken for Repair */}
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
            </div>

            {/* User / Reported By */}
            <div className="space-y-1.5">
              <Label htmlFor="cp-reporter">User / Reported By *</Label>
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
                placeholder="Additional remark 1"
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
                placeholder="Additional remark 2"
                value={form.extraCol2}
                onChange={(e) =>
                  setForm((f) => ({ ...f, extraCol2: e.target.value }))
                }
                data-ocid="complaints.input"
              />
            </div>

            {/* Status (only when logged in) */}
            {isLoggedIn && (
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      status: v as "open" | "inProgress" | "resolved",
                    }))
                  }
                >
                  <SelectTrigger data-ocid="complaints.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="inProgress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Related Section */}
            <div className="space-y-1.5">
              <Label>Related Section</Label>
              <Select
                value={form.sectionId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    sectionId: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger data-ocid="complaints.select">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cp-desc">Description</Label>
              <Textarea
                id="cp-desc"
                placeholder="Describe the issue in detail (optional)..."
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
              {editingComplaint ? "Update" : "Submit"} Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="complaints.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete Complaint?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The complaint record will be
              permanently removed.
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
