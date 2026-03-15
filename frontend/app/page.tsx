import OnboardingGate from "@/components/OnboardingGate";

/**
 * Root page – shows onboarding flow if first visit, redirects to /chat otherwise.
 */
export default function Home() {
  return <OnboardingGate />;
}
