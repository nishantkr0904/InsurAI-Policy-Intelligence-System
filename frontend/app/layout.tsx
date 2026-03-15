import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

/**
 * Root layout – wraps every page in the InsurAI application.
 *
 * Architecture ref:
 *   docs/roadmap.md Phase 7 – "Build role-based routing"
 *   docs/roadmap.md Phase 7 – "Polished, functional UI"
 */

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "InsurAI – Policy Intelligence System",
  description:
    "AI-powered insurance policy analysis: upload policies, ask questions, and get grounded, cited answers.",
  keywords: ["insurance", "AI", "RAG", "policy analysis", "compliance"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col">
        {/* ── Top Navigation ── */}
        <header
          className="flex items-center justify-between px-6 py-3 border-b"
          style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}
        >
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="#6366f1" />
              <path
                d="M8 20V9l6-3 6 3v11l-6 3-6-3z"
                stroke="#fff"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            <span className="font-bold text-lg tracking-tight" style={{ color: "var(--text-primary)" }}>
              InsurAI
            </span>
            <span className="badge badge-accent ml-1">Beta</span>
          </div>

          <nav className="flex items-center gap-6 text-sm" style={{ color: "var(--text-secondary)" }}>
            <a href="/chat"     className="hover:text-white transition-colors">Chat</a>
            <a href="/documents" className="hover:text-white transition-colors">Documents</a>
          </nav>
        </header>

        {/* ── Page Content ── */}
        <main className="flex-1 flex flex-col">{children}</main>

        {/* ── Footer ── */}
        <footer
          className="text-center text-xs py-3"
          style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--border)" }}
        >
          InsurAI Policy Intelligence System · AI responses are for informational purposes only.
        </footer>
      </body>
    </html>
  );
}
