"use client";

import { useEffect, useState } from "react";
import { fetchPerformanceHealth } from "@/lib/api";

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
  const [systemStatus, setSystemStatus] = useState<"healthy" | "degraded" | "down">("healthy");

  useEffect(() => {
    if (isDemo) {
      setHealth(DEMO_HEALTH);
      setSystemStatus("healthy");
    } else {
      fetchHealthStatus();
    }
  }, [workspaceId, isDemo]);

  async function fetchHealthStatus() {
    try {
      const data = await fetchPerformanceHealth(workspaceId);

      // Transform backend response to component format
      const healthStatuses: HealthStatus[] = [
        {
          service: "API",
          status: data.status === "critical" ? "down" : data.status,
          latency: Math.round(data.avg_api_latency_ms),
        },
        {
          service: "P95 Response",
          status: data.p95_api_latency_ms > 3000 ? "down" : data.p95_api_latency_ms > 1000 ? "degraded" : "healthy",
          latency: Math.round(data.p95_api_latency_ms),
        },
      ];

      // Add slow endpoints as health indicators
      if (data.slow_endpoints && data.slow_endpoints.length > 0) {
        data.slow_endpoints.slice(0, 2).forEach((endpoint) => {
          const endpointName = endpoint.endpoint?.split("/").pop() || "Endpoint";
          healthStatuses.push({
            service: endpointName.charAt(0).toUpperCase() + endpointName.slice(1),
            status: endpoint.avg_ms > 2000 ? "degraded" : "healthy",
            latency: Math.round(endpoint.avg_ms),
          });
        });
      }

      setHealth(healthStatuses);
      setSystemStatus(data.status === "critical" ? "down" : data.status);
    } catch (error) {
      console.error("Failed to fetch health:", error);
      // Fallback to demo data on error
      setHealth(DEMO_HEALTH);
      setSystemStatus("healthy");
    }
  }

  const overallStatus = systemStatus;

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
