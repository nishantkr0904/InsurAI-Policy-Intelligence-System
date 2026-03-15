import { redirect } from "next/navigation";

/**
 * Root page – immediately redirects to the Chat interface.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "Build role-based routing"
 */
export default function Home() {
  redirect("/chat");
}
