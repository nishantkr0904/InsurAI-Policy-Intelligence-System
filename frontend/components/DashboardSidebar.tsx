"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { getRoleSidebarLinks, getRoleLabel, type NavLink } from "@/lib/rbac";

/**
 * Dashboard Sidebar - shows role-specific navigation links.
 * Dynamically filters links based on the user's role.
 */
export default function DashboardSidebar() {
  const pathname = usePathname();
  const [sidebarLinks, setSidebarLinks] = useState<NavLink[]>([]);
  const [roleLabel, setRoleLabel] = useState<string>("");

  useEffect(() => {
    const user = getUser();
    const role = user?.role || null;
    setSidebarLinks(getRoleSidebarLinks(role));
    setRoleLabel(getRoleLabel(role));
  }, [pathname]);

  function isActive(href: string) {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      className="w-52 shrink-0 flex flex-col gap-0.5 p-3 border-r overflow-y-auto"
      style={{ background: "var(--bg-surface)", borderColor: "var(--border)" }}
    >
      {/* Section title with role indicator */}
      <div className="px-2 pt-2 pb-3">
        <p
          className="section-title"
          style={{ margin: 0 }}
        >
          {roleLabel.toUpperCase()}
        </p>
      </div>

      {/* Role-filtered navigation links */}
      {sidebarLinks.map(({ href, label, icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
            style={{
              color: active ? "var(--text-primary)" : "var(--text-secondary)",
              background: active ? "rgba(59,130,246,0.12)" : "transparent",
              textDecoration: "none",
            }}
          >
            {icon && <span className="text-base leading-none">{icon}</span>}
            <span>{label}</span>
            {active && (
              <span
                className="ml-auto w-1.5 h-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
