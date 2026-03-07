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
import { AlertCircle, Edit2, Package, Plus, Trash2 } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { AMCPart } from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import {
  useCreateAMCPart,
  useDeleteAMCPart,
  useGetAllAMCParts,
  useGetAllComputers,
  useGetAllSections,
  useUpdateAMCPart,
} from "../hooks/useQueries";
import { bigIntToDateStr, dateToBigInt, formatDate } from "../utils/formatters";

function isExpiringOrExpired(
  warrantyExpiry?: bigint,
): "expired" | "expiring" | null {
  if (!warrantyExpiry || warrantyExpiry === BigInt(0)) return null;
  const now = Date.now();
  const expMs = Number(warrantyExpiry);
  if (expMs < now) return "expired";
  if (expMs - now < 30 * 24 * 60 * 60 * 1000) return "expiring";
  return null;
}

const emptyForm = () => ({
  partName: "",
  partNumber: "",
  quantity: "1",
  supplier: "",
  purchaseDate: "",
  warrantyExpiry: "",
  associatedComputerId: "",
  associatedSectionId: "",
  notes: "",
});

export default function AMCParts() {
  const { isLoggedIn } = useAdmin();
  const { data: parts = [], isLoading } = useGetAllAMCParts();
  const { data: sections = [] } = useGetAllSections();
  const { data: computers = [] } = useGetAllComputers();
  const createMutation = useCreateAMCPart();
  const updateMutation = useUpdateAMCPart();
  const deleteMutation = useDeleteAMCPart();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<AMCPart | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());

  const sectionName = (id?: string) =>
    id ? (sections.find((s) => s.id === id)?.name ?? id) : null;
  const computerName = (id?: string) =>
    id ? (computers.find((c) => c.id === id)?.model ?? id) : null;

  const openAdd = () => {
    setEditingPart(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (part: AMCPart) => {
    setEditingPart(part);
    setForm({
      partName: part.partName,
      partNumber: part.partNumber,
      quantity: String(part.quantity),
      supplier: part.supplier,
      purchaseDate: bigIntToDateStr(part.purchaseDate),
      warrantyExpiry: bigIntToDateStr(part.warrantyExpiry),
      associatedComputerId: part.associatedComputerId ?? "",
      associatedSectionId: part.associatedSectionId ?? "",
      notes: part.notes,
    });
    setDialogOpen(true);
  };

  const openDelete = (id: string) => {
    setDeletingId(id);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.partName.trim() || !form.partNumber.trim()) {
      toast.error("Part name and part number are required");
      return;
    }
    const data: AMCPart = {
      id: editingPart?.id ?? crypto.randomUUID(),
      partName: form.partName,
      partNumber: form.partNumber,
      quantity: BigInt(Number.parseInt(form.quantity) || 1),
      supplier: form.supplier,
      purchaseDate: dateToBigInt(form.purchaseDate),
      warrantyExpiry: form.warrantyExpiry
        ? dateToBigInt(form.warrantyExpiry)
        : undefined,
      associatedComputerId: form.associatedComputerId || undefined,
      associatedSectionId: form.associatedSectionId || undefined,
      notes: form.notes,
      createdAt: editingPart?.createdAt ?? BigInt(Date.now()),
    };
    try {
      if (editingPart) {
        await updateMutation.mutateAsync(data);
        toast.success("Part updated");
      } else {
        await createMutation.mutateAsync(data);
        toast.success("Part added");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Failed to save part");
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await deleteMutation.mutateAsync(deletingId);
      toast.success("Part deleted");
      setDeleteDialogOpen(false);
    } catch {
      toast.error("Failed to delete part");
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-5 animate-fade-in" data-ocid="amc-parts.section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            AMC Parts
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage Annual Maintenance Contract parts inventory
          </p>
        </div>
        {isLoggedIn && (
          <Button
            onClick={openAdd}
            size="sm"
            className="gap-2"
            data-ocid="amc-parts.primary_button"
          >
            <Plus className="w-4 h-4" />
            Add Part
          </Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-3" data-ocid="amc-parts.loading_state">
            {["sk1", "sk2", "sk3", "sk4"].map((sk) => (
              <Skeleton key={sk} className="h-12 w-full" />
            ))}
          </div>
        ) : parts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3"
            data-ocid="amc-parts.empty_state"
          >
            <Package className="w-12 h-12 opacity-30" />
            <p className="font-display font-semibold">No AMC parts logged</p>
            <p className="text-sm">
              {isLoggedIn
                ? "Add parts to track AMC inventory"
                : "No parts have been added yet"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table data-ocid="amc-parts.table">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Part Name
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Part No.
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Qty
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Supplier
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Associated
                  </TableHead>
                  <TableHead className="font-display text-xs uppercase tracking-wide">
                    Warranty Expiry
                  </TableHead>
                  {isLoggedIn && (
                    <TableHead className="font-display text-xs uppercase tracking-wide text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {parts.map((part, idx) => {
                  const warrantyStatus = isExpiringOrExpired(
                    part.warrantyExpiry,
                  );
                  return (
                    <TableRow
                      key={part.id}
                      data-ocid={`amc-parts.row.${idx + 1}`}
                      className={cn(
                        "hover:bg-muted/20 transition-colors",
                        warrantyStatus === "expired" && "amc-expired",
                        warrantyStatus === "expiring" && "amc-expiring",
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {warrantyStatus && (
                            <AlertCircle
                              className={cn(
                                "w-3.5 h-3.5 flex-shrink-0",
                                warrantyStatus === "expired"
                                  ? "text-red-500"
                                  : "text-yellow-500",
                              )}
                            />
                          )}
                          <span className="font-medium text-sm">
                            {part.partName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono-data text-xs text-muted-foreground">
                        {part.partNumber}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        {String(part.quantity)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {part.supplier || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sectionName(part.associatedSectionId) ??
                          computerName(part.associatedComputerId) ??
                          "—"}
                      </TableCell>
                      <TableCell>
                        {part.warrantyExpiry ? (
                          <span
                            className={cn(
                              "text-xs font-medium px-2 py-0.5 rounded-full border",
                              warrantyStatus === "expired"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : warrantyStatus === "expiring"
                                  ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                                  : "bg-green-100 text-green-800 border-green-200",
                            )}
                          >
                            {formatDate(part.warrantyExpiry)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      {isLoggedIn && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => openEdit(part)}
                              data-ocid={`amc-parts.edit_button.${idx + 1}`}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 hover:text-destructive"
                              onClick={() => openDelete(part.id)}
                              data-ocid={`amc-parts.delete_button.${idx + 1}`}
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
        <DialogContent className="max-w-2xl" data-ocid="amc-parts.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingPart ? "Edit AMC Part" : "Add AMC Part"}
            </DialogTitle>
            <DialogDescription>
              Track spare parts under Annual Maintenance Contracts.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Part Name *</Label>
              <Input
                id="p-name"
                placeholder="e.g. RAM Module DDR4 8GB"
                value={form.partName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, partName: e.target.value }))
                }
                data-ocid="amc-parts.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-number">Part Number *</Label>
              <Input
                id="p-number"
                placeholder="e.g. KCP426NS6/8"
                value={form.partNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, partNumber: e.target.value }))
                }
                data-ocid="amc-parts.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-qty">Quantity</Label>
              <Input
                id="p-qty"
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
                data-ocid="amc-parts.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-supplier">Supplier</Label>
              <Input
                id="p-supplier"
                placeholder="e.g. Kingston Technology"
                value={form.supplier}
                onChange={(e) =>
                  setForm((f) => ({ ...f, supplier: e.target.value }))
                }
                data-ocid="amc-parts.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-purchase">Purchase Date</Label>
              <Input
                id="p-purchase"
                type="date"
                value={form.purchaseDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, purchaseDate: e.target.value }))
                }
                data-ocid="amc-parts.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-warranty">Warranty Expiry</Label>
              <Input
                id="p-warranty"
                type="date"
                value={form.warrantyExpiry}
                onChange={(e) =>
                  setForm((f) => ({ ...f, warrantyExpiry: e.target.value }))
                }
                data-ocid="amc-parts.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Associated Section</Label>
              <Select
                value={form.associatedSectionId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    associatedSectionId: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger data-ocid="amc-parts.select">
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
              <Label>Associated Computer</Label>
              <Select
                value={form.associatedComputerId || "__none__"}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    associatedComputerId: v === "__none__" ? "" : v,
                  }))
                }
              >
                <SelectTrigger data-ocid="amc-parts.select">
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="p-notes">Notes</Label>
              <Textarea
                id="p-notes"
                placeholder="Additional information..."
                rows={2}
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                data-ocid="amc-parts.textarea"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="amc-parts.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              data-ocid="amc-parts.submit_button"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingPart ? "Update" : "Add"} Part
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-ocid="amc-parts.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">
              Delete Part?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="amc-parts.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="amc-parts.confirm_button"
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
