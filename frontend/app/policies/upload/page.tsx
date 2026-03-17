"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated, isOnboarded } from "@/lib/auth";
import UploadPanel from "@/components/UploadPanel";
import OnboardingProgress from "@/components/OnboardingProgress";

/**
 * /policies/upload – first-run upload screen reached after workspace setup.
 * Requires auth + completed onboarding.
 */
export default function PoliciesUploadPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) { router.replace("/login"); return; }
    if (!isOnboarded()) { router.replace("/onboarding"); return; }
    const ws = localStorage.getItem("insurai_workspace") ?? "default";
    setWorkspaceId(ws);
  }, [router]);

  if (!workspaceId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full animate-spin border-2"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto w-full px-6 py-10 space-y-6">
      <div>
        <OnboardingProgress currentStep={3} />
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
          Upload your first policy
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Start by uploading a PDF or DOCX policy document to get AI-powered insights.
        </p>
      </div>

      <UploadPanel workspaceId={workspaceId} onUploaded={() => router.push("/dashboard")} />

      <div className="text-center">
        <button
          className="btn-ghost text-sm"
          onClick={() => router.push("/dashboard")}
        >
          Skip for now →
        </button>
      </div>
    </div>
  );
}
