"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { isAuthenticated, isOnboarded, getUser } from "@/lib/auth";
import DashboardSidebar from "@/components/DashboardSidebar";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [showSidebar, setShowSidebar] = useState(false);

  const hideShellRoutes = useMemo(
    () =>
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname.startsWith("/onboarding"),
    [pathname],
  );

  useEffect(() => {
    if (hideShellRoutes) {
      setShowSidebar(false);
      return;
    }

    const authed = isAuthenticated();
    const onboarded = isOnboarded();
    const role = getUser()?.role;
    setShowSidebar(authed && onboarded && !!role);
  }, [hideShellRoutes, pathname]);

  if (!showSidebar) {
    return <main className="flex-1 flex flex-col overflow-auto">{children}</main>;
  }

  return (
    <div className="flex flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      <DashboardSidebar />
      <main className="flex-1 flex flex-col overflow-auto">{children}</main>
    </div>
  );
}