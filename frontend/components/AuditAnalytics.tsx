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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import type { AuditLogEntry } from "@/lib/api";

interface AuditAnalyticsProps {
  logs: AuditLogEntry[];
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
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function AuditAnalytics({ logs }: AuditAnalyticsProps) {
  // Generate hourly activity data (last 24 hours)
  const hourlyData = React.useMemo(() => {
    const data: Record<string, { hour: string; actions: number; successes: number; failures: number }> = {};
    const now = new Date();

    for (let i = 23; i >= 0; i--) {
      const time = new Date(now);
      time.setHours(time.getHours() - i);
      const hour = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      data[hour] = { hour, actions: 0, successes: 0, failures: 0 };
    }

    logs.forEach((log) => {
      const logTime = new Date(log.timestamp);
      const hour = logTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      if (data[hour]) {
        data[hour].actions++;
        if (log.status === "success") data[hour].successes++;
        else data[hour].failures++;
      }
    });

    return Object.values(data);
  }, [logs]);

  // Activity by action type
  const actionTypeData = React.useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      const type = log.action_type.replace(/_/g, " ").toUpperCase();
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [logs]);

  // Success/Failure ratio
  const successRate = React.useMemo(() => {
    if (logs.length === 0) return 100;
    const successes = logs.filter((l) => l.status === "success").length;
    return Math.round((successes / logs.length) * 100);
  }, [logs]);

  // Top users
  const topUsers = React.useMemo(() => {
    const counts: Record<string, number> = {};
    logs.forEach((log) => {
      counts[log.user_name] = (counts[log.user_name] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [logs]);

  const COLORS = ["var(--accent)", "var(--success)", "var(--warning)", "var(--danger)", "var(--purple)"];

  return (
    <div className="space-y-6">
      {/* ── Summary Stats ───────────────────────────────────– */}
      <div className="grid grid-cols-4 gap-4">
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Total Actions
          </p>
          <p className="text-2xl font-bold mt-2" style={{ color: "var(--text-primary)" }}>
            {logs.length}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            All time
          </p>
        </div>

        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Success Rate
          </p>
          <p className="text-2xl font-bold mt-2" style={{ color: "var(--success)" }}>
            {successRate}%
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Actions succeeded
          </p>
        </div>

        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Failed Actions
          </p>
          <p className="text-2xl font-bold mt-2" style={{ color: "var(--danger)" }}>
            {logs.filter((l) => l.status === "failure").length}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Needs review
          </p>
        </div>

        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Unique Users
          </p>
          <p className="text-2xl font-bold mt-2" style={{ color: "var(--purple)" }}>
            {new Set(logs.map((l) => l.user_id)).size}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Active users
          </p>
        </div>
      </div>

      {/* ── 24-Hour Activity ────────────────────────────────– */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Activity Trends (24 Hours)
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Audit actions and success/failure distribution
          </p>
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
              <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "12px", color: "var(--text-secondary)" }} />
              <Line
                type="monotone"
                dataKey="actions"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                name="Total Actions"
              />
              <Line
                type="monotone"
                dataKey="successes"
                stroke="var(--success)"
                strokeWidth={2}
                dot={false}
                name="Successes"
              />
              <Line
                type="monotone"
                dataKey="failures"
                stroke="var(--danger)"
                strokeWidth={2}
                dot={false}
                name="Failures"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Activity by Type ────────────────────────────────– */}
      <div className="grid grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="col-span-2">
          <div className="mb-4">
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Top Action Types
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Most common audit actions
            </p>
          </div>
          <div
            className="rounded-lg p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={actionTypeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--text-secondary)" }} />
                <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="var(--accent)" name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie chart */}
        <div>
          <div className="mb-4">
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Status Distribution
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Success vs Failure
            </p>
          </div>
          <div
            className="rounded-lg p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: "Success", value: logs.filter((l) => l.status === "success").length },
                    { name: "Failure", value: logs.filter((l) => l.status === "failure").length },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell fill="var(--success)" />
                  <Cell fill="var(--danger)" />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Top Users ───────────────────────────────────────– */}
      <div>
        <div className="mb-4">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Most Active Users
          </h3>
          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
            Users with most audit actions
          </p>
        </div>
        <div className="grid grid-cols-5 gap-4">
          {topUsers.map(({ name, count }, index) => (
            <div
              key={name}
              className="rounded-lg p-4"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold px-2 py-1 rounded" style={{ background: COLORS[index % COLORS.length] + "20", color: COLORS[index % COLORS.length] }}>
                  #{index + 1}
                </span>
              </div>
              <p className="font-semibold text-sm truncate" style={{ color: "var(--text-primary)" }}>
                {name}
              </p>
              <p className="text-lg font-bold mt-2" style={{ color: COLORS[index % COLORS.length] }}>
                {count}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                {count === 1 ? "action" : "actions"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
