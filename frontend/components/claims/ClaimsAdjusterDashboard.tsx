import ClaimsClient from "./ClaimsClient";

/**
 * Claims-adjuster-only dashboard container.
 * Kept separate to prevent cross-role leakage into other personas.
 */
export default function ClaimsAdjusterDashboard() {
  return <ClaimsClient />;
}
