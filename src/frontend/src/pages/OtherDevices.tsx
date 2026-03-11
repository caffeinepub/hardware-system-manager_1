import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdmin } from "@/contexts/AdminContext";
import { useActor } from "@/hooks/useActor";
import { Download, Pencil, Plus, Search, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const UNIT_ARTICLES = [
  "Printer",
  "Scanner",
  "Biometric Device",
  "Thermal Printer",
  "Franking Machine",
  "UPS",
  "Laptop",
  "Photocopier",
  "Other",
] as const;

type UnitArticle = (typeof UNIT_ARTICLES)[number];

const WORKING_STATUSES = ["Working", "Not Working", "Under Repair"] as const;

interface OtherDevice {
  id: string;
  slNo: bigint;
  unitArticle: string;
  makeAndModel: string;
  serialNumber: string;
  section: string;
  ipAddress: string;
  workingStatus: string;
  remarks: string;
  createdAt: bigint;
}

const emptyForm = {
  unitArticle: "" as string,
  makeAndModel: "",
  serialNumber: "",
  section: "",
  ipAddress: "",
  workingStatus: "Working" as string,
  remarks: "",
};

function statusBadge(status: string) {
  if (status === "Working")
    return (
      <Badge className="bg-green-100 text-green-800 border border-green-200">
        Working
      </Badge>
    );
  if (status === "Not Working")
    return (
      <Badge className="bg-red-100 text-red-800 border border-red-200">
        Not Working
      </Badge>
    );
  return (
    <Badge className="bg-orange-100 text-orange-800 border border-orange-200">
      Under Repair
    </Badge>
  );
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export default function OtherDevices() {
  const { isLoggedIn, isAdmin, isAuthorized } = useAdmin();
  const canEdit = isLoggedIn && (isAdmin || isAuthorized);
  const { actor } = useActor();

  const [devices, setDevices] = useState<OtherDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDevice, setEditDevice] = useState<OtherDevice | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);

  const loadDevices = useCallback(async () => {
    if (!actor) return;
    try {
      // biome-ignore lint/suspicious/noExplicitAny: backend method
      const result = await actor.getAllOtherDevices();
      setDevices(result as OtherDevice[]);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, [actor]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  function openAdd() {
    setEditDevice(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  }

  function openEdit(device: OtherDevice) {
    setEditDevice(device);
    setForm({
      unitArticle: device.unitArticle,
      makeAndModel: device.makeAndModel,
      serialNumber: device.serialNumber,
      section: device.section,
      ipAddress: device.ipAddress,
      workingStatus: device.workingStatus,
      remarks: device.remarks,
    });
    setDialogOpen(true);
  }

  async function saveDevice() {
    if (!form.unitArticle) {
      toast.error("Unit Article is required");
      return;
    }
    if (!form.makeAndModel) {
      toast.error("Make & Model is required");
      return;
    }
    if (!form.serialNumber) {
      toast.error("Serial Number is required");
      return;
    }
    if (!actor) {
      toast.error("Not connected. Please log in.");
      return;
    }
    // Check duplicate serial number
    const duplicate = devices.find(
      (d) =>
        d.serialNumber.trim().toLowerCase() ===
          form.serialNumber.trim().toLowerCase() &&
        (!editDevice || d.id !== editDevice.id),
    );
    if (duplicate) {
      toast.error("A device with this Serial Number already exists");
      return;
    }

    setSaving(true);
    try {
      // biome-ignore lint/suspicious/noExplicitAny: backend method
      const a = actor;
      if (editDevice) {
        await a.updateOtherDevice({
          ...editDevice,
          unitArticle: form.unitArticle,
          makeAndModel: form.makeAndModel,
          serialNumber: form.serialNumber,
          section: form.section,
          ipAddress: form.ipAddress,
          workingStatus: form.workingStatus,
          remarks: form.remarks,
        });
        toast.success("Device updated successfully");
      } else {
        const maxSlNo =
          devices.length > 0
            ? Math.max(...devices.map((d) => Number(d.slNo)))
            : 0;
        const newDevice: OtherDevice = {
          id: `od-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          slNo: BigInt(maxSlNo + 1),
          unitArticle: form.unitArticle,
          makeAndModel: form.makeAndModel,
          serialNumber: form.serialNumber,
          section: form.section,
          ipAddress: form.ipAddress,
          workingStatus: form.workingStatus,
          remarks: form.remarks,
          createdAt: BigInt(Date.now()) * BigInt(1_000_000),
        };
        await a.createOtherDevice(newDevice);
        toast.success("Device added successfully");
      }
      setDialogOpen(false);
      await loadDevices();
    } catch (e) {
      console.error(e);
      toast.error(
        `Failed to save device: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteDevice(id: string) {
    if (!confirm("Delete this device?")) return;
    if (!actor) return;
    try {
      // biome-ignore lint/suspicious/noExplicitAny: backend method
      await actor.deleteOtherDevice(id);
      toast.success("Device deleted");
      await loadDevices();
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete device");
    }
  }

  function exportCSV() {
    const headers = [
      "Sl No",
      "Unit Article",
      "Make and Model",
      "Serial Number",
      "Section",
      "IP Address",
      "Working Status",
      "Remarks",
    ];
    const rows = devices
      .slice()
      .sort((a, b) => Number(a.slNo) - Number(b.slNo))
      .map((d) => [
        String(d.slNo),
        d.unitArticle,
        d.makeAndModel,
        d.serialNumber,
        d.section,
        d.ipAddress,
        d.workingStatus,
        d.remarks,
      ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "other-devices.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadTemplate() {
    const headers = [
      "Sl No",
      "Unit Article",
      "Make and Model",
      "Serial Number",
      "Section",
      "IP Address",
      "Working Status",
      "Remarks",
    ];
    const example = [
      "1",
      "Printer",
      "HP LaserJet Pro M404dn",
      "SN123456",
      "D1",
      "192.168.1.10",
      "Working",
      "Main office printer",
    ];
    const csv = [headers, example]
      .map((r) => r.map((c) => `"${c}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "other-devices-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !actor) return;
    if (importRef.current) importRef.current.value = "";

    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      if (lines.length < 2) {
        toast.error("CSV file is empty or has no data rows");
        return;
      }

      // biome-ignore lint/suspicious/noExplicitAny: backend method
      const a = actor;
      const currentDevices: OtherDevice[] = await a.getAllOtherDevices();
      const serialMap = new Map(
        currentDevices.map((d) => [d.serialNumber.trim().toLowerCase(), d]),
      );

      let maxSlNo =
        currentDevices.length > 0
          ? Math.max(...currentDevices.map((d) => Number(d.slNo)))
          : 0;

      let added = 0;
      let updated = 0;
      let errors = 0;

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        // Columns: Sl No, Unit Article, Make and Model, Serial Number, Section, IP Address, Working Status, Remarks
        const unitArticle = cols[1] || "";
        const makeAndModel = cols[2] || "";
        const serialNumber = (cols[3] || "").trim();
        const section = cols[4] || "";
        const ipAddress = cols[5] || "";
        const workingStatus = cols[6] || "Working";
        const remarks = cols[7] || "";

        if (!serialNumber || !makeAndModel) {
          errors++;
          continue;
        }

        const normalizedStatus = WORKING_STATUSES.includes(
          workingStatus as (typeof WORKING_STATUSES)[number],
        )
          ? workingStatus
          : "Working";

        const existing = serialMap.get(serialNumber.toLowerCase());
        if (existing) {
          // Update existing
          await a.updateOtherDevice({
            ...existing,
            unitArticle: unitArticle || existing.unitArticle,
            makeAndModel,
            section,
            ipAddress,
            workingStatus: normalizedStatus,
            remarks,
          });
          updated++;
        } else {
          maxSlNo++;
          const newDevice: OtherDevice = {
            id: `od-${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`,
            slNo: BigInt(maxSlNo),
            unitArticle,
            makeAndModel,
            serialNumber,
            section,
            ipAddress,
            workingStatus: normalizedStatus,
            remarks,
            createdAt: BigInt(Date.now()) * BigInt(1_000_000),
          };
          await a.createOtherDevice(newDevice);
          serialMap.set(serialNumber.toLowerCase(), newDevice);
          added++;
        }
      }

      await loadDevices();
      toast.success(
        `Import complete: ${added} added, ${updated} updated${
          errors > 0 ? `, ${errors} skipped (missing data)` : ""
        }`,
      );
    } catch (e) {
      console.error(e);
      toast.error(
        `Import failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setImporting(false);
    }
  }

  const searchLower = search.toLowerCase();
  const filteredDevices = devices.filter((d) => {
    const matchesSearch =
      !search ||
      d.unitArticle.toLowerCase().includes(searchLower) ||
      d.makeAndModel.toLowerCase().includes(searchLower) ||
      d.serialNumber.toLowerCase().includes(searchLower) ||
      d.section.toLowerCase().includes(searchLower);
    const matchesCategory =
      filterCategory === "All" || d.unitArticle === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories =
    filterCategory === "All" ? UNIT_ARTICLES : [filterCategory as UnitArticle];

  return (
    <div className="space-y-6" data-ocid="other-devices.page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Other Devices Inventory
          </h1>
          <p className="text-sm text-muted-foreground">
            Register of non-CPU devices: printers, UPS, laptops, etc.
          </p>
        </div>
        {canEdit && (
          <Button
            size="sm"
            onClick={openAdd}
            data-ocid="other-devices.add.primary_button"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Device
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search devices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-ocid="other-devices.search_input"
          />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger
            className="w-48"
            data-ocid="other-devices.category.select"
          >
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {UNIT_ARTICLES.map((art) => (
              <SelectItem key={art} value={art}>
                {art}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Category sections */}
      {loading ? (
        <div
          className="text-center py-12 text-muted-foreground"
          data-ocid="other-devices.loading_state"
        >
          Loading devices...
        </div>
      ) : (
        categories.map((category) => {
          const catDevices = filteredDevices
            .filter((d) => d.unitArticle === category)
            .sort((a, b) => Number(a.slNo) - Number(b.slNo));
          if (catDevices.length === 0 && filterCategory !== category)
            return null;
          return (
            <Card key={category} className="border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                  {category}s
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {catDevices.length === 0 ? (
                  <div
                    className="text-center py-8 text-muted-foreground text-sm"
                    data-ocid={`other-devices.${category.toLowerCase().replace(/\s+/g, "-")}.empty_state`}
                  >
                    No {category} records
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table
                      data-ocid={`other-devices.${category.toLowerCase().replace(/\s+/g, "-")}.table`}
                    >
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead className="w-12">Sl No</TableHead>
                          <TableHead>Make & Model</TableHead>
                          <TableHead>Serial Number</TableHead>
                          <TableHead>Section</TableHead>
                          <TableHead>IP Address</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Remarks</TableHead>
                          {canEdit && (
                            <TableHead className="w-20">Actions</TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catDevices.map((device, idx) => (
                          <TableRow
                            key={device.id}
                            data-ocid={`other-devices.${category.toLowerCase().replace(/\s+/g, "-")}.item.${idx + 1}`}
                          >
                            <TableCell className="font-mono text-sm">
                              {String(device.slNo)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {device.makeAndModel}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {device.serialNumber}
                            </TableCell>
                            <TableCell>{device.section}</TableCell>
                            <TableCell className="font-mono text-sm">
                              {device.ipAddress || "-"}
                            </TableCell>
                            <TableCell>
                              {statusBadge(device.workingStatus)}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {device.remarks || "-"}
                            </TableCell>
                            {canEdit && (
                              <TableCell>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => openEdit(device)}
                                    data-ocid={`other-devices.edit_button.${idx + 1}`}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 hover:text-destructive"
                                    onClick={() => deleteDevice(device.id)}
                                    data-ocid={`other-devices.delete_button.${idx + 1}`}
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
              </CardContent>
            </Card>
          );
        })
      )}

      {/* Import / Export */}
      <Card className="border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Data Import / Export
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center">
            {canEdit && (
              <>
                <input
                  ref={importRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleImportFile}
                  data-ocid="other-devices.upload_button"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={importing}
                  onClick={() => importRef.current?.click()}
                  data-ocid="other-devices.import.button"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  {importing ? "Importing..." : "Import CSV"}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              data-ocid="other-devices.export.button"
            >
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={downloadTemplate}
              data-ocid="other-devices.template.button"
            >
              Download CSV Template
            </Button>
            <p className="text-xs text-muted-foreground ml-1">
              CSV columns: Sl No, Unit Article, Make and Model, Serial Number,
              Section, IP Address, Working Status, Remarks. Existing serial
              numbers will be updated instead of duplicated.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" data-ocid="other-devices.dialog">
          <DialogHeader>
            <DialogTitle>
              {editDevice ? "Edit Device" : "Add Device"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label>
                Unit Article <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.unitArticle}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, unitArticle: v }))
                }
              >
                <SelectTrigger data-ocid="other-devices.unit-article.select">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_ARTICLES.map((art) => (
                    <SelectItem key={art} value={art}>
                      {art}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>
                Make & Model <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.makeAndModel}
                onChange={(e) =>
                  setForm((f) => ({ ...f, makeAndModel: e.target.value }))
                }
                placeholder="e.g. HP LaserJet Pro M404dn"
                data-ocid="other-devices.make-model.input"
              />
            </div>
            <div className="space-y-1">
              <Label>
                Serial Number <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.serialNumber}
                onChange={(e) =>
                  setForm((f) => ({ ...f, serialNumber: e.target.value }))
                }
                placeholder="Serial no."
                data-ocid="other-devices.serial.input"
              />
            </div>
            <div className="space-y-1">
              <Label>Section</Label>
              <Input
                value={form.section}
                onChange={(e) =>
                  setForm((f) => ({ ...f, section: e.target.value }))
                }
                placeholder="Department / Room"
                data-ocid="other-devices.section.input"
              />
            </div>
            <div className="space-y-1">
              <Label>IP Address</Label>
              <Input
                value={form.ipAddress}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ipAddress: e.target.value }))
                }
                placeholder="Optional"
                data-ocid="other-devices.ip.input"
              />
            </div>
            <div className="space-y-1">
              <Label>Working Status</Label>
              <Select
                value={form.workingStatus}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, workingStatus: v }))
                }
              >
                <SelectTrigger data-ocid="other-devices.status.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKING_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Remarks</Label>
              <Input
                value={form.remarks}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remarks: e.target.value }))
                }
                placeholder="Any notes"
                data-ocid="other-devices.remarks.input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="other-devices.cancel.button"
            >
              Cancel
            </Button>
            <Button
              onClick={saveDevice}
              disabled={saving}
              data-ocid="other-devices.save.primary_button"
            >
              {saving ? "Saving..." : editDevice ? "Update" : "Add Device"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
