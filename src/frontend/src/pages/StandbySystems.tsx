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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowUpDown, Edit2, Plus, Search, Server, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { StandbySystem } from "../backend";
import type {
  Variant_available_inUse_retired,
  Variant_fair_good_poor,
} from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import {
  useCreateStandbySystem,
  useDeleteStandbySystem,
  useGetAllSections,
  useGetAllStandbySystems,
  useUpdateStandbySystem,
} from "../hooks/useQueries";

// Updated status options as requested
const STANDBY_STATUSES = [
  { value: "available", label: "Available" },
  { value: "issueReported", label: "Issue Reported" },
  { value: "eWaste", label: "e-Waste" },
  { value: "others", label: "Others" },
] as const;

type StandbyStatus = (typeof STANDBY_STATUSES)[number]["value"];

const statusLabels: Record<string, string> = {
  available: "Available",
  issueReported: "Issue Reported",
  eWaste: "e-Waste",
  others: "Others",
  // legacy values kept for display compatibility
  inUse: "In Use",
  retired: "Retired",
};

type UnitType = "CPU" | "Monitor" | "Other";

const unitTypeBadge: Record<UnitType, string> = {
  CPU: "bg-blue-100 text-blue-700 border-blue-200",
  Monitor: "bg-purple-100 text-purple-700 border-purple-200",
  Other: "bg-muted text-muted-foreground border-border",
};

const statusBadge: Record<string, string> = {
  available: "bg-green-100 text-green-700 border-green-200",
  issueReported: "bg-orange-100 text-orange-700 border-orange-200",
  eWaste: "bg-red-100 text-red-700 border-red-200",
  others: "bg-muted text-muted-foreground border-border",
  // legacy
  inUse: "bg-orange-100 text-orange-700 border-orange-200",
  retired: "bg-red-100 text-red-700 border-red-200",
};

