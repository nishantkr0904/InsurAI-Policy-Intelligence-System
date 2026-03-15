import LandingOrOnboarding from "@/components/LandingOrOnboarding";

/**
 * Root page – shows landing page for unauthenticated users,
 * or the onboarding wizard for newly-signed-up users.
 */
export default function Home() {
  return <LandingOrOnboarding />;
}
