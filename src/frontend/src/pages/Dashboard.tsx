import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertTriangle,
  Building2,
  Clock,
  Monitor,
  Server,
  TrendingUp,
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
import { useGetDashboardStats } from "../hooks/useQueries";
import { useGetAllComputers } from "../hooks/useQueries";
import { useGetAllComplaints } from "../hooks/useQueries";

const CHART_COLORS = [
  "oklch(0.52 0.14 195)",
  "oklch(0.6 0.18 145)",
  "oklch(0.65 0.18 65)",
  "oklch(0.55 0.22 25)",
  "oklch(0.58 0.18 300)",
];

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card
      className="shadow-card hover:shadow-card-hover transition-shadow"
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
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: computers = [], isLoading: computersLoading } =
    useGetAllComputers();
  const { data: complaints = [], isLoading: complaintsLoading } =
    useGetAllComplaints();

  // AMC expiry timeline - group computers by AMC end month (next 12 months)
  const amcTimelineData = useMemo(() => {
    const now = new Date();
    const months: { month: string; count: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        month: d.toLocaleString("en", { month: "short", year: "2-digit" }),
        count: 0,
      });
    }
    for (const c of computers) {
      const endDate = new Date(Number(c.amcEndDate));
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
        if (endDate >= d && endDate < nextD) {
          months[i].count++;
        }
      }
    }
    return months;
  }, [computers]);

  // Complaint status breakdown
  const complaintStatusData = useMemo(() => {
    const counts: Record<string, number> = {
      open: 0,
      inProgress: 0,
      resolved: 0,
    };
    for (const c of complaints) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return [
      { name: "Open", value: counts.open, color: CHART_COLORS[3] },
      { name: "In Progress", value: counts.inProgress, color: CHART_COLORS[2] },
      { name: "Resolved", value: counts.resolved, color: CHART_COLORS[1] },
    ].filter((d) => d.value > 0);
  }, [complaints]);

  // Computer status distribution
  const computerStatusData = useMemo(() => {
    const counts: Record<string, number> = {
      active: 0,
      standby: 0,
      retired: 0,
    };
    for (const c of computers) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return [
      { name: "Active", value: counts.active, color: CHART_COLORS[1] },
      { name: "Standby", value: counts.standby, color: CHART_COLORS[0] },
      { name: "Retired", value: counts.retired, color: CHART_COLORS[3] },
    ].filter((d) => d.value > 0);
  }, [computers]);

  const isLoading = statsLoading || computersLoading || complaintsLoading;

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="dashboard.section">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Dashboard
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Overview of your hardware infrastructure
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Sections"
          value={isLoading ? "—" : Number(stats?.totalSections ?? 0)}
          icon={Building2}
          color="bg-primary/10 text-primary"
          loading={isLoading}
        />
        <StatCard
          title="Total Computers"
          value={isLoading ? "—" : Number(stats?.totalComputers ?? 0)}
          icon={Monitor}
          color="bg-teal-100 text-teal-700"
          loading={isLoading}
        />
        <StatCard
          title="Standby Systems"
          value={isLoading ? "—" : Number(stats?.totalStandbySystems ?? 0)}
          icon={Server}
          color="bg-blue-100 text-blue-700"
          loading={isLoading}
        />
        <StatCard
          title="Open Complaints"
          value={isLoading ? "—" : Number(stats?.openComplaints ?? 0)}
          icon={AlertTriangle}
          color="bg-orange-100 text-orange-700"
          loading={isLoading}
        />
        <StatCard
          title="AMC Expiring (30d)"
          value={isLoading ? "—" : Number(stats?.computersWithExpiringAMC ?? 0)}
          icon={Clock}
          color="bg-red-100 text-red-700"
          loading={isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AMC Expiry Timeline */}
        <Card
          className="lg:col-span-2 shadow-card"
          data-ocid="dashboard.chart_point"
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              AMC Expiry Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {computersLoading ? (
              <Skeleton
                className="h-52 w-full"
                data-ocid="dashboard.loading_state"
              />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={amcTimelineData}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.88 0.015 240)"
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
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
                    dataKey="count"
                    name="Expiring AMCs"
                    fill={CHART_COLORS[0]}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Complaint Status */}
        <Card className="shadow-card" data-ocid="dashboard.chart_point">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              Complaint Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {complaintsLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : complaintStatusData.length === 0 ? (
              <div
                className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2"
                data-ocid="dashboard.empty_state"
              >
                <AlertTriangle className="w-8 h-8 opacity-30" />
                <p className="text-sm">No complaints yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={complaintStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {complaintStatusData.map((entry) => (
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

      {/* Computer Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card" data-ocid="dashboard.chart_point">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Monitor className="w-4 h-4 text-teal-600" />
              Computer Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {computersLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : computerStatusData.length === 0 ? (
              <div
                className="h-52 flex flex-col items-center justify-center text-muted-foreground gap-2"
                data-ocid="dashboard.empty_state"
              >
                <Monitor className="w-8 h-8 opacity-30" />
                <p className="text-sm">No computers yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={computerStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {computerStatusData.map((entry) => (
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

        <Card className="lg:col-span-2 shadow-card" data-ocid="dashboard.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display">
              Quick Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading
              ? ["sk1", "sk2", "sk3", "sk4"].map((sk) => (
                  <Skeleton key={sk} className="h-10 w-full" />
                ))
              : [
                  {
                    label: "Total Sections registered",
                    val: Number(stats?.totalSections ?? 0),
                    max: Math.max(Number(stats?.totalSections ?? 1), 1),
                    color: "bg-primary",
                  },
                  {
                    label: "Computers active",
                    val: computers.filter((c) => c.status === "active").length,
                    max: Math.max(computers.length, 1),
                    color: "bg-teal-500",
                  },
                  {
                    label: "Complaints open",
                    val: Number(stats?.openComplaints ?? 0),
                    max: Math.max(complaints.length, 1),
                    color: "bg-orange-500",
                  },
                  {
                    label: "AMC expiring (30 days)",
                    val: Number(stats?.computersWithExpiringAMC ?? 0),
                    max: Math.max(computers.length, 1),
                    color: "bg-red-500",
                  },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.label}
                      </span>
                      <span className="font-semibold font-display text-foreground">
                        {item.val}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${item.color}`}
                        style={{
                          width: `${Math.min((item.val / item.max) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