function formatDate(ts: bigint | number | undefined): string {
  if (!ts) return "—";
  const ms = typeof ts === "bigint" ? Number(ts) : ts;
  if (!ms || ms === 0) return "—";
  return new Date(ms).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

const emptyForm = () => ({
  serialNumber: "",
  model: "",
  brand: "CPU" as UnitType,
  condition: "good" as "good" | "fair" | "poor",
  status: "available" as StandbyStatus,
  assignedSectionId: "",
  notes: "",
});

export default function StandbySystems() {
  const { isLoggedIn } = useAdmin();
  const { data: systems = [], isLoading } = useGetAllStandbySystems();
  const { data: sections = [] } = useGetAllSections();
  const createMutation = useCreateStandbySystem();
  const updateMutation = useUpdateStandbySystem();
  const deleteMutation = useDeleteStandbySystem();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<StandbySystem | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  const sectionName = (id?: string) =>
    id ? (sections.find((s) => s.id === id)?.name ?? id) : "—";

  const resolveUnitType = (brand: string): UnitType => {
    if (brand === "Monitor") return "Monitor";
    if (brand === "Other") return "Other";
    return "CPU";
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: sections used indirectly
  const filteredSystems = useMemo(() => {
    let list = [...systems];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.serialNumber.toLowerCase().includes(q) ||
          s.model.toLowerCase().includes(q) ||
          (s.assignedSectionId
            ? (sections.find((sec) => sec.id === s.assignedSectionId)?.name ??
              s.assignedSectionId)
            : ""
          )
            .toLowerCase()
            .includes(q),
      );
    }
    list.sort((a, b) => {
      const cmp = a.serialNumber.localeCompare(b.serialNumber);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [systems, search, sortAsc, sections]);

  const openAdd = () => {
    setEditingSystem(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (system: StandbySystem) => {
    setEditingSystem(system);
    setForm({
      serialNumber: system.serialNumber,
      model: system.model,
      brand: resolveUnitType(system.brand),
      condition: system.condition as "good" | "fair" | "poor",
      status: system.status as StandbyStatus,
      assignedSectionId: system.assignedSectionId ?? "",
      notes: system.notes,
    });
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.serialNumber.trim() || !form.model.trim() || !form.brand) {
      toast.error("Serial number, model, and unit type are required");
      return;
    }
    const data: StandbySystem = {
      id: editingSystem?.id ?? crypto.randomUUID(),
      serialNumber: form.serialNumber,
      model: form.model,
      brand: form.brand,
      condition: form.condition as Variant_fair_good_poor,
      status: form.status as Variant_available_inUse_retired,
      assignedSectionId: form.assignedSectionId || undefined,
      notes: form.notes,
      createdAt: editingSystem?.createdAt ?? BigInt(Date.now()),
    };
    try {
      if (editingSystem) {
        await updateMutation.mutateAsync(data);
        toast.success("System updated");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("System added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save system");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success("System deleted");
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete system");
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5 animate-fade-in" data-ocid="standby.section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Standby Systems
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Track spare and standby hardware units
          </p>
        </div>
        {isLoggedIn && (
          <Button
            onClick={openAdd}
            size="sm"
            className="gap-2"
            data-ocid="standby.primary_button"
          >
            <Plus className="w-4 h-4" />
            Add System
          </Button>
        )}
      </div>

      {/* Search + Sort bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by serial, model, or section…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-ocid="standby.search_input"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => setSortAsc((v) => !v)}
          data-ocid="standby.toggle"
        >
          <ArrowUpDown className="w-4 h-4" />
          Serial {sortAsc ? "A→Z" : "Z→A"}
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3" data-ocid="standby.loading_state">
            {["sk1", "sk2", "sk3", "sk4"].map((sk) => (
              <Skeleton key={sk} className="h-12 w-full" />
            ))}
          </div>
        ) : filteredSystems.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
            data-ocid="standby.empty_state"
          >
            <Server className="w-12 h-12 opacity-30" />
            <p className="font-display font-semibold">
              {search ? "No matching systems" : "No standby systems"}
            </p>
            <p className="text-sm">
              {isLoggedIn && !search
                ? "Add spare systems to track them here"
                : "No standby systems registered"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="standby.table">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-display text-xs uppercase tracking-wide w-12">
                    Sl No
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Device Type
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Serial Number
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Make / Model
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Previous Section
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Date Moved to Standby
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Status
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
                {filteredSystems.map((system, idx) => {
                  const ut = resolveUnitType(system.brand);
                  return (
                    <TableRow
                      key={system.id}
                      data-ocid={`standby.row.${idx + 1}`}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <TableCell className="text-xs text-muted-foreground text-center">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-semibold px-2 py-0.5 rounded-full border",
                            unitTypeBadge[ut],
                          )}
                        >
                          {ut}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {system.serialNumber}
                      </TableCell>
                      <TableCell>
                        <p className="font-semibold text-sm">{system.model}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {sectionName(system.assignedSectionId)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(system.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full border",
                            statusBadge[system.status] ??
                              "bg-muted text-muted-foreground border-border",
                          )}
                        >
                          {statusLabels[system.status] ?? system.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[160px] truncate">
                        {system.notes || "—"}
                      </TableCell>
                      {isLoggedIn && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openEdit(system)}
                              data-ocid={`standby.edit_button.${idx + 1}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 hover:text-destructive"
                              onClick={() => openDelete(system.id)}
                              data-ocid={`standby.delete_button.${idx + 1}`}
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

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-ocid="standby.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingSystem ? "Edit Standby System" : "Add Standby System"}
            </DialogTitle>
            <DialogDescription>
              Register spare hardware details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ss-serial">Serial Number *</Label>
              <Input
                id="ss-serial"
                placeholder="SN-XXXX"
                value={form.serialNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, serialNumber: e.target.value }))
                }
                data-ocid="standby.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ss-model">Make / Model *</Label>
              <Input
                id="ss-model"
                placeholder="e.g. HP 290 G3"
                value={form.model}
                onChange={(e) =>
                  setForm((f) => ({ ...f, model: e.target.value }))
                }
                data-ocid="standby.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Device Type *</Label>
              <Select
                value={form.brand}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, brand: v as UnitType }))
                }
              >
                <SelectTrigger data-ocid="standby.select">
                  <SelectValue placeholder="Select unit type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CPU">CPU</SelectItem>
                  <SelectItem value="Monitor">Monitor</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    status: v as StandbyStatus,
                  }))
                }
              >
                <SelectTrigger data-ocid="standby.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STANDBY_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Previous Section</Label>
              <Select
                value={form.assignedSectionId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    assignedSectionId: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger data-ocid="standby.select">
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ss-notes">Remarks</Label>
              <Textarea
                id="ss-notes"
                placeholder="Additional remarks..."
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                data-ocid="standby.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="standby.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-ocid="standby.submit_button"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingSystem ? "Update" : "Add"} System
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="standby.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete Standby System?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="standby.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="standby.confirm_button"
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
