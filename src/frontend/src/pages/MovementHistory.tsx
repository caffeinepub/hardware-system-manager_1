import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Download, History, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useGetAllMovementLogs } from "../hooks/useQueries";

interface MovementLog {
  id: string;
  dateTime: bigint;
  deviceType: string;
  serialNumber: string;
  action: string;
  previousSection: string;
  newSection: string;
  triggeredFrom: string;
  user: string;
  remarks: string;
}

const ACTION_LABELS: Record<string, string> = {
  assigned: "Assigned to Seat",
  removed: "Removed from Seat",
  movedToStandby: "Moved to Standby",
  assignedFromStandby: "Assigned from Standby",
  replaced: "Replaced",
  sectionTransfer: "Section Transfer",
};

const ACTION_COLORS: Record<string, string> = {
  assigned: "bg-green-100 text-green-800 border-green-200",
  removed: "bg-orange-100 text-orange-800 border-orange-200",
  movedToStandby: "bg-blue-100 text-blue-800 border-blue-200",
  assignedFromStandby: "bg-cyan-100 text-cyan-800 border-cyan-200",
  replaced: "bg-purple-100 text-purple-800 border-purple-200",
  sectionTransfer: "bg-amber-100 text-amber-800 border-amber-200",
};

const SKELETON_ROWS = ["r1", "r2", "r3", "r4", "r5", "r6"];
const SKELETON_CELLS = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8", "c9"];

function formatDateTime(dateTime: bigint): string {
  const ms = Number(dateTime) / 1_000_000;
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function exportToCSV(logs: MovementLog[]) {
  const headers = [
    "Log ID",
    "Date & Time",
    "Device Type",
    "Serial Number",
    "Action",
    "Previous Section",
    "New Section",
    "Triggered From",
    "User",
    "Remarks",
  ];
  const rows = logs.map((l) => [
    l.id.slice(0, 8),
    formatDateTime(l.dateTime),
    l.deviceType,
    l.serialNumber,
    ACTION_LABELS[l.action] ?? l.action,
    l.previousSection,
    l.newSection,
    l.triggeredFrom,
    l.user,
    l.remarks,
  ]);
  const csv = [headers, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `movement-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MovementHistory() {
  const { data: rawLogs, isLoading } = useGetAllMovementLogs();

  const [search, setSearch] = useState("");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const logs: MovementLog[] = useMemo(() => {
    if (!rawLogs) return [];
    return [...rawLogs].sort((a: MovementLog, b: MovementLog) =>
      Number(b.dateTime - a.dateTime),
    );
  }, [rawLogs]);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        l.serialNumber.toLowerCase().includes(q) ||
        l.previousSection.toLowerCase().includes(q) ||
        l.newSection.toLowerCase().includes(q) ||
        l.triggeredFrom.toLowerCase().includes(q) ||
        l.user.toLowerCase().includes(q);
      const matchesDevice =
        filterDevice === "all" || l.deviceType === filterDevice;
      const matchesAction = filterAction === "all" || l.action === filterAction;
      let matchesDate = true;
      if (filterFrom || filterTo) {
        const ms = Number(l.dateTime) / 1_000_000;
        if (filterFrom)
          matchesDate = matchesDate && ms >= new Date(filterFrom).getTime();
        if (filterTo)
          matchesDate =
            matchesDate && ms <= new Date(filterTo).getTime() + 86400000;
      }
      return matchesSearch && matchesDevice && matchesAction && matchesDate;
    });
  }, [logs, search, filterDevice, filterAction, filterFrom, filterTo]);

  return (
    <div className="space-y-6" data-ocid="movement.page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <History className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold text-xl text-foreground">
              Hardware Movement History
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Read-only audit log of all hardware assignments, removals, and
            transfers. Auto-generated by system events.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 self-start sm:self-auto"
          onClick={() => exportToCSV(filtered)}
          data-ocid="movement.upload_button"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {Object.entries(ACTION_LABELS).map(([key, label]) => {
          const count = logs.filter((l) => l.action === key).length;
          return (
            <div
              key={key}
              className="rounded-lg border border-border bg-card px-3 py-2 text-center"
            >
              <p className="text-lg font-bold text-foreground">{count}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">
            Filters & Search
          </span>
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} of {logs.length} records
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              className="pl-8 h-8 text-sm"
              placeholder="Search serial, section, user\u2026"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-ocid="movement.search_input"
            />
          </div>
          <Select value={filterDevice} onValueChange={setFilterDevice}>
            <SelectTrigger className="h-8 text-sm" data-ocid="movement.select">
              <SelectValue placeholder="Device Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Devices</SelectItem>
              <SelectItem value="CPU">CPU</SelectItem>
              <SelectItem value="Monitor">Monitor</SelectItem>
              <SelectItem value="Micro Computer">Micro Computer</SelectItem>
              <SelectItem value="All-in-One PC">All-in-One PC</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="h-8 text-sm" data-ocid="movement.select">
              <SelectValue placeholder="Action Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input
              type="date"
              className="h-8 text-sm"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              data-ocid="movement.input"
            />
            <Input
              type="date"
              className="h-8 text-sm"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              data-ocid="movement.input"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-ocid="movement.table">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="text-xs font-semibold text-muted-foreground whitespace-nowrap w-20">
                  Log ID
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Date &amp; Time
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Device
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Serial No.
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Action
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Previous Section
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  New Section
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Triggered From
                </TableHead>
                <TableHead className="text-xs font-semibold text-muted-foreground">
                  Remarks
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                SKELETON_ROWS.map((rowKey) => (
                  <TableRow key={rowKey} data-ocid="movement.loading_state">
                    {SKELETON_CELLS.map((cellKey) => (
                      <TableCell key={cellKey}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="py-12 text-center"
                    data-ocid="movement.empty_state"
                  >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <History className="w-8 h-8 opacity-30" />
                      <p className="text-sm font-medium">
                        {logs.length === 0
                          ? "No movement logs yet"
                          : "No logs match your filters"}
                      </p>
                      <p className="text-xs">
                        {logs.length === 0
                          ? "Logs are auto-generated when hardware is assigned, removed, or transferred."
                          : "Try adjusting or clearing your filters."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((log, idx) => (
                  <TableRow
                    key={log.id}
                    className="hover:bg-muted/30 transition-colors"
                    data-ocid={`movement.row.item.${idx + 1}`}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatDateTime(log.dateTime)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          log.deviceType === "CPU"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                      >
                        {log.deviceType}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.serialNumber || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          ACTION_COLORS[log.action] ??
                          "bg-gray-100 text-gray-700 border-gray-200"
                        }`}
                      >
                        {ACTION_LABELS[log.action] ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.previousSection || "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.newSection || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.triggeredFrom || "-"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                      {log.remarks || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Info note */}
      <p className="text-xs text-muted-foreground text-center pb-2">
        This is a read-only audit log. Records are automatically generated by
        system events and cannot be manually edited or deleted.
      </p>
    </div>
  );
}
