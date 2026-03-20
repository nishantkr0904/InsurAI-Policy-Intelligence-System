"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Generate mock hourly query data (last 24 hours)
function generateHourlyQueryData() {
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const time = new Date(now);
    time.setHours(time.getHours() - i);
    const hour = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

    data.push({
      hour,
      queries: Math.round(15 + Math.random() * 35),
      avgResponseTime: Math.round(500 + Math.random() * 300),
      successRate: Math.round(92 + Math.random() * 8),
    });
  }
  return data;
}

// Generate query performance metrics
function generateQueryTypeMetrics() {
  const types = ["Policy Q&A", "Coverage Check", "Claim Info", "Risk Analysis", "Compliance"];
  return types.map((type) => ({
    type,
    count: Math.round(50 + Math.random() * 200),
    avgTime: Math.round(400 + Math.random() * 400),
  }));
}

// Generate user activity data
function generateUserActivityData() {
  const data = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    data.push({
      date: dateStr,
      activeUsers: Math.round(15 + Math.random() * 30),
      totalQueries: Math.round(200 + Math.random() * 500),
      uniqueQueries: Math.round(100 + Math.random() * 200),
    });
  }
  return data;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="rounded-lg border p-2"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
        }}
      >
        {payload.map((entry: any, index: number) => (
          <p key={index} style={{ color: entry.color, fontSize: "12px" }}>
            {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function QueryAnalyticsCharts() {
  const hourlyData = React.useMemo(() => generateHourlyQueryData(), []);
  const typeMetrics = React.useMemo(() => generateQueryTypeMetrics(), []);
  const userActivityData = React.useMemo(() => generateUserActivityData(), []);

  return (
    <div className="space-y-6">
      {/* ── Summary Stats ────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Queries", value: "2,847", trend: "+18%", color: "var(--accent)" },
          { label: "Avg Response Time", value: "742ms", trend: "-5%", color: "var(--success)" },
          { label: "Success Rate", value: "96.8%", trend: "+2%", color: "var(--purple)" },
          { label: "Active Users", value: "38", trend: "+12%", color: "var(--warning)" },
        ].map(({ label, value, trend, color }) => (
          <div
            key={label}
            className="rounded-lg p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
              {label}
            </p>
            <p className="text-xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
              {value}
            </p>
            <p
              className="text-xs mt-2 font-medium"
              style={{
                color: trend.startsWith("+") ? "var(--success)" : "var(--warning)",
              }}
            >
              {trend} vs yesterday
            </p>
          </div>
        ))}
      </div>

      {/* ── Hourly Query Volume & Response Time ──────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Query Activity (24 hours)
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Query volume and average response times by hour
            </p>
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                interval={2}
              />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "var(--text-secondary)" }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="queries"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                name="Queries/hr"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgResponseTime"
                stroke="var(--warning)"
                strokeWidth={2}
                dot={false}
                name="Avg Response (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Query Performance by Type ───────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Performance by Query Type
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Query count and average response time by category
            </p>
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeMetrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="type" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "var(--text-secondary)" }} />
              <Bar yAxisId="left" dataKey="count" fill="var(--accent)" name="Query Count" />
              <Bar yAxisId="right" dataKey="avgTime" fill="var(--danger)" name="Avg Time (ms)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── User Activity Trend (7 days) ────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              User Activity (7 days)
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Active users and query trends over the past week
            </p>
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={userActivityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "var(--text-secondary)" }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="activeUsers"
                stroke="var(--purple)"
                strokeWidth={2}
                dot={true}
                name="Active Users"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalQueries"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                name="Total Queries"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
