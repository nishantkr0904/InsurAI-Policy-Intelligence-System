"use client";

import React from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Generate mock claim trends data (last 30 days)
function generateClaimTrendsData() {
  const data = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Simulate realistic trends with some randomness
    const baseClaims = 15 + Math.sin(i / 5) * 8;
    const baseApproved = Math.round(baseClaims * (0.65 + Math.random() * 0.15));
    const baseDenied = Math.round(baseClaims * (0.2 + Math.random() * 0.1));

    data.push({
      date: dateStr,
      submitted: Math.round(baseClaims + Math.random() * 3),
      approved: baseApproved,
      denied: baseDenied,
      flagged: Math.random() > 0.8 ? Math.round(Math.random() * 3) : 0,
    });
  }
  return data;
}

// Generate risk patterns by claim type
function generateRiskPatternData() {
  const claimTypes = ["Auto", "Home", "Health", "Life", "Property"];
  return claimTypes.map((type) => ({
    type,
    riskScore: Math.round(30 + Math.random() * 50),
    fraudRate: Math.round(2 + Math.random() * 8),
    avgProcessingDays: Math.round(5 + Math.random() * 15),
  }));
}

// Generate anomaly data (claim amount vs processing time, with anomalies highlighted)
function generateAnomalyData() {
  const data = [];
  for (let i = 0; i < 40; i++) {
    const claimAmount = Math.round(5000 + Math.random() * 95000);
    const processingDays = Math.round(5 + Math.random() * 20);

    // Mark some as anomalies (unusual combinations)
    const isAnomaly =
      (claimAmount > 80000 && processingDays > 25) ||
      (claimAmount < 10000 && processingDays > 20) ||
      (claimAmount > 70000 && processingDays < 8);

    data.push({
      claimId: `CLM-${String(i + 1).padStart(4, "0")}`,
      amount: claimAmount,
      days: processingDays,
      isAnomaly,
      severity: isAnomaly ? Math.round(Math.random() * 3) + 1 : 0, // 1-3 for anomalies
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
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function RiskTrendsCharts() {
  const claimTrends = React.useMemo(() => generateClaimTrendsData(), []);
  const riskPatterns = React.useMemo(() => generateRiskPatternData(), []);
  const anomalyData = React.useMemo(() => generateAnomalyData(), []);

  return (
    <div className="space-y-6">
      {/* ── Claim Trends Over Time ──────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Claim Trends (30 days)
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Daily claim submissions, approvals, and denials
            </p>
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={claimTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                interval={4}
              />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", color: "var(--text-secondary)" }}
              />
              <Line
                type="monotone"
                dataKey="submitted"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                name="Submitted"
              />
              <Line
                type="monotone"
                dataKey="approved"
                stroke="var(--success)"
                strokeWidth={2}
                dot={false}
                name="Approved"
              />
              <Line
                type="monotone"
                dataKey="denied"
                stroke="var(--danger)"
                strokeWidth={2}
                dot={false}
                name="Denied"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Risk Patterns by Claim Type ──────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Risk Patterns by Claim Type
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Risk scores and fraud rates across policy types
            </p>
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskPatterns}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                dataKey="type"
                tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
              />
              <YAxis tick={{ fontSize: 12, fill: "var(--text-secondary)" }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: "12px", color: "var(--text-secondary)" }}
              />
              <Bar dataKey="riskScore" fill="var(--warning)" name="Risk Score" />
              <Bar dataKey="fraudRate" fill="var(--danger)" name="Fraud Rate (%)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Anomaly Detection ───────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
              Anomaly Detection
            </h3>
            <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
              Claim amount vs processing time with anomalies highlighted
            </p>
          </div>
        </div>
        <div
          className="rounded-lg p-4"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis
                type="number"
                dataKey="amount"
                name="Claim Amount ($)"
                tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                label={{
                  value: "Claim Amount ($)",
                  position: "insideBottomRight",
                  offset: -5,
                  fill: "var(--text-secondary)",
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="days"
                name="Processing Days"
                tick={{ fontSize: 12, fill: "var(--text-secondary)" }}
                label={{
                  value: "Processing Days",
                  angle: -90,
                  position: "insideLeft",
                  fill: "var(--text-secondary)",
                  fontSize: 12,
                }}
              />
              <Tooltip
                cursor={{ strokeDasharray: "3 3" }}
                content={({ active, payload }: any) => {
                  if (active && payload && payload[0]) {
                    const data = payload[0].payload;
                    return (
                      <div
                        className="rounded-lg border p-2"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <p style={{ fontSize: "12px", color: "var(--text-primary)" }}>
                          {data.claimId}
                        </p>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          Amount: ${data.amount.toLocaleString()}
                        </p>
                        <p style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          Days: {data.days}
                        </p>
                        {data.isAnomaly && (
                          <p style={{ fontSize: "12px", color: "var(--danger)", fontWeight: "bold" }}>
                            ⚠️ Anomaly (Severity: {data.severity})
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Scatter
                name="Normal Claims"
                dataKey="days"
                data={anomalyData.filter((d) => !d.isAnomaly)}
                fill="var(--accent)"
                fillOpacity={0.6}
              />
              <Scatter
                name="Anomalies"
                dataKey="days"
                data={anomalyData.filter((d) => d.isAnomaly)}
                fill="var(--danger)"
                fillOpacity={0.8}
              />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Insights Summary ────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Avg Processing Time",
            value: "12.4 days",
            trend: "+2.1%",
            icon: "📊",
            color: "var(--accent)",
          },
          {
            label: "Anomaly Rate",
            value: "8.3%",
            trend: "-1.2%",
            icon: "⚠️",
            color: "var(--warning)",
          },
          {
            label: "Fraud Detection Rate",
            value: "5.7%",
            trend: "+0.8%",
            icon: "🚨",
            color: "var(--danger)",
          },
        ].map(({ label, value, trend, icon, color }) => (
          <div
            key={label}
            className="rounded-lg p-4"
            style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                  {label}
                </p>
                <p className="text-lg font-bold mt-2" style={{ color: "var(--text-primary)" }}>
                  {value}
                </p>
              </div>
              <span className="text-xl">{icon}</span>
            </div>
            <p
              className="text-xs mt-2 font-medium"
              style={{
                color: trend.startsWith("+") ? "var(--success)" : "var(--warning)",
              }}
            >
              {trend} vs last week
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
