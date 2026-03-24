"use client";

import { useEffect, useState } from "react";

interface SystemHealthProps {
  workspaceId: string;
  isDemo: boolean;
}

interface HealthStatus {
  service: string;
  status: "healthy" | "degraded" | "down";
  latency?: number;
}

const DEMO_HEALTH: HealthStatus[] = [
  { service: "AI (LLM)", status: "healthy", latency: 245 },
  { service: "Vector DB", status: "healthy", latency: 12 },
  { service: "Task Queue", status: "healthy", latency: 8 },
];

export default function SystemHealth({ workspaceId, isDemo }: SystemHealthProps) {
  const [health, setHealth] = useState<HealthStatus[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (isDemo) {
      setHealth(DEMO_HEALTH);
    } else {
      // In production, fetch from /api/v1/health or /api/v1/metrics/health
      fetchHealthStatus();
    }
  }, [workspaceId, isDemo]);

  async function fetchHealthStatus() {
    try {
      // Placeholder for real health check
      const res = await fetch(`/api/v1/metrics/health`);
      if (res.ok) {
        const data = await res.json();
        setHealth(data.services || []);
      }
    } catch (error) {
      console.error("Failed to fetch health:", error);
    }
  }

  const overallStatus = health.every((h) => h.status === "healthy")
    ? "healthy"
    : health.some((h) => h.status === "down")
      ? "down"
      : "degraded";

  const statusConfig = {
    healthy: { color: "var(--success)", bg: "var(--success-soft)", icon: "✓", label: "All Systems Operational" },
    degraded: { color: "var(--warning)", bg: "var(--warning-soft)", icon: "⚠", label: "Degraded Performance" },
    down: { color: "var(--danger)", bg: "var(--danger-soft)", icon: "✗", label: "Service Unavailable" },
  };

  const config = statusConfig[overallStatus];

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: config.bg,
          color: config.color,
          border: `1px solid ${config.color}`,
        }}
      >
        <span>{config.icon}</span>
        <span>System Health</span>
      </button>

      {expanded && (
        <div
          className="absolute top-full right-0 mt-2 w-64 rounded-lg p-3 shadow-lg z-50"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
              Service Status
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="text-xs" style={{ color: "var(--text-muted)" }}
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {health.map((service) => {
              const sConfig = statusConfig[service.status];
              return (
                <div
                  key={service.service}
                  className="flex items-center justify-between p-2 rounded"
                  style={{ background: "var(--bg-surface)" }}
                >
                  <div className="flex items-center gap-2">
                    <span style={{ color: sConfig.color }}>{sConfig.icon}</span>
                    <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                      {service.service}
                    </span>
                  </div>
                  {service.latency && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {service.latency}ms
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
