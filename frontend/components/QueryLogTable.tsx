"use client";

import React, { useState } from "react";
import { QueryLogEntry } from "@/lib/api";

interface QueryLogTableProps {
  logs: QueryLogEntry[];
  isLoading?: boolean;
}

export default function QueryLogTable({ logs, isLoading = false }: QueryLogTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error" | "timeout">("all");
  const [sortBy, setSortBy] = useState<"timestamp" | "response_time">("timestamp");

  const filteredLogs = React.useMemo(() => {
    let filtered = [...logs];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((log) =>
        log.query.toLowerCase().includes(term) ||
        log.query_id.toLowerCase().includes(term) ||
        log.user_id.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    filtered.sort((a, b) => {
      if (sortBy === "timestamp") {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else {
        return b.response_time_ms - a.response_time_ms;
      }
    });

    return filtered;
  }, [logs, searchTerm, statusFilter, sortBy]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "var(--success)";
      case "error":
        return "var(--danger)";
      case "timeout":
        return "var(--warning)";
      default:
        return "var(--text-secondary)";
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case "success":
        return "var(--success-soft)";
      case "error":
        return "var(--danger-soft)";
      case "timeout":
        return "var(--warning-soft)";
      default:
        return "var(--bg-surface)";
    }
  };

  if (isLoading) {
    return (
      <div
        className="rounded-lg p-8 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p style={{ color: "var(--text-secondary)" }}>Loading query logs...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div
        className="rounded-lg p-8 text-center"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <p style={{ color: "var(--text-secondary)" }}>No queries yet. Start asking questions!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Filters ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-3">
        <input
          type="text"
          placeholder="Search queries..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="timeout">Timeout</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-2 rounded-lg text-sm"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
          }}
        >
          <option value="timestamp">Sort: Recent</option>
          <option value="response_time">Sort: Slowest</option>
        </select>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div
        className="rounded-lg overflow-hidden"
        style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th
                  className="px-4 py-3 text-left font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Query
                </th>
                <th
                  className="px-4 py-3 text-left font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  User
                </th>
                <th
                  className="px-4 py-3 text-center font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Time (ms)
                </th>
                <th
                  className="px-4 py-3 text-center font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Tokens
                </th>
                <th
                  className="px-4 py-3 text-center font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Status
                </th>
                <th
                  className="px-4 py-3 text-right font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log, index) => (
                <tr
                  key={log.query_id}
                  style={{
                    borderBottom: index < filteredLogs.length - 1 ? "1px solid var(--border-subtle)" : undefined,
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="max-w-xs truncate" title={log.query} style={{ color: "var(--text-primary)" }}>
                      {log.query}
                    </div>
                    <div className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                      ID: {log.query_id.substring(0, 12)}...
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: "var(--text-secondary)" }}>
                    {log.user_id.substring(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        background:
                          log.response_time_ms < 500
                            ? "var(--success-soft)"
                            : log.response_time_ms < 1000
                              ? "var(--warning-soft)"
                              : "var(--danger-soft)",
                        color:
                          log.response_time_ms < 500
                            ? "var(--success)"
                            : log.response_time_ms < 1000
                              ? "var(--warning)"
                              : "var(--danger)",
                      }}
                    >
                      {log.response_time_ms}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center" style={{ color: "var(--text-secondary)" }}>
                    {log.token_usage}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className="px-2 py-1 rounded text-xs font-semibold"
                      style={{
                        background: getStatusBg(log.status),
                        color: getStatusColor(log.status),
                      }}
                    >
                      {log.status === "success" && "✓ Success"}
                      {log.status === "error" && "✗ Error"}
                      {log.status === "timeout" && "⏱ Timeout"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: "var(--text-secondary)" }}>
                    <div className="text-xs">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="text-xs mt-0.5">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Results count ──────────────────────────────────– */}
        <div
          className="px-4 py-3"
          style={{
            borderTop: "1px solid var(--border-subtle)",
            background: "rgba(59,130,246,0.02)",
          }}
        >
          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Showing {filteredLogs.length} of {logs.length} queries
            {searchTerm && ` (searched for "${searchTerm}")`}
          </p>
        </div>
      </div>
    </div>
  );
}
