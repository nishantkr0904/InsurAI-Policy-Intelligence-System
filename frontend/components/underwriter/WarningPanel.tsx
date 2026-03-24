"use client";

import { EdgeCaseWarning } from "@/lib/api";

interface WarningPanelProps {
  warnings: EdgeCaseWarning[];
}

export default function WarningPanel({ warnings }: WarningPanelProps) {
  if (!warnings || warnings.length === 0) {
    return null;
  }

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "error":
        return {
          bg: "var(--danger-soft)",
          border: "var(--danger)",
          icon: "⚠",
          color: "var(--danger)",
        };
      case "warning":
        return {
          bg: "var(--warning-soft)",
          border: "var(--warning)",
          icon: "⚡",
          color: "var(--warning)",
        };
      case "info":
      default:
        return {
          bg: "var(--info-soft)",
          border: "var(--info)",
          icon: "ℹ",
          color: "var(--info)",
        };
    }
  };

  return (
    <div className="space-y-2 rounded-lg p-3" style={{ background: "var(--bg-surface)" }}>
      {warnings.map((warning, idx) => {
        const config = getSeverityConfig(warning.severity);
        return (
          <div
            key={idx}
            className="rounded border-l-4 p-3"
            style={{
              borderColor: config.border,
              background: config.bg,
            }}
          >
            <div className="flex gap-2">
              <span style={{ color: config.color, fontSize: "18px" }}>
                {config.icon}
              </span>
              <div className="flex-1">
                <div
                  className="text-sm font-semibold"
                  style={{ color: config.color }}
                >
                  {warning.warning_type === "low_confidence" && "Low Confidence"}
                  {warning.warning_type === "conflicting_data" && "Conflicting Information"}
                  {warning.warning_type === "no_data" && "No Data Found"}
                  {warning.warning_type === "processing_failed" && "Processing Failed"}
                </div>
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  {warning.message}
                </p>
                {warning.recommended_action && (
                  <p
                    className="text-xs mt-2 italic"
                    style={{ color: "var(--text-muted)" }}
                  >
                    💡 {warning.recommended_action}
                  </p>
                )}
                {warning.affected_documents && warning.affected_documents.length > 0 && (
                  <div className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                    Affected: {warning.affected_documents.join(", ")}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
