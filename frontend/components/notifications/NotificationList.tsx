"use client";

import type { AppNotification } from "@/lib/api";

interface NotificationListProps {
  notifications: AppNotification[];
  loading?: boolean;
  errorMessage?: string | null;
  compact?: boolean;
  onSelect?: (notification: AppNotification) => void;
}

function iconForType(type: AppNotification["type"]): string {
  switch (type) {
    case "fraud":
      return "⚠️";
    case "compliance":
      return "📋";
    case "claim":
      return "✅";
    case "policy":
      return "📄";
    case "risk":
      return "📊";
    case "audit":
      return "📜";
    default:
      return "🔔";
  }
}

function dotForPriority(priority: AppNotification["priority"]): string {
  switch (priority) {
    case "critical":
      return "var(--danger)";
    case "high":
      return "var(--warning)";
    case "medium":
      return "var(--accent)";
    default:
      return "var(--success)";
  }
}

function toRelativeTime(iso: string): string {
  const ts = new Date(iso).getTime();
  const diffMs = Date.now() - ts;
  const minutes = Math.max(1, Math.floor(diffMs / (60 * 1000)));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationList({
  notifications,
  loading,
  errorMessage,
  compact = false,
  onSelect,
}: NotificationListProps) {
  if (loading) {
    return (
      <div className="px-4 py-5 text-sm" style={{ color: "var(--text-secondary)" }}>
        Loading notifications...
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="px-4 py-5 text-sm" style={{ color: "var(--danger)" }}>
        {errorMessage}
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="px-4 py-5 text-sm" style={{ color: "var(--text-secondary)" }}>
        No notifications yet.
      </div>
    );
  }

  return (
    <div className="max-h-[55vh] overflow-y-auto">
      {notifications.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect?.(item)}
          className="w-full flex items-start gap-3 px-4 py-3 text-left"
          style={{
            borderBottom: "1px solid var(--border-subtle)",
            cursor: onSelect ? "pointer" : "default",
            background: item.status === "unread" ? "rgba(59,130,246,0.06)" : "transparent",
          }}
        >
          <span style={{ fontSize: compact ? "14px" : "16px", flexShrink: 0, marginTop: "1px" }}>
            {iconForType(item.type)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>
              {item.title}
            </p>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: compact ? 1 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
            >
              {item.message}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {toRelativeTime(item.created_at)}
            </p>
          </div>
          <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: dotForPriority(item.priority) }} />
        </button>
      ))}
    </div>
  );
}
