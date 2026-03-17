import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import Navbar from "@/components/Navbar";
import ClientLayoutWrapper from "@/components/ClientLayoutWrapper";
import QueryProvider from "@/components/QueryProvider";

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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0d1117",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Preconnect to Google Fonts to reduce font load latency */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col">
        <QueryProvider>
          <ClientLayoutWrapper>
            {/* ── Top Navigation ── */}
            <Navbar />

            {/* ── Page Content ── */}
            <main className="flex-1 flex flex-col overflow-auto">{children}</main>

            {/* ── Footer ── */}
            <footer
              className="shrink-0 text-center text-xs py-3"
              style={{
                color: "var(--text-muted)",
                borderTop: "1px solid var(--border)",
                background: "var(--bg-surface)",
              }}
            >
              <span className="gradient-text font-semibold">InsurAI</span>
              {" "}· AI responses are for informational purposes only.
            </footer>
          </ClientLayoutWrapper>
        </QueryProvider>
      </body>
    </html>
  );
}
