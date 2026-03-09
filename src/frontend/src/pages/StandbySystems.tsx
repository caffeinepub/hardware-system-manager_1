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
import { Edit2, Plus, Server, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
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

const conditionLabels: Record<string, string> = {
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};
const statusLabels: Record<string, string> = {
  available: "Available",
  inUse: "In Use",
  retired: "Retired",
};

type UnitType = "CPU" | "Monitor" | "Other";

const unitTypeBadge: Record<UnitType, string> = {
  CPU: "bg-blue-100 text-blue-700 border-blue-200",
  Monitor: "bg-purple-100 text-purple-700 border-purple-200",
  Other: "bg-muted text-muted-foreground border-border",
};

const emptyForm = () => ({
  serialNumber: "",
  model: "",
  brand: "CPU" as UnitType,
  condition: "good" as "good" | "fair" | "poor",
  status: "available" as "available" | "inUse" | "retired",
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

  const sectionName = (id?: string) =>
    id ? (sections.find((s) => s.id === id)?.name ?? id) : "—";

  const openAdd = () => {
    setEditingSystem(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const resolveUnitType = (brand: string): UnitType => {
    if (brand === "Monitor") return "Monitor";
    if (brand === "Other") return "Other";
    return "CPU"; // default for "CPU", empty, or legacy values
  };

  const openEdit = (system: StandbySystem) => {
    setEditingSystem(system);
    setForm({
      serialNumber: system.serialNumber,
      model: system.model,
      brand: resolveUnitType(system.brand),
      condition: system.condition as "good" | "fair" | "poor",
      status: system.status as "available" | "inUse" | "retired",
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

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3" data-ocid="standby.loading_state">
            {["sk1", "sk2", "sk3", "sk4"].map((sk) => (
              <Skeleton key={sk} className="h-12 w-full" />
            ))}
          </div>
        ) : systems.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
            data-ocid="standby.empty_state"
          >
            <Server className="w-12 h-12 opacity-30" />
            <p className="font-display font-semibold">No standby systems</p>
            <p className="text-sm">
              {isLoggedIn
                ? "Add spare systems to track them here"
                : "No standby systems registered"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="standby.table">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Serial No.
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Unit Type
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Model
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Condition
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Status
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Assigned Section
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Notes
                  </TableHead>
                  {isLoggedIn && (
                    <TableHead className="font-display text-xs uppercase tracking-wide text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {systems.map((system, idx) => (
                  <TableRow
                    key={system.id}
                    data-ocid={`standby.row.${idx + 1}`}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <TableCell className="font-mono-data text-xs text-muted-foreground">
                      {system.serialNumber}
                    </TableCell>
                    <TableCell>
                      {(() => {
                        const ut = (
                          system.brand === "Monitor"
                            ? "Monitor"
                            : system.brand === "Other"
                              ? "Other"
                              : "CPU"
                        ) as UnitType;
                        return (
                          <span
                            className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-full border",
                              unitTypeBadge[ut],
                            )}
                          >
                            {ut}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-sm">{system.model}</p>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full border",
                          `condition-${system.condition}`,
                        )}
                      >
                        {conditionLabels[system.condition] ?? system.condition}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-xs font-medium px-2 py-0.5 rounded-full border",
                          `status-badge-${system.status}`,
                        )}
                      >
                        {statusLabels[system.status] ?? system.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">
                      {sectionName(system.assignedSectionId)}
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
                ))}
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
              <Label htmlFor="ss-model">Model *</Label>
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
              <Label>Unit Type *</Label>
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
              <Label>Condition</Label>
              <Select
                value={form.condition}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    condition: v as "good" | "fair" | "poor",
                  }))
                }
              >
                <SelectTrigger data-ocid="standby.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
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
                    status: v as "available" | "inUse" | "retired",
                  }))
                }
              >
                <SelectTrigger data-ocid="standby.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="inUse">In Use</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned Section</Label>
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
              <Label htmlFor="ss-notes">Notes</Label>
              <Textarea
                id="ss-notes"
                placeholder="Additional notes..."
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
