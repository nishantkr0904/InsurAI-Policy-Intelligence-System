import type { Metadata } from "next";
import DashboardClient from "./DashboardClient";

/**
 * Dashboard overview – analytics & quick actions.
 * FR025-FR027: policy analytics, query analytics, risk trends.
 */

export const metadata: Metadata = { title: "Dashboard – InsurAI" };

export default function DashboardPage() {
  return <DashboardClient />;
}
