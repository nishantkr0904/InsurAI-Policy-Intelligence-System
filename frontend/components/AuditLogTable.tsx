"use client";

import React, { useState, useMemo } from "react";
import type { AuditLogEntry } from "@/lib/api";

interface AuditLogTableProps {
  logs: AuditLogEntry[];
  onlyFailed?: boolean;
}

const ACTION_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  policy_upload: { label: "Policy Upload", icon: "📄", color: "var(--accent)" },
  policy_update: { label: "Policy Update", icon: "✏️", color: "var(--accent)" },
  claim_decision: { label: "Claim Decision", icon: "✅", color: "var(--success)" },
  risk_assessment: { label: "Risk Assessment", icon: "📊", color: "var(--warning)" },
  compliance_check: { label: "Compliance Check", icon: "🛡️", color: "var(--warning)" },
  fraud_alert: { label: "Fraud Alert", icon: "🚨", color: "var(--danger)" },
  login: { label: "Login", icon: "🔓", color: "var(--purple)" },
  logout: { label: "Logout", icon: "🔒", color: "var(--purple)" },
  settings_change: { label: "Settings Change", icon: "⚙️", color: "var(--accent)" },
};

export default function AuditLogTable({ logs, onlyFailed = false }: AuditLogTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failure">("all");
  const [sortBy, setSortBy] = useState<"timestamp" | "user">("timestamp");

  const filteredLogs = useMemo(() => {
    let filtered = [...logs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((log) =>
        log.user_name.toLowerCase().includes(term) ||
        log.resource_name.toLowerCase().includes(term) ||
        log.resource_id.toLowerCase().includes(term) ||
        log.description.toLowerCase().includes(term)
      );
    }

    if (actionFilter !== "all") {
      filtered = filtered.filter((log) => log.action_type === actionFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    if (onlyFailed) {
      filtered = filtered.filter((log) => log.status === "failure");
    }

    filtered.sort((a, b) => {
      if (sortBy === "timestamp") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else {
        return a.user_name.localeCompare(b.user_name);
      }
    });

    return filtered;
  }, [logs, searchTerm, actionFilter, statusFilter, sortBy, onlyFailed]);

  const uniqueActions = Array.from(new Set(logs.map((l) => l.action_type)));

  return (
    <div className="space-y-4">
      {/* ── Filters ─────────────────────────────────────────– */}
      <div className="grid grid-cols-4 gap-3">
        <input
          type="text"
          placeholder="Search user, resource, description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="col-span-2 px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <option value="all">All Actions</option>
          {uniqueActions.map((action) => (
            <option key={action} value={action}>
              {ACTION_LABELS[action]?.label || action}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </select>
      </div>

      {/* ── Sort ────────────────────────────────────────────– */}
      <div className="flex justify-between items-center">
        <p className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
          Showing {filteredLogs.length} of {logs.length} audit entries
        </p>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-1 rounded-lg text-xs"
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <option value="timestamp">Sort: Recent</option>
          <option value="user">Sort: User A-Z</option>
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────– */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Action
                </th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Resource
                </th>
                <th className="px-4 py-3 text-left font-semibold" style={{ color: "var(--text-secondary)" }}>
                  User
                </th>
                <th className="px-4 py-3 text-center font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Status
                </th>
                <th className="px-4 py-3 text-right font-semibold" style={{ color: "var(--text-secondary)" }}>
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => {
                const actionInfo = ACTION_LABELS[log.action_type] || { label: log.action_type, icon: "•", color: "var(--text-secondary)" };
                return (
                  <tr
                    key={log.id}
                    style={{
                      borderBottom: index < filteredLogs.length - 1 ? "1px solid var(--border-subtle)" : undefined,
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{actionInfo.icon}</span>
                        <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                          {actionInfo.label}
                        </span>
                      </div>
                      {log.description && (
                        <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                          {log.description}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-xs">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
                          {log.resource_name}
                        </p>
                        <p className="text-xs text-center" style={{ color: "var(--text-secondary)" }}>
                          {log.resource_type}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      {log.user_name}
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {log.user_id.substring(0, 8)}...
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className="inline-block px-2 py-1 rounded text-xs font-semibold"
                        style={{
                          background: log.status === "success" ? "var(--success-soft)" : "var(--danger-soft)",
                          color: log.status === "success" ? "var(--success)" : "var(--danger)",
                        }}
                      >
                        {log.status === "success" ? "✓ Success" : "✗ Failed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="text-xs" style={{ color: "var(--text-primary)" }}>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                        {new Date(log.timestamp).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Empty State ─────────────────────────────────── */}
        {filteredLogs.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p style={{ color: "var(--text-secondary)" }}>
              {logs.length === 0 ? "No audit logs found" : "No entries match your filters"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
