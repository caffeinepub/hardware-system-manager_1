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
import { Edit2, FileText, Monitor, Plus, Trash2, Upload } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Computer } from "../backend";
import type { Variant_active_standby_retired } from "../backend";
import { ExternalBlob } from "../backend";
import { useAdmin } from "../contexts/AdminContext";
import {
  useCreateComputer,
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
  const createMutation = useCreateComputer();
  const updateMutation = useUpdateComputer();
  const deleteMutation = useDeleteComputer();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingComputer, setEditingComputer] = useState<Computer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [datasheetFile, setDatasheetFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

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
        await createMutation.mutateAsync(computerData);
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

  const isPending = createMutation.isPending || updateMutation.isPending;

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

  // Build ordered list of section keys: known sections first, then unassigned
  const orderedSectionKeys = [
    ...sections.map((s) => s.id).filter((id) => groupedComputers[id]),
    ...(groupedComputers.__unassigned__ ? ["__unassigned__"] : []),
  ];

  const getSectionLabel = (key: string) =>
    key === "__unassigned__"
      ? "Unassigned"
      : (sections.find((s) => s.id === key)?.name ?? key);

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
            const sectionComputers = groupedComputers[sectionKey];
            const label = getSectionLabel(sectionKey);
            return (
              <div
                key={sectionKey}
                className="rounded-xl border border-border bg-card shadow-card overflow-hidden"
                data-ocid={`computers.card.${sectionIdx + 1}`}
              >
                {/* Section heading */}
                <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary opacity-70" />
                  <h3 className="font-display font-bold text-base text-foreground tracking-tight">
                    {label}
                  </h3>
                  <span className="ml-auto text-xs text-muted-foreground font-medium">
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
