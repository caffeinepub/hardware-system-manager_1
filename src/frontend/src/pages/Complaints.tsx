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
import { AlertTriangle, Edit2, Plus, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Complaint } from "../backend";
import type {
  Variant_low_high_medium,
  Variant_resolved_open_inProgress,
} from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import {
  useCreateComplaint,
  useDeleteComplaint,
  useGetAllComplaints,
  useGetAllComputers,
  useGetAllSections,
  useUpdateComplaint,
} from "../hooks/useQueries";
import { formatDate } from "../utils/formatters";

const statusLabels: Record<string, string> = {
  open: "Open",
  inProgress: "In Progress",
  resolved: "Resolved",
};

const priorityLabels: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const emptyForm = () => ({
  reportedBy: "",
  description: "",
  priority: "medium" as "high" | "medium" | "low",
  status: "open" as "open" | "inProgress" | "resolved",
  sectionId: "",
  computerId: "",
});

function ComplaintTable({
  complaints,
  isLoggedIn,
  sections,
  computers,
  onEdit,
  onDelete,
}: {
  complaints: Complaint[];
  isLoggedIn: boolean;
  sections: { id: string; name: string }[];
  computers: { id: string; model: string; serialNumber: string }[];
  onEdit: (c: Complaint) => void;
  onDelete: (id: string) => void;
}) {
  if (complaints.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3"
        data-ocid="complaints.empty_state"
      >
        <AlertTriangle className="w-10 h-10 opacity-30" />
        <p className="text-sm font-semibold">No complaints found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table data-ocid="complaints.table">
        <TableHeader>
          <TableRow className="bg-muted/40">
            <TableHead className="font-display text-xs uppercase tracking-wide">
              Reported By
            </TableHead>
            <TableHead className="font-display text-xs uppercase tracking-wide">
              Description
            </TableHead>
            <TableHead className="font-display text-xs uppercase tracking-wide">
              Priority
            </TableHead>
            <TableHead className="font-display text-xs uppercase tracking-wide">
              Status
            </TableHead>
            <TableHead className="font-display text-xs uppercase tracking-wide">
              Section/Device
            </TableHead>
            <TableHead className="font-display text-xs uppercase tracking-wide">
              Date
            </TableHead>
            {isLoggedIn && (
              <TableHead className="font-display text-xs uppercase tracking-wide text-right">
                Actions
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {complaints.map((complaint, idx) => {
            const relatedSection = complaint.sectionId
              ? sections.find((s) => s.id === complaint.sectionId)?.name
              : null;
            const relatedComputer = complaint.computerId
              ? computers.find((c) => c.id === complaint.computerId)
              : null;

            return (
              <TableRow
                key={complaint.id}
                data-ocid={`complaints.row.${idx + 1}`}
                className="hover:bg-muted/20 transition-colors"
              >
                <TableCell className="text-sm font-medium">
                  {complaint.reportedBy}
                </TableCell>
                <TableCell className="text-sm max-w-[200px]">
                  <p className="line-clamp-2">{complaint.description}</p>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                      `priority-${complaint.priority}`,
                    )}
                  >
                    {priorityLabels[complaint.priority] ?? complaint.priority}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                      `status-badge-${complaint.status}`,
                    )}
                  >
                    {statusLabels[complaint.status] ?? complaint.status}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {relatedSection ?? relatedComputer?.model ?? "—"}
                  {relatedComputer && (
                    <p className="text-xs font-mono-data">
                      {relatedComputer.serialNumber}
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(complaint.createdAt)}
                  {complaint.resolvedAt && (
                    <p className="text-green-600">
                      Resolved {formatDate(complaint.resolvedAt)}
                    </p>
                  )}
                </TableCell>
                {isLoggedIn && (
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onEdit(complaint)}
                        data-ocid={`complaints.edit_button.${idx + 1}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 hover:text-destructive"
                        onClick={() => onDelete(complaint.id)}
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
  );
}

export default function Complaints() {
  const { isLoggedIn } = useAdmin();
  const { data: complaints = [], isLoading } = useGetAllComplaints();
  const { data: sections = [] } = useGetAllSections();
  const { data: computers = [] } = useGetAllComputers();
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

  const _filteredComplaints =
    activeTab === "all"
      ? complaints
      : complaints.filter((c) => c.status === activeTab);

  const openAdd = () => {
    setEditingComplaint(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (complaint: Complaint) => {
    setEditingComplaint(complaint);
    setForm({
      reportedBy: complaint.reportedBy,
      description: complaint.description,
      priority: complaint.priority as "high" | "medium" | "low",
      status: complaint.status as "open" | "inProgress" | "resolved",
      sectionId: complaint.sectionId ?? "",
      computerId: complaint.computerId ?? "",
    });
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.reportedBy.trim() || !form.description.trim()) {
      toast.error("Reporter name and description are required");
      return;
    }
    const data: Complaint = {
      id: editingComplaint?.id ?? crypto.randomUUID(),
      reportedBy: form.reportedBy,
      description: form.description,
      priority: form.priority as Variant_low_high_medium,
      status: form.status as Variant_resolved_open_inProgress,
      sectionId: form.sectionId || undefined,
      computerId: form.computerId || undefined,
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
  const tabCounts = {
    all: complaints.length,
    open: complaints.filter((c) => c.status === "open").length,
    inProgress: complaints.filter((c) => c.status === "inProgress").length,
    resolved: complaints.filter((c) => c.status === "resolved").length,
  };

  return (
    <div className="space-y-5 animate-fade-in" data-ocid="complaints.section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Complaints
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage hardware complaints and issues
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

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="px-4 pt-3 border-b border-border">
            <TabsList className="h-9 bg-muted/50" data-ocid="complaints.tab">
              <TabsTrigger
                value="all"
                className="text-xs"
                data-ocid="complaints.tab"
              >
                All ({tabCounts.all})
              </TabsTrigger>
              <TabsTrigger
                value="open"
                className="text-xs"
                data-ocid="complaints.tab"
              >
                Open ({tabCounts.open})
              </TabsTrigger>
              <TabsTrigger
                value="inProgress"
                className="text-xs"
                data-ocid="complaints.tab"
              >
                In Progress ({tabCounts.inProgress})
              </TabsTrigger>
              <TabsTrigger
                value="resolved"
                className="text-xs"
                data-ocid="complaints.tab"
              >
                Resolved ({tabCounts.resolved})
              </TabsTrigger>
            </TabsList>
          </div>
          {isLoading ? (
            <div className="p-4 space-y-3" data-ocid="complaints.loading_state">
              {["sk1", "sk2", "sk3", "sk4"].map((sk) => (
                <Skeleton key={sk} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            ["all", "open", "inProgress", "resolved"].map((tab) => (
              <TabsContent key={tab} value={tab} className="mt-0">
                <ComplaintTable
                  complaints={
                    tab === "all"
                      ? complaints
                      : complaints.filter((c) => c.status === tab)
                  }
                  isLoggedIn={isLoggedIn}
                  sections={sections}
                  computers={computers}
                  onEdit={openEdit}
                  onDelete={openDelete}
                />
              </TabsContent>
            ))
          )}
        </Tabs>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="complaints.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingComplaint ? "Edit Complaint" : "File a Complaint"}
            </DialogTitle>
            <DialogDescription>
              Document hardware issues or complaints for tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cp-reporter">Reported By *</Label>
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="cp-desc">Description *</Label>
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
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    priority: v as "high" | "medium" | "low",
                  }))
                }
              >
                <SelectTrigger data-ocid="complaints.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            <div className="space-y-1.5">
              <Label>Related Computer</Label>
              <Select
                value={form.computerId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    computerId: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger data-ocid="complaints.select">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {computers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.model} ({c.serialNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="complaints.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete Complaint?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
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
