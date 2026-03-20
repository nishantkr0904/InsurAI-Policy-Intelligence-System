import type { Metadata } from "next";
import AnalyticsClient from "./AnalyticsClient";

/**
 * Query Analytics page – comprehensive analysis of AI query metrics.
 * FR026: Query analytics, query logs, usage patterns.
 */

export const metadata: Metadata = { title: "Query Analytics – InsurAI" };

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
