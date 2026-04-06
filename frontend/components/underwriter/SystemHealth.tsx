"use client";

import { useEffect, useState } from "react";
import { fetchPerformanceHealth, fetchSystemHealthStatus } from "@/lib/api";

interface SystemHealthProps {
  workspaceId: string;
  isDemo: boolean;
}

interface HealthStatus {
  service: string;
  status: "healthy" | "degraded" | "down";
  latency: number | null;
  details?: string;
}

const FALLBACK_HEALTH: HealthStatus[] = [
  { service: "API", status: "down", latency: null, details: "Health endpoint unreachable" },
  { service: "AI Engine", status: "down", latency: null, details: "Health endpoint unreachable" },
  { service: "Milvus (Vector DB)", status: "down", latency: null, details: "Health endpoint unreachable" },
  { service: "Redis (Queue)", status: "down", latency: null, details: "Health endpoint unreachable" },
  { service: "PostgreSQL", status: "down", latency: null, details: "Health endpoint unreachable" },
];

function normalizeStatus(value: string | undefined): "healthy" | "degraded" | "down" {
  if (value === "healthy" || value === "degraded" || value === "down") return value;
  if (value === "critical") return "down";
  return "degraded";
}

function toServiceLabel(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("ai") || n.includes("llm")) return "AI Engine";
  if (n.includes("milvus") || n.includes("vector")) return "Milvus (Vector DB)";
  if (n.includes("redis") || n.includes("queue")) return "Redis (Queue)";
  if (n.includes("postgres") || n.includes("database")) return "PostgreSQL";
  return name;
}

function computeOverallStatus(statuses: Array<"healthy" | "degraded" | "down">): "healthy" | "degraded" | "down" {
  if (statuses.includes("down")) return "down";
  if (statuses.includes("degraded")) return "degraded";
  return "healthy";
}

function statusLabel(status: HealthStatus["status"]): string {
  if (status === "healthy") return "Healthy";
  if (status === "degraded") return "Degraded";
  return "Down";
}

function statusPillStyles(status: HealthStatus["status"]): { background: string; color: string } {
  if (status === "healthy") return { background: "var(--success-soft)", color: "var(--success)" };
  if (status === "degraded") return { background: "var(--warning-soft)", color: "var(--warning)" };
  return { background: "var(--danger-soft)", color: "var(--danger)" };
}

function latencyStyles(latency: number | null): { color: string; weight: number } {
  if (latency === null) return { color: "var(--text-muted)", weight: 400 };
  if (latency > 1500) return { color: "var(--danger)", weight: 600 };
  if (latency > 800) return { color: "var(--warning)", weight: 600 };
  return { color: "var(--text-muted)", weight: 400 };
}

export default function SystemHealth({ workspaceId, isDemo }: SystemHealthProps) {
  const [health, setHealth] = useState<HealthStatus[]>(FALLBACK_HEALTH);
  const [expanded, setExpanded] = useState(false);
  const [systemStatus, setSystemStatus] = useState<"healthy" | "degraded" | "down">("degraded");
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setHealth([
        { service: "API", status: "healthy", latency: 210 },
        { service: "AI Engine", status: "healthy", latency: 245 },
        { service: "Milvus (Vector DB)", status: "healthy", latency: 18 },
        { service: "Redis (Queue)", status: "healthy", latency: 9 },
        { service: "PostgreSQL", status: "healthy", latency: 14 },
      ]);
      setSystemStatus("healthy");
      setFetchError(null);
    } else {
      void fetchHealthStatus();
    }
  }, [workspaceId, isDemo]);

  async function fetchHealthStatus() {
    try {
      const started = performance.now();
      const [systemData, performanceData] = await Promise.all([
        fetchSystemHealthStatus(),
        fetchPerformanceHealth(workspaceId),
      ]);
      const requestLatency = Math.max(1, Math.round(performance.now() - started));

      const serviceMap = new Map<string, HealthStatus>();

      for (const svc of systemData.services) {
        const label = toServiceLabel(svc.name);
        if (!["AI Engine", "Milvus (Vector DB)", "Redis (Queue)", "PostgreSQL"].includes(label)) {
          continue;
        }

        serviceMap.set(label, {
          service: label,
          status: normalizeStatus(svc.status),
          latency: typeof svc.latency_ms === "number" ? Math.round(svc.latency_ms) : null,
          details: svc.error_message || undefined,
        });
      }

      const apiStatus = normalizeStatus(performanceData.status);
      const avgLatencyFromMetrics = Number.isFinite(performanceData.avg_api_latency_ms)
        ? Math.round(performanceData.avg_api_latency_ms)
        : 0;
      const p95LatencyFromMetrics = Number.isFinite(performanceData.p95_api_latency_ms)
        ? Math.round(performanceData.p95_api_latency_ms)
        : 0;

      const apiLatency = avgLatencyFromMetrics > 0 ? avgLatencyFromMetrics : requestLatency;
      const p95Latency = p95LatencyFromMetrics > 0 ? p95LatencyFromMetrics : requestLatency;

      serviceMap.set("API", {
        service: "API",
        status: apiStatus,
        latency: apiLatency,
        details: p95Latency !== null ? `P95 ${p95Latency}ms` : undefined,
      });

      // Ensure all required services are present.
      const orderedHealth: HealthStatus[] = [
        serviceMap.get("API") ?? { service: "API", status: "down", latency: null, details: "Metric unavailable" },
        serviceMap.get("AI Engine") ?? { service: "AI Engine", status: "down", latency: null, details: "Service unavailable" },
        serviceMap.get("Milvus (Vector DB)") ?? { service: "Milvus (Vector DB)", status: "down", latency: null, details: "Service unavailable" },
        serviceMap.get("Redis (Queue)") ?? { service: "Redis (Queue)", status: "down", latency: null, details: "Service unavailable" },
        serviceMap.get("PostgreSQL") ?? { service: "PostgreSQL", status: "down", latency: null, details: "Service unavailable" },
      ];

      setHealth(orderedHealth);
      setSystemStatus(computeOverallStatus(orderedHealth.map((item) => item.status)));
      setFetchError(null);
    } catch (error) {
      console.error("Failed to fetch health:", error);
      setHealth(FALLBACK_HEALTH);
      setSystemStatus("down");
      setFetchError("Unable to load live health metrics");
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

          {fetchError && (
            <div
              className="mb-2 p-2 rounded text-[11px]"
              style={{
                color: "var(--warning)",
                background: "var(--warning-soft)",
                border: "1px solid var(--warning)",
              }}
            >
              {fetchError}
            </div>
          )}

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
                    <div>
                      <span className="text-xs" style={{ color: "var(--text-primary)" }}>
                        {service.service}
                      </span>
                      {service.details && (
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {service.details}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end gap-2 text-right">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium leading-none"
                      style={statusPillStyles(service.status)}
                    >
                      {statusLabel(service.status)}
                    </span>
                    {service.latency !== null ? (
                      <span
                        className="text-xs"
                        style={{
                          color: latencyStyles(service.latency).color,
                          fontWeight: latencyStyles(service.latency).weight,
                        }}
                      >
                        {service.service === "API" ? `P95: ${service.latency} ms` : `${service.latency} ms`}
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        --
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
