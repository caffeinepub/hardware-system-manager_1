import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  Building2,
  CalendarClock,
  CalendarX2,
  CheckCircle2,
  Cpu,
  History,
  MapPin,
  Monitor,
  Package,
  Printer,
  Server,
  ShieldAlert,
  TrendingUp,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useGetAllComplaints,
  useGetAllDevices,
  useGetAllMovementLogs,
  useGetAllSeats,
  useGetAllSections,
} from "../hooks/useQueries";

const CHART_COLORS = [
  "oklch(0.52 0.14 195)",
  "oklch(0.6 0.18 145)",
  "oklch(0.65 0.18 65)",
  "oklch(0.55 0.22 25)",
  "oklch(0.58 0.18 300)",
  "oklch(0.56 0.16 240)",
  "oklch(0.62 0.2 30)",
  "oklch(0.54 0.19 160)",
];

const OTHER_DEVICE_TYPES = [
  "Printer",
  "Scanner",
  "UPS",
  "Laptop",
  "Biometric Device",
  "Thermal Printer",
  "Photocopier",
  "Franking Machine",
];

const COMPUTER_TYPES = ["CPU", "Monitor", "Micro Computer", "All-in-One PC"];

const ACTION_COLORS: Record<string, string> = {
  "Assigned to Seat": "bg-green-100 text-green-700",
  "Assigned from Standby": "bg-green-100 text-green-700",
  "Removed from Seat": "bg-orange-100 text-orange-700",
  "Moved to Standby": "bg-blue-100 text-blue-700",
  Replaced: "bg-purple-100 text-purple-700",
  "Section Transfer": "bg-teal-100 text-teal-700",
};

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
  sub,
  highlight,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
  sub?: string;
  highlight?: "red" | "orange" | "green";
}) {
  const highlightClass =
    highlight === "red"
      ? "border-2 border-red-400 bg-red-50"
      : highlight === "orange"
        ? "border-2 border-orange-400 bg-orange-50"
        : highlight === "green"
          ? "border-2 border-green-400 bg-green-50"
          : "";
  return (
    <Card
      className={`shadow-card hover:shadow-card-hover transition-shadow ${highlightClass}`}
      data-ocid="dashboard.card"
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-medium text-muted-foreground truncate">
              {title}
            </p>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <p className="text-3xl font-display font-bold text-foreground">
                {value}
              </p>
            )}
            {sub && !loading && (
              <p className="text-xs text-muted-foreground">{sub}</p>
            )}
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}
          >
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: devices = [], isLoading: devicesLoading } = useGetAllDevices();
  const { data: seats = [], isLoading: seatsLoading } = useGetAllSeats();
  const { data: complaints = [], isLoading: complaintsLoading } =
    useGetAllComplaints();
  const { data: sections = [], isLoading: sectionsLoading } =
    useGetAllSections();
  const { data: movementLogs = [], isLoading: logsLoading } =
    useGetAllMovementLogs();

  const isLoading =
    devicesLoading || seatsLoading || complaintsLoading || sectionsLoading;

  const nowMs = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // ── Key metrics ──────────────────────────────────────────────────────
  const cpusInUse = useMemo(
    () =>
      devices.filter(
        (d) =>
          d.deviceType === "CPU" && d.assignedSeatId && d.assignedSeatId !== "",
      ).length,
    [devices],
  );
  const monitorsInUse = useMemo(
    () =>
      devices.filter(
        (d) =>
          d.deviceType === "Monitor" &&
          d.assignedSeatId &&
          d.assignedSeatId !== "",
      ).length,
    [devices],
  );
  const totalSystemsActive = useMemo(() => seats.length, [seats]);
  const totalStandby = useMemo(
    () =>
      devices.filter(
        (d) =>
          COMPUTER_TYPES.includes(d.deviceType) &&
          (!d.assignedSeatId || d.assignedSeatId === "") &&
          (!d.sectionId || d.sectionId === ""),
      ).length,
    [devices],
  );

  // ── Other device breakdown ───────────────────────────────────────────────
  const otherDeviceBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of devices) {
      if (OTHER_DEVICE_TYPES.includes(d.deviceType)) {
        counts[d.deviceType] = (counts[d.deviceType] || 0) + 1;
      }
    }
    return OTHER_DEVICE_TYPES.filter((t) => (counts[t] || 0) > 0).map((t) => ({
      name: t,
      value: counts[t],
    }));
  }, [devices]);
  const totalOtherDevices = useMemo(
    () => otherDeviceBreakdown.reduce((s, d) => s + d.value, 0),
    [otherDeviceBreakdown],
  );

  // ── AMC metrics ───────────────────────────────────────────────────────────
  // Bug 1 fixed: amcExpiryDate is stored in milliseconds, no division needed
  const amcMetrics = useMemo(() => {
    let underAMC = 0;
    let expiringSoon = 0;
    let expired = 0;
    const teamCounts: Record<string, number> = {};
    const expiryDateCounts: Record<string, number> = {};
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    for (const d of devices) {
      if (!d.amcTeam || d.amcTeam === "") continue;
      const expiryMs = Number(d.amcExpiryDate); // already in milliseconds
      if (expiryMs <= 0) continue;
      underAMC++;
      teamCounts[d.amcTeam] = (teamCounts[d.amcTeam] || 0) + 1;
      const expiryDate = new Date(expiryMs);
      const dateKey = expiryDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      expiryDateCounts[dateKey] = (expiryDateCounts[dateKey] || 0) + 1;
      if (expiryMs < now) expired++;
      else if (expiryMs - now <= thirtyDays) expiringSoon++;
    }
    const teamData = Object.entries(teamCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([team, count]) => ({ team, count }));
    const expiryInsights = Object.entries(expiryDateCounts)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .slice(0, 8)
      .map(([date, count]) => ({ date, count }));
    return { underAMC, expiringSoon, expired, teamData, expiryInsights };
  }, [devices]);

  // ── Section distribution ────────────────────────────────────────────────────
  const sectionDistribution = useMemo(() => {
    const seatCountBySection: Record<string, number> = {};
    for (const seat of seats)
      seatCountBySection[seat.sectionId] =
        (seatCountBySection[seat.sectionId] || 0) + 1;
    return sections
      .map((sec) => ({
        name: sec.name,
        systems: seatCountBySection[sec.id] || 0,
      }))
      .filter((d) => d.systems > 0)
      .sort((a, b) => b.systems - a.systems)
      .slice(0, 12);
  }, [seats, sections]);

  // ── Device health ─────────────────────────────────────────────────────────
  const healthData = useMemo(() => {
    const counts: Record<string, number> = {
      Working: 0,
      "Issue Reported": 0,
      "e-Waste": 0,
      Others: 0,
    };
    for (const d of devices) {
      const s = d.workingStatus || "Working";
      if (s in counts) counts[s]++;
      else counts.Others++;
    }
    return [
      {
        name: "Working",
        value: counts.Working,
        color: "oklch(0.6 0.18 145)",
      },
      {
        name: "Issue Reported",
        value: counts["Issue Reported"],
        color: "oklch(0.55 0.22 25)",
      },
      {
        name: "e-Waste",
        value: counts["e-Waste"],
        color: "oklch(0.45 0.1 25)",
      },
      { name: "Others", value: counts.Others, color: "oklch(0.65 0.18 65)" },
    ].filter((d) => d.value > 0);
  }, [devices]);

  // ── Complaint metrics ─────────────────────────────────────────────────────
  // Bug 2 fixed: caseClearedDate is bigint | null, not an array
  // Bug 3 fixed: use caseLoggedDate (stored in ns) instead of createdAt
  const complaintMetrics = useMemo(() => {
    let pending = 0;
    let cleared = 0;
    let longPending = 0;
    const now = Date.now();
    for (const c of complaints) {
      const isCleared =
        c.caseClearedDate != null && BigInt(c.caseClearedDate) > 0n;
      if (isCleared) {
        cleared++;
      } else {
        pending++;
        const loggedMs = Number(c.caseLoggedDate ?? 0n) / 1_000_000; // ns → ms
        if (loggedMs > 0 && (now - loggedMs) / (1000 * 60 * 60 * 24) > 7)
          longPending++;
      }
    }
    return { pending, cleared, longPending, total: complaints.length };
  }, [complaints]);

  // ── Attention items ─────────────────────────────────────────────────────────
  // Bug 4 fixed: show actual expiry dates and pending days in detail
  const attentionItems = useMemo(() => {
    const items: { label: string; detail: string; type: "red" | "orange" }[] =
      [];
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    // Expired AMC — show sample dates
    const expiredDevices = devices.filter((d) => {
      if (!d.amcTeam || d.amcTeam === "") return false;
      const ms = Number(d.amcExpiryDate);
      return ms > 0 && ms < now;
    });
    if (expiredDevices.length > 0) {
      const sample = expiredDevices.slice(0, 3).map((d) => {
        const dt = new Date(Number(d.amcExpiryDate));
        return dt.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      });
      items.push({
        label: `${expiredDevices.length} device(s) with Expired AMC`,
        detail: `Expired: ${sample.join(", ")}${expiredDevices.length > 3 ? " ..." : ""}`,
        type: "red",
      });
    }

    // Expiring soon — show sample dates
    const expiringSoonDevices = devices.filter((d) => {
      if (!d.amcTeam || d.amcTeam === "") return false;
      const ms = Number(d.amcExpiryDate);
      return ms > 0 && ms >= now && ms - now <= thirtyDays;
    });
    if (expiringSoonDevices.length > 0) {
      const sample = expiringSoonDevices.slice(0, 3).map((d) => {
        const dt = new Date(Number(d.amcExpiryDate));
        return dt.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      });
      items.push({
        label: `${expiringSoonDevices.length} device(s) AMC expiring within 30 days`,
        detail: `Expiring: ${sample.join(", ")}${expiringSoonDevices.length > 3 ? " ..." : ""}`,
        type: "orange",
      });
    }

    const issueDevices = devices.filter(
      (d) => d.workingStatus === "Issue Reported",
    );
    if (issueDevices.length > 0)
      items.push({
        label: `${issueDevices.length} device(s) with Issue Reported`,
        detail:
          issueDevices
            .slice(0, 3)
            .map((d) => d.serialNumber || d.cpuSerialNumber)
            .filter(Boolean)
            .join(", ") || "See Stock page",
        type: "orange",
      });

    // Long pending complaints — show max pending days
    if (complaintMetrics.longPending > 0) {
      const longOnes = complaints.filter((c) => {
        const isCleared =
          c.caseClearedDate != null && BigInt(c.caseClearedDate) > 0n;
        if (isCleared) return false;
        const loggedMs = Number(c.caseLoggedDate ?? 0n) / 1_000_000;
        return loggedMs > 0 && (now - loggedMs) / (1000 * 60 * 60 * 24) > 7;
      });
      const maxDays = Math.max(
        ...longOnes.map((c) =>
          Math.floor(
            (now - Number(c.caseLoggedDate ?? 0n) / 1_000_000) /
              (1000 * 60 * 60 * 24),
          ),
        ),
      );
      items.push({
        label: `${complaintMetrics.longPending} complaint(s) pending > 7 days`,
        detail: `Longest pending: ${maxDays} days — follow up with AMC team`,
        type: "orange",
      });
    }

    // Devices without section (unassigned, not standby candidates — no section at all)
    const noSection = devices.filter(
      (d) =>
        COMPUTER_TYPES.includes(d.deviceType) &&
        (!d.sectionId || d.sectionId === "") &&
        (!d.assignedSeatId || d.assignedSeatId === ""),
    );
    if (noSection.length > 0)
      items.push({
        label: `${noSection.length} computer device(s) without Section`,
        detail: "Assign to a section or mark standby",
        type: "orange",
      });
    // Seats with missing CPU or Monitor pair
    const missingPair = seats.filter((s) => {
      const hasCpu = s.cpuSerial && s.cpuSerial !== "";
      const hasMon = s.monitorSerial && s.monitorSerial !== "";
      return !hasCpu || !hasMon;
    });
    if (missingPair.length > 0)
      items.push({
        label: `${missingPair.length} seat(s) with missing CPU/Monitor pair`,
        detail: "Check Computers page for incomplete systems",
        type: "orange",
      });
    return items;
  }, [complaintMetrics, devices, seats, complaints]);

  // ── Recent movement logs ──────────────────────────────────────────────────
  const recentLogs = useMemo(() => {
    return [...movementLogs]
      .sort((a, b) => Number(b.dateTime) - Number(a.dateTime))
      .slice(0, 10);
  }, [movementLogs]);

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="dashboard.section">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          IT Asset Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          One glance = full system status
        </p>
      </div>

      {/* ── Key Summary Cards ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Key Summary
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <StatCard
            title="CPUs in Use"
            value={isLoading ? "—" : cpusInUse}
            icon={Cpu}
            color="bg-primary/10 text-primary"
            loading={isLoading}
          />
          <StatCard
            title="Monitors in Use"
            value={isLoading ? "—" : monitorsInUse}
            icon={Monitor}
            color="bg-teal-100 text-teal-700"
            loading={isLoading}
          />
          <StatCard
            title="Active Systems"
            value={isLoading ? "—" : totalSystemsActive}
            icon={Building2}
            color="bg-sky-100 text-sky-700"
            loading={isLoading}
            sub="seats occupied"
          />
          <StatCard
            title="Standby Devices"
            value={isLoading ? "—" : totalStandby}
            icon={Server}
            color="bg-blue-100 text-blue-700"
            loading={isLoading}
          />
          <StatCard
            title="Other Devices"
            value={isLoading ? "—" : totalOtherDevices}
            icon={Package}
            color="bg-amber-100 text-amber-700"
            loading={isLoading}
          />
        </div>
      </div>

      {/* ── AMC Summary ── */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          AMC / Warranty Status
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            title="Total Under AMC"
            value={isLoading ? "—" : amcMetrics.underAMC}
            icon={ShieldAlert}
            color="bg-green-100 text-green-700"
            loading={isLoading}
            highlight={amcMetrics.underAMC > 0 ? "green" : undefined}
          />
          <StatCard
            title="Expiring in 30 Days"
            value={isLoading ? "—" : amcMetrics.expiringSoon}
            icon={CalendarClock}
            color="bg-orange-100 text-orange-700"
            loading={isLoading}
            highlight={amcMetrics.expiringSoon > 0 ? "orange" : undefined}
          />
          <StatCard
            title="Expired AMC"
            value={isLoading ? "—" : amcMetrics.expired}
            icon={CalendarX2}
            color="bg-red-100 text-red-700"
            loading={isLoading}
            highlight={amcMetrics.expired > 0 ? "red" : undefined}
          />
        </div>
      </div>

      {/* ── Attention Required ── */}
      {!isLoading && (
        <Card
          className={`shadow-card ${attentionItems.length > 0 ? "border-2 border-red-200 bg-red-50/40" : ""}`}
          data-ocid="dashboard.card"
        >
          <CardHeader className="pb-2">
            <CardTitle
              className={`text-base font-display flex items-center gap-2 ${attentionItems.length > 0 ? "text-red-700" : "text-green-700"}`}
            >
              {attentionItems.length > 0 ? (
                <AlertTriangle className="w-4 h-4" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attentionItems.length === 0 ? (
              <p className="text-sm text-green-700 font-medium">
                All systems are healthy. No immediate action needed.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {attentionItems.map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-start gap-3 p-3 rounded-lg ${item.type === "red" ? "bg-red-100 border border-red-200" : "bg-orange-50 border border-orange-200"}`}
                  >
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 ${item.type === "red" ? "text-red-600" : "text-orange-500"}`}
                    />
                    <div>
                      <p
                        className={`text-sm font-semibold ${item.type === "red" ? "text-red-700" : "text-orange-700"}`}
                      >
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Section Distribution + Health ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card
          className="lg:col-span-2 shadow-card"
          data-ocid="dashboard.chart_point"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              Section-wise Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sectionsLoading || seatsLoading ? (
              <Skeleton
                className="h-52 w-full"
                data-ocid="dashboard.loading_state"
              />
            ) : sectionDistribution.length === 0 ? (
              <div
                className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2"
                data-ocid="dashboard.empty_state"
              >
                <Building2 className="w-8 h-8 opacity-30" />
                <p className="text-sm">No sections with systems</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={sectionDistribution}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.88 0.015 240)"
                  />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(1 0 0)",
                      border: "1px solid oklch(0.88 0.015 240)",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Bar
                    dataKey="systems"
                    name="Systems"
                    fill={CHART_COLORS[0]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card" data-ocid="dashboard.chart_point">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-600" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devicesLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : healthData.length === 0 ? (
              <div
                className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2"
                data-ocid="dashboard.empty_state"
              >
                <CheckCircle2 className="w-8 h-8 opacity-30" />
                <p className="text-sm">No devices in stock</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={healthData}
                    cx="50%"
                    cy="45%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {healthData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "oklch(1 0 0)",
                      border: "1px solid oklch(0.88 0.015 240)",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Legend iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Other Devices + AMC Team + Expiry Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Other Devices Breakdown */}
        <Card className="shadow-card" data-ocid="dashboard.chart_point">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Printer className="w-4 h-4 text-amber-600" />
              Other Devices Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devicesLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : otherDeviceBreakdown.length === 0 ? (
              <div
                className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2"
                data-ocid="dashboard.empty_state"
              >
                <Package className="w-8 h-8 opacity-30" />
                <p className="text-sm">No other devices registered</p>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {otherDeviceBreakdown.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: CHART_COLORS[i % CHART_COLORS.length],
                      }}
                    />
                    <span className="text-sm text-muted-foreground flex-1 truncate">
                      {item.name}
                    </span>
                    <Badge variant="secondary" className="text-xs font-display">
                      {item.value}
                    </Badge>
                  </div>
                ))}
                <div className="pt-2 border-t flex justify-between text-sm">
                  <span className="text-muted-foreground font-medium">
                    Total
                  </span>
                  <span className="font-display font-bold">
                    {totalOtherDevices}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* AMC Team Summary */}
        <Card className="shadow-card" data-ocid="dashboard.chart_point">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              AMC Team Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devicesLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : amcMetrics.teamData.length === 0 ? (
              <div
                className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2"
                data-ocid="dashboard.empty_state"
              >
                <Users className="w-8 h-8 opacity-30" />
                <p className="text-sm">No AMC teams assigned</p>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                {amcMetrics.teamData.map((item, i) => (
                  <div key={item.team} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate flex-1 pr-2">
                        {item.team}
                      </span>
                      <span className="font-semibold font-display">
                        {item.count} devices
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(item.count / amcMetrics.teamData[0].count) * 100}%`,
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expiry Insights */}
        <Card className="shadow-card" data-ocid="dashboard.chart_point">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              AMC Expiry Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {devicesLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : amcMetrics.expiryInsights.length === 0 ? (
              <div
                className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2"
                data-ocid="dashboard.empty_state"
              >
                <CalendarClock className="w-8 h-8 opacity-30" />
                <p className="text-sm">No AMC expiry data</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Common expiry dates for bulk renewal planning
                </p>
                {amcMetrics.expiryInsights.map((item) => {
                  const expMs = new Date(item.date).getTime();
                  const isExpired = expMs < nowMs;
                  const isSoon = !isExpired && expMs - nowMs <= thirtyDaysMs;
                  return (
                    <div
                      key={item.date}
                      className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                        isExpired
                          ? "bg-red-50 border border-red-200"
                          : isSoon
                            ? "bg-orange-50 border border-orange-200"
                            : "bg-muted/40"
                      }`}
                    >
                      <span
                        className={`text-xs ${
                          isExpired
                            ? "text-red-700 font-semibold"
                            : isSoon
                              ? "text-orange-700"
                              : "text-muted-foreground"
                        }`}
                      >
                        {item.date}
                        {isExpired ? " ⚠️" : ""}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs ${
                          isExpired
                            ? "bg-red-100 text-red-700"
                            : isSoon
                              ? "bg-orange-100 text-orange-700"
                              : ""
                        }`}
                      >
                        {item.count} device{item.count > 1 ? "s" : ""}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Complaints + Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card" data-ocid="dashboard.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Complaint Register
            </CardTitle>
          </CardHeader>
          <CardContent>
            {complaintsLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="space-y-3">
                {[
                  {
                    label: "Total Cases",
                    val: complaintMetrics.total,
                    cls: "bg-primary text-primary-foreground",
                  },
                  {
                    label: "Pending",
                    val: complaintMetrics.pending,
                    cls: "bg-orange-500 text-white",
                  },
                  {
                    label: "Cleared",
                    val: complaintMetrics.cleared,
                    cls: "bg-green-500 text-white",
                  },
                  {
                    label: "Long Pending (>7 days)",
                    val: complaintMetrics.longPending,
                    cls: "bg-red-500 text-white",
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm text-muted-foreground">
                      {item.label}
                    </span>
                    <Badge className={item.cls}>{item.val}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-card" data-ocid="dashboard.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              Recent Activity (Last 10 Movements)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : recentLogs.length === 0 ? (
              <div
                className="h-32 flex flex-col items-center justify-center text-muted-foreground gap-2"
                data-ocid="dashboard.empty_state"
              >
                <History className="w-8 h-8 opacity-30" />
                <p className="text-sm">No movement history yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentLogs.map((log) => {
                  const dt = new Date(Number(log.dateTime) / 1_000_000);
                  const badgeClass =
                    ACTION_COLORS[log.action] ||
                    "bg-muted text-muted-foreground";
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="secondary"
                            className={`text-xs ${badgeClass}`}
                          >
                            {log.action}
                          </Badge>
                          <span className="font-medium text-foreground truncate">
                            {log.serialNumber}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            {log.deviceType}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          {log.previousSection && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {log.previousSection}
                            </span>
                          )}
                          {log.previousSection && log.newSection && (
                            <span>→</span>
                          )}
                          {log.newSection && <span>{log.newSection}</span>}
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                        {dt.toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
