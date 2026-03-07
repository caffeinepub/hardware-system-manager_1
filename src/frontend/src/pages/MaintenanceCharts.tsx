import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart3,
  Package,
  PieChart as PieIcon,
  TrendingUp,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useGetAllAMCParts,
  useGetAllComplaints,
  useGetAllComputers,
} from "../hooks/useQueries";

const COLORS = [
  "oklch(0.52 0.14 195)",
  "oklch(0.6 0.18 145)",
  "oklch(0.65 0.18 65)",
  "oklch(0.55 0.22 25)",
  "oklch(0.58 0.18 300)",
  "oklch(0.62 0.14 240)",
];

export default function MaintenanceCharts() {
  const { data: computers = [], isLoading: cLoad } = useGetAllComputers();
  const { data: complaints = [], isLoading: cpLoad } = useGetAllComplaints();
  const { data: parts = [], isLoading: pLoad } = useGetAllAMCParts();

  const isLoading = cLoad || cpLoad || pLoad;

  // AMC Expiry Timeline (next 12 months)
  const amcTimeline = useMemo(() => {
    const now = new Date();
    const months: { month: string; expiring: number; expired: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        month: d.toLocaleString("en", { month: "short", year: "2-digit" }),
        expiring: 0,
        expired: 0,
      });
    }
    for (const c of computers) {
      const endDate = new Date(Number(c.amcEndDate));
      const nowMs = Date.now();
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
        if (endDate >= d && endDate < nextD) {
          if (Number(c.amcEndDate) < nowMs) {
            months[i].expired++;
          } else {
            months[i].expiring++;
          }
        }
      }
    }
    return months;
  }, [computers]);

  // Complaint resolution trend (last 6 months by created date)
  const complaintTrend = useMemo(() => {
    const now = new Date();
    const months: {
      month: string;
      open: number;
      resolved: number;
      inProgress: number;
    }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: d.toLocaleString("en", { month: "short", year: "2-digit" }),
        open: 0,
        resolved: 0,
        inProgress: 0,
      });
    }
    for (const c of complaints) {
      const createdDate = new Date(Number(c.createdAt));
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        if (createdDate >= d && createdDate < nextD) {
          const idx = 5 - i;
          if (c.status === "open") months[idx].open++;
          else if (c.status === "resolved") months[idx].resolved++;
          else if (c.status === "inProgress") months[idx].inProgress++;
        }
      }
    }
    return months;
  }, [complaints]);

  // System health overview
  const systemHealth = useMemo(() => {
    const active = computers.filter((c) => c.status === "active").length;
    const standby = computers.filter((c) => c.status === "standby").length;
    const retired = computers.filter((c) => c.status === "retired").length;
    return [
      { name: "Active", value: active, color: COLORS[1] },
      { name: "Standby", value: standby, color: COLORS[0] },
      { name: "Retired", value: retired, color: COLORS[3] },
    ].filter((d) => d.value > 0);
  }, [computers]);

  // AMC Parts warranty timeline (next 12 months)
  const partsWarrantyTimeline = useMemo(() => {
    const now = new Date();
    const months: { month: string; count: number }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push({
        month: d.toLocaleString("en", { month: "short", year: "2-digit" }),
        count: 0,
      });
    }
    for (const p of parts) {
      if (!p.warrantyExpiry) continue;
      const expDate = new Date(Number(p.warrantyExpiry));
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const nextD = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
        if (expDate >= d && expDate < nextD) {
          months[i].count++;
        }
      }
    }
    return months;
  }, [parts]);

  const tooltipStyle = {
    background: "oklch(1 0 0)",
    border: "1px solid oklch(0.88 0.015 240)",
    borderRadius: "8px",
    fontSize: 12,
  };

  return (
    <div className="space-y-6 animate-fade-in" data-ocid="charts.section">
      <div>
        <h2 className="text-2xl font-display font-bold text-foreground">
          Maintenance Charts
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visual analytics for hardware health, AMC status, and complaint trends
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* AMC Expiry Timeline */}
        <Card className="shadow-card" data-ocid="charts.chart_point">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              AMC Expiry Timeline (12 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton
                className="h-64 w-full"
                data-ocid="charts.loading_state"
              />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={amcTimeline}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.88 0.015 240)"
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={10} />
                  <Bar
                    dataKey="expiring"
                    name="Expiring"
                    fill={COLORS[2]}
                    radius={[3, 3, 0, 0]}
                    stackId="a"
                  />
                  <Bar
                    dataKey="expired"
                    name="Already Expired"
                    fill={COLORS[3]}
                    radius={[3, 3, 0, 0]}
                    stackId="a"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Complaint Trend */}
        <Card className="shadow-card" data-ocid="charts.chart_point">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-orange-500" />
              Complaint Trend (Last 6 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart
                  data={complaintTrend}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="openGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={COLORS[3]}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS[3]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                    <linearGradient
                      id="resolvedGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="5%"
                        stopColor={COLORS[1]}
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor={COLORS[1]}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.88 0.015 240)"
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={10} />
                  <Area
                    type="monotone"
                    dataKey="open"
                    name="Open"
                    stroke={COLORS[3]}
                    fill="url(#openGrad)"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="inProgress"
                    name="In Progress"
                    stroke={COLORS[2]}
                    fill="none"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                  />
                  <Area
                    type="monotone"
                    dataKey="resolved"
                    name="Resolved"
                    stroke={COLORS[1]}
                    fill="url(#resolvedGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* System Health */}
        <Card className="shadow-card" data-ocid="charts.chart_point">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-teal-600" />
              System Health Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : systemHealth.length === 0 ? (
              <div
                className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-2"
                data-ocid="charts.empty_state"
              >
                <p className="text-sm">No computer data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={systemHealth}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {systemHealth.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend iconSize={10} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* AMC Parts Warranty */}
        <Card className="shadow-card" data-ocid="charts.chart_point">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-500" />
              AMC Parts Warranty Expiry (12 months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={partsWarrantyTimeline}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.88 0.015 240)"
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Parts Expiring"
                    stroke={COLORS[4]}
                    strokeWidth={2.5}
                    dot={{ fill: COLORS[4], r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary stats below charts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Computers",
            value: computers.length,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "AMC Expiring (30d)",
            value: computers.filter((c) => {
              const ms = Number(c.amcEndDate) - Date.now();
              return ms > 0 && ms < 30 * 24 * 60 * 60 * 1000;
            }).length,
            color: "text-yellow-700",
            bg: "bg-yellow-50",
          },
          {
            label: "Open Complaints",
            value: complaints.filter((c) => c.status === "open").length,
            color: "text-orange-700",
            bg: "bg-orange-50",
          },
          {
            label: "AMC Parts Total",
            value: parts.length,
            color: "text-purple-700",
            bg: "bg-purple-50",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="shadow-card"
            data-ocid="charts.card"
          >
            <CardContent className="p-4">
              <div
                className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${item.bg} mb-2`}
              >
                <span
                  className={`text-sm font-bold font-display ${item.color}`}
                >
                  {item.value}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
