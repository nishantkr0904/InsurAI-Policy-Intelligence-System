"use client";

import { useState } from "react";
import { toast } from "sonner";
import { exportReport, type ReportType, type ExportFormat } from "@/lib/api";

interface ExportPanelProps {
  workspaceId: string;
  policyId?: string;
  isDemo: boolean;
}

export default function ExportPanel({ workspaceId, policyId = "policy_default", isDemo }: ExportPanelProps) {
  const [exporting, setExporting] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  async function handleExport(format: ExportFormat, reportType: ReportType = "summary") {
    setExporting(true);
    setShowMenu(false);

    try {
      if (isDemo) {
        // Simulate export for demo
        await new Promise(r => setTimeout(r, 1500));
        toast.success(`Report exported as ${format.toUpperCase()} (demo mode)`);
      } else {
        // Real export
        const response = await exportReport({
          policy_id: policyId,
          report_type: reportType,
          export_format: format,
          workspace_id: workspaceId,
          include_analytics: false,
        });

        if (response.status !== "success") {
          throw new Error(response.message || "Export failed");
        }

        // Download from presigned URL
        if (response.download_url) {
          const a = document.createElement("a");
          a.href = response.download_url;
          a.download = response.file_name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }

        toast.success(`Report exported as ${format.toUpperCase()}`);
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export report");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        disabled={exporting}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
        style={{
          background: "var(--accent-soft)",
          color: "var(--accent)",
          border: "1px solid var(--accent)",
          opacity: exporting ? 0.5 : 1,
          cursor: exporting ? "not-allowed" : "pointer",
        }}
      >
        {exporting ? (
          <>
            <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>Exporting...</span>
          </>
        ) : (
          <>
            <span>📄</span>
            <span>Export Report</span>
          </>
        )}
      </button>

      {showMenu && !exporting && (
        <div
          className="absolute top-full right-0 mt-2 w-48 rounded-lg p-2 shadow-lg z-50"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
          }}
        >
          {[
            { format: "pdf" as const, icon: "📕", label: "Export as PDF" },
            { format: "json" as const, icon: "📊", label: "Export as JSON" },
            { format: "csv" as const, icon: "📈", label: "Export as CSV" },
          ].map((item) => (
            <button
              key={item.format}
              onClick={() => handleExport(item.format)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors"
              style={{
                background: "transparent",
                color: "var(--text-primary)",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "var(--bg-surface)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Click outside to close */}
      {showMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
