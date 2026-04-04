import type { Metadata } from "next";
import AuthGuard from "@/components/AuthGuard";
import FraudOverviewClient from "./FraudOverviewClient";

export const metadata: Metadata = { title: "Overview – InsurAI" };

export default function FraudOverviewPage() {
  return (
    <AuthGuard allowedRoles={["fraud_analyst", "admin"]}>
      <FraudOverviewClient />
    </AuthGuard>
  );
}
