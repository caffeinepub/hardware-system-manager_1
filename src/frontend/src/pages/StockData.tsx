import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Cpu, Database, Monitor } from "lucide-react";
import { useState } from "react";
import { useGetAllComputers, useGetAllSections } from "../hooks/useQueries";

export default function StockData() {
  const { data: computers = [], isLoading: computersLoading } =
    useGetAllComputers();
  const { data: sections = [], isLoading: sectionsLoading } =
    useGetAllSections();

  const [filterSection, setFilterSection] = useState<string>("all");

  const isLoading = computersLoading || sectionsLoading;

  const sectionName = (id: string) =>
    sections.find((s) => s.id === id)?.name ?? id;

  const filtered =
    filterSection === "all"
      ? computers
      : computers.filter((c) => c.sectionId === filterSection);

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="stock.section">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-foreground">
            Stock Data
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Default CPU &amp; Monitor pairs per seat
          </p>
        </div>
        <div className="flex-shrink-0 w-full sm:w-56">
          <Select value={filterSection} onValueChange={setFilterSection}>
            <SelectTrigger data-ocid="stock.select">
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
          data-ocid="stock.loading_state"
        >
          {["sk1", "sk2", "sk3", "sk4", "sk5", "sk6"].map((sk) => (
            <Skeleton key={sk} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 rounded-xl border-2 border-dashed border-border text-muted-foreground gap-4"
          data-ocid="stock.empty_state"
        >
          <Database className="w-12 h-12 opacity-30" />
          <p className="font-display font-semibold text-lg text-foreground">
            No stock data
          </p>
          <p className="text-sm text-center max-w-xs">
            {filterSection !== "all"
              ? "No computers registered in this section"
              : "Import devices or add computers to see stock data here"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((computer, idx) => (
            <div
              key={computer.id}
              className="rounded-xl border border-border bg-card shadow-card overflow-hidden transition-all hover:shadow-card-hover hover:border-primary/30"
              data-ocid={`stock.item.${idx + 1}`}
            >
              {/* Card top */}
              <div className="px-4 py-3 bg-gradient-to-r from-primary/8 to-transparent border-b border-border flex items-center justify-between gap-2">
                <Badge
                  variant="outline"
                  className="text-xs font-medium truncate max-w-[160px]"
                >
                  {sectionName(computer.sectionId)}
                </Badge>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border status-badge-${computer.status}`}
                >
                  {computer.status}
                </span>
              </div>

              {/* Seat + user */}
              <div className="px-4 pt-4 pb-2 text-center border-b border-border/50">
                <p className="text-2xl font-display font-bold text-foreground">
                  Seat {computer.seatNumber || "—"}
                </p>
                <sub className="text-xs text-muted-foreground mt-0.5 block not-italic">
                  {computer.currentUser || "Unassigned"}
                </sub>
              </div>

              {/* CPU + Monitor */}
              <div className="px-4 py-3 grid grid-cols-2 gap-3">
                {/* CPU */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <Cpu className="w-3.5 h-3.5" />
                    CPU
                  </div>
                  <p className="font-mono-data text-xs text-foreground truncate">
                    {computer.serialNumber || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {computer.model || "—"}
                  </p>
                </div>

                {/* Monitor */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    <Monitor className="w-3.5 h-3.5" />
                    Monitor
                  </div>
                  <p className="font-mono-data text-xs text-foreground truncate">
                    {computer.monitorSerial || "—"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {computer.monitorModel || "—"}
                  </p>
                </div>
              </div>

              {/* IPs */}
              {(computer.ip1 || computer.ip2) && (
                <div className="px-4 pb-2 flex flex-wrap gap-2">
                  {computer.ip1 && (
                    <span className="font-mono-data text-xs bg-muted/60 text-foreground px-2 py-0.5 rounded-md border border-border">
                      {computer.ip1}
                    </span>
                  )}
                  {computer.ip2 && (
                    <span className="font-mono-data text-xs bg-muted/60 text-foreground px-2 py-0.5 rounded-md border border-border">
                      {computer.ip2}
                    </span>
                  )}
                </div>
              )}

              {/* Remarks */}
              {computer.remarks && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-muted-foreground line-clamp-2 italic">
                    {computer.remarks}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
