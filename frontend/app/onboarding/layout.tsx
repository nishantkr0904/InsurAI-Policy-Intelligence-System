import type { Metadata } from "next";
import OnboardingHeader from "./OnboardingHeader";

export const metadata: Metadata = {
  title: "Get Started – InsurAI",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col flex-1" style={{ minHeight: "100%" }}>
      <OnboardingHeader />
      {children}
    </div>
  );
}
