"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import AuthGuard from "@/components/AuthGuard";
import NotificationList from "@/components/notifications/NotificationList";
import {
  type AppNotification,
  type NotificationPriority,
  type NotificationStatus,
  type NotificationType,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api";
import { getUser, getWorkspaceId } from "@/lib/auth";
import { useNotifications } from "@/hooks/useQueries";

const TYPE_LABELS: Record<NotificationType, string> = {
  policy: "Policy",
  risk: "Risk",
  claim: "Claim",
  compliance: "Compliance",
  fraud: "Fraud",
  audit: "Audit",
  system: "System",
};

const ROLE_ALLOWED_TYPES: Record<string, NotificationType[]> = {
  underwriter: ["policy", "risk", "system"],
  claims_adjuster: ["claim", "policy", "system"],
  compliance_officer: ["compliance", "audit", "fraud", "system"],
  fraud_analyst: ["fraud", "audit", "system"],
};

const STATUS_OPTIONS: Array<{ label: string; value: NotificationStatus | "all" }> = [
  { label: "All", value: "all" },
  { label: "Unread", value: "unread" },
  { label: "Read", value: "read" },
];

const PRIORITY_OPTIONS: Array<{ label: string; value: NotificationPriority | "all" }> = [
  { label: "All Priorities", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const workspaceId = getWorkspaceId();
  const currentRole = (getUser()?.role || "").trim().toLowerCase();

  const [typeFilter, setTypeFilter] = useState<NotificationType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<NotificationStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriority | "all">("all");
  const [offset, setOffset] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const limit = 20;

  const queryArgs = useMemo(
    () => ({
      type: typeFilter === "all" ? undefined : typeFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
      priority: priorityFilter === "all" ? undefined : priorityFilter,
      limit,
      offset,
      enabled: !!workspaceId,
    }),
    [typeFilter, statusFilter, priorityFilter, limit, offset, workspaceId],
  );

  const { data, isLoading, error } = useNotifications(workspaceId, queryArgs);

  const notifications = data?.notifications ?? [];
  const total = data?.total ?? 0;
  const unreadCount = data?.unread_count ?? 0;
  const hasMore = data?.has_more ?? false;

  const typeOptions = useMemo(() => {
    const roleTypes = ROLE_ALLOWED_TYPES[currentRole] ?? [];
    const derivedTypes = Array.from(new Set(notifications.map((item) => item.type)));
    const scopedTypes = roleTypes.length > 0 ? roleTypes : derivedTypes;

    return [
      { label: "All Types", value: "all" as const },
      ...scopedTypes.map((value) => ({
        value,
        label: TYPE_LABELS[value] ?? value,
      })),
    ];
  }, [currentRole, notifications]);

  useEffect(() => {
    const allowedValues = new Set(typeOptions.map((item) => item.value));
    if (!allowedValues.has(typeFilter)) {
      setTypeFilter("all");
      setOffset(0);
    }
  }, [typeFilter, typeOptions]);

  async function handleMarkRead(item: AppNotification) {
    if (!workspaceId || busyId === item.id) return;
    setBusyId(item.id);
    try {
      await markNotificationRead(workspaceId, item.id);
      await queryClient.invalidateQueries({ queryKey: ["notifications", workspaceId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark notification as read");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMarkAllRead() {
    if (!workspaceId || markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      const updated = await markAllNotificationsRead(workspaceId, {
        type: typeFilter === "all" ? undefined : typeFilter,
        priority: priorityFilter === "all" ? undefined : priorityFilter,
      });
      await queryClient.invalidateQueries({ queryKey: ["notifications", workspaceId] });
      toast.success(`Marked ${updated} notification${updated === 1 ? "" : "s"} as read`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark all notifications as read");
    } finally {
      setMarkingAll(false);
    }
  }

  function resetPaginationAndSet<T>(setter: (value: T) => void, value: T) {
    setOffset(0);
    setter(value);
  }

  return (
    <AuthGuard>
      <div className="px-6 py-6 max-w-6xl mx-auto w-full space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Notifications
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              Role-aware system events with read tracking and priority ordering.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleMarkAllRead();
            }}
            disabled={markingAll || unreadCount === 0}
            className="btn-primary"
            style={{ opacity: markingAll || unreadCount === 0 ? 0.7 : 1 }}
          >
            {markingAll ? "Marking..." : `Mark all read (${unreadCount})`}
          </button>
        </div>

        <div className="card p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <select
              className="input"
              value={typeFilter}
              onChange={(e) => resetPaginationAndSet(setTypeFilter, e.target.value as NotificationType | "all")}
            >
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={statusFilter}
              onChange={(e) => resetPaginationAndSet(setStatusFilter, e.target.value as NotificationStatus | "all")}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <select
              className="input"
              value={priorityFilter}
              onChange={(e) => resetPaginationAndSet(setPriorityFilter, e.target.value as NotificationPriority | "all")}
            >
              {PRIORITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <NotificationList
            notifications={notifications}
            loading={isLoading}
            errorMessage={error?.message || null}
            onSelect={(item) => {
              if (item.status === "unread") {
                void handleMarkRead(item);
              }
            }}
          />

          {!isLoading && !error && notifications.length > 0 && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid var(--border)", background: "var(--bg-surface)" }}
            >
              <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={offset === 0}
                  onClick={() => setOffset((prev) => Math.max(0, prev - limit))}
                >
                  Previous
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={!hasMore}
                  onClick={() => setOffset((prev) => prev + limit)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
