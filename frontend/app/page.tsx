import LandingOrOnboarding from "@/components/LandingOrOnboarding";

/**
 * Root page – shows landing page for unauthenticated users,
 * redirects authenticated + onboarded users to /dashboard,
 * and shows OnboardingFlow for authenticated + not-yet-onboarded users.
 */
export default function Home() {
  return <LandingOrOnboarding />;
}
