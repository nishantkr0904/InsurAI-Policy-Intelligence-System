"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

// Lazy-load the interactive query section — it's below the fold and contains
// a typewriter effect + event handlers that don't need to block initial render.
const PolicyQuerySection = dynamic(() => import("./PolicyQuerySection"), {
  ssr: false,
  loading: () => (
    <section style={{ padding: "80px 24px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>
      Loading…
    </section>
  ),
});/**
 * Public marketing landing page – shown to unauthenticated visitors at `/`.
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col" style={{ overflowX: "hidden" }}>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section
        className="relative flex flex-col items-center text-center px-6"
        style={{ paddingTop: "80px", paddingBottom: "96px" }}
      >
        {/* Radial glow */}
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ zIndex: 0 }}
        >
          <div style={{
            position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)",
            width: "900px", height: "600px",
            background: "radial-gradient(ellipse at center, rgba(59,130,246,0.13) 0%, transparent 65%)",
          }} />
        </div>

        <div className="relative" style={{ zIndex: 1, maxWidth: "720px" }}>
          {/* Beta pill */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)",
            borderRadius: "99px", padding: "4px 16px", marginBottom: "28px",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
            <span style={{ fontSize: "12px", color: "var(--accent)", fontWeight: 600, letterSpacing: "0.04em" }}>
              Enterprise AI Platform · Beta
            </span>
          </div>

          <h1 style={{
            fontSize: "clamp(2.4rem, 6vw, 4.25rem)",
            fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08,
            color: "var(--text-primary)",
          }}>
            <span className="gradient-text">AI-Powered</span>
            <br />Policy Intelligence
          </h1>

          <p style={{
            marginTop: "22px", fontSize: "1.15rem",
            color: "var(--text-secondary)", lineHeight: 1.75, maxWidth: "540px", margin: "22px auto 0",
          }}>
            Understand insurance policies instantly. Validate claims with AI.
            Detect fraud patterns. Built for enterprise insurance operations.
          </p>

          <div style={{ display: "flex", gap: "12px", marginTop: "40px", flexWrap: "wrap", justifyContent: "center" }}>
            <Link href="/signup" className="btn-primary" style={{ padding: "13px 30px", fontSize: "15px", borderRadius: "10px" }}>
              Start Free Trial →
            </Link>
            <Link href="/login" className="btn-secondary" style={{ padding: "13px 30px", fontSize: "15px", borderRadius: "10px" }}>
              Sign In
            </Link>
          </div>

          {/* Security badges */}
          <div style={{ display: "flex", gap: "12px", marginTop: "40px", flexWrap: "wrap", justifyContent: "center" }}>
            {["🔒 SOC2 Compliant", "🛡️ PII Protected", "🔐 AES-256 Encrypted", "✅ RBAC Security"].map((b) => (
              <span key={b} style={{
                fontSize: "12px", color: "var(--text-secondary)",
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "6px", padding: "5px 11px",
              }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Problem Statement ───────────────────────────────────── */}
      <section style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        padding: "72px 24px",
      }}>
        <div style={{ maxWidth: "960px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            The Problem with Manual Policy Analysis
          </h2>
          <p style={{ marginTop: "12px", color: "var(--text-secondary)", maxWidth: "520px", margin: "12px auto 0" }}>
            Insurance teams spend weeks manually reviewing policies — leading to costly errors, missed fraud, and compliance failures.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginTop: "44px" }}>
            {[
              { stat: "40+ hrs", desc: "Average time to review a policy manually" },
              { stat: "$80B+", desc: "Annual insurance fraud losses in the US" },
              { stat: "30%", desc: "Claims delayed by manual verification" },
              { stat: "60%", desc: "Compliance errors from outdated processes" },
            ].map(({ stat, desc }) => (
              <div key={stat} className="card card-hover" style={{ textAlign: "center", padding: "24px 16px" }}>
                <div className="gradient-text" style={{ fontSize: "2.25rem", fontWeight: 800, lineHeight: 1 }}>{stat}</div>
                <div style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "8px", lineHeight: 1.5 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section className="below-fold" style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2 style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              How InsurAI Works
            </h2>
            <p style={{ marginTop: "10px", color: "var(--text-secondary)" }}>
              Four simple steps to AI-powered policy intelligence
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "20px" }}>
            {[
              { step: "01", icon: "📄", title: "Upload Policies", desc: "Drag & drop PDF or DOCX policy documents. Supports batch upload for entire portfolios.", color: "var(--accent)" },
              { step: "02", icon: "⚡", title: "AI Indexing", desc: "Our RAG engine chunks, embeds, and indexes your policies in seconds — fully searchable.", color: "var(--purple)" },
              { step: "03", icon: "💬", title: "Ask Questions", desc: "Query in plain English. Get precise, citation-backed answers from your actual policies.", color: "var(--success)" },
              { step: "04", icon: "✅", title: "Validate & Report", desc: "Validate claims, detect fraud patterns, and generate compliance reports automatically.", color: "var(--warning)" },
            ].map(({ step, icon, title, desc, color }) => (
              <div key={step} className="card card-hover" style={{ position: "relative" }}>
                <div style={{
                  position: "absolute", top: "14px", right: "14px",
                  fontSize: "10px", fontWeight: 700, color,
                  background: `${color}1a`, borderRadius: "4px", padding: "2px 7px",
                  letterSpacing: "0.04em",
                }}>{step}</div>
                <div style={{ fontSize: "30px", marginBottom: "14px" }}>{icon}</div>
                <h3 style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "6px", fontSize: "15px" }}>{title}</h3>
                <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────── */}
      <section className="below-fold" style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        padding: "80px 24px",
      }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2 style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Why Insurance Teams Choose InsurAI
            </h2>
            <p style={{ marginTop: "10px", color: "var(--text-secondary)" }}>
              Trusted by underwriters, claims teams, and compliance officers
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
            {[
              {
                initials: "SR",
                name: "Sarah Reynolds",
                role: "Senior Underwriter",
                company: "Meridian Insurance Group",
                color: "var(--accent)",
                quote: "InsurAI cut our policy review time in half. I can now query coverage terms across hundreds of documents in seconds — what used to take days is done before lunch.",
              },
              {
                initials: "DK",
                name: "David Kim",
                role: "Claims Director",
                company: "PacificShield Mutual",
                color: "var(--success)",
                quote: "The citation-backed answers are a game-changer. My team validates claims with full confidence knowing every AI response is grounded in the actual policy language.",
              },
              {
                initials: "ML",
                name: "Maria Lopez",
                role: "Chief Compliance Officer",
                company: "Vantage Re",
                color: "var(--purple)",
                quote: "Audit readiness used to keep me up at night. With InsurAI's complete activity trail and automated compliance reports, I can walk into any regulatory review without hesitation.",
              },
            ].map(({ initials, name, role, company, color, quote }) => (
              <div key={name} data-testid="testimonial-card" className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <p style={{ fontSize: "14px", color: "var(--text-secondary)", lineHeight: 1.75, fontStyle: "italic", flexGrow: 1 }}>
                  &ldquo;{quote}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                  <div style={{
                    width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                    background: `${color}22`, border: `2px solid ${color}44`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "13px", fontWeight: 700, color,
                  }}>{initials}</div>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{role} · {company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Role-Based Features ─────────────────────────────────── */}
      <section className="below-fold" style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        padding: "80px 24px",
      }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "52px" }}>
            <h2 style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              Built for Every Insurance Professional
            </h2>
            <p style={{ marginTop: "10px", color: "var(--text-secondary)" }}>
              Role-based intelligence tailored to your workflow
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {[
              { role: "Underwriters", icon: "📋", color: "var(--accent)", desc: "Analyze coverage terms, assess risk exposure, and query policy deductibles and exclusions instantly." },
              { role: "Claims Teams", icon: "✔️", color: "var(--success)", desc: "Validate claims against policy terms with AI-powered cross-referencing and decision reasoning." },
              { role: "Fraud Analysts", icon: "🔍", color: "var(--danger)", desc: "Detect inconsistencies, flag suspicious claim patterns, and track risk scores across all submissions." },
              { role: "Compliance Officers", icon: "🛡️", color: "var(--warning)", desc: "Monitor regulatory adherence, run audits, and generate compliance reports with full audit trails." },
              { role: "Brokers", icon: "🤝", color: "var(--purple)", desc: "Compare policy terms instantly and answer client coverage questions with confidence and speed." },
              { role: "Auditors", icon: "📊", color: "var(--text-secondary)", desc: "Full audit trail of all AI queries, claims validations, document access, and system events." },
            ].map(({ role, icon, color, desc }) => (
              <div key={role} className="card card-hover" style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
                <div style={{
                  fontSize: "20px", flexShrink: 0, width: "42px", height: "42px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${color}1a`, borderRadius: "10px",
                }}>{icon}</div>
                <div>
                  <h3 style={{ fontWeight: 600, color: "var(--text-primary)", marginBottom: "5px", fontSize: "14px" }}>{role}</h3>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.65 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI Transparency ─────────────────────────────────────── */}
      <section className="below-fold" style={{ padding: "80px 24px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            AI You Can Trust
          </h2>
          <p style={{ marginTop: "10px", color: "var(--text-secondary)", marginBottom: "44px" }}>
            Every answer is grounded in your policies — not hallucinations
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
            {[
              { icon: "🔗", title: "Citation-Backed", desc: "Every answer links to the exact policy clause. Zero guesswork." },
              { icon: "📍", title: "Source Transparency", desc: "See which document and page each answer came from." },
              { icon: "💡", title: "Reasoning Explained", desc: "Understand why the AI gave a particular answer." },
              { icon: "📋", title: "Audit Trail", desc: "Every AI query and decision is logged for compliance." },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="card card-hover" style={{ textAlign: "center", padding: "28px 20px" }}>
                <div style={{ fontSize: "28px", marginBottom: "12px" }}>{icon}</div>
                <h3 style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: "14px", marginBottom: "6px" }}>{title}</h3>
                <p style={{ fontSize: "12px", color: "var(--text-secondary)", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ────────────────────────────────────────────── */}
      <section className="below-fold" style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
        padding: "72px 24px",
      }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "1.875rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Enterprise-Grade Security
          </h2>
          <p style={{ marginTop: "10px", color: "var(--text-secondary)", marginBottom: "44px" }}>
            Your policy data is protected at every layer
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {[
              { label: "SOC2 Type II", desc: "Certified security controls", icon: "🏆" },
              { label: "AES-256 Encrypted", desc: "End-to-end encryption", icon: "🔐" },
              { label: "RBAC", desc: "Role-based access control", icon: "👥" },
              { label: "Audit Logging", desc: "Complete activity trail", icon: "📋" },
              { label: "On-Premise Deployment", desc: "Deploy in your own environment", icon: "🖥️" },
              { label: "Data Isolation", desc: "Tenant-level data separation", icon: "🗄️" },
            ].map(({ label, desc, icon }) => (
              <div key={label} data-testid="security-card" className="card card-hover" style={{
                display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px",
              }}>
                <span style={{ fontSize: "20px" }}>{icon}</span>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Example Questions (interactive chips + query input) ── */}
      <PolicyQuerySection />

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className="below-fold" style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        padding: "80px 24px", textAlign: "center",
      }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 800, letterSpacing: "-0.03em", color: "var(--text-primary)", lineHeight: 1.15 }}>
            Ready to transform your{" "}
            <span className="gradient-text">insurance operations?</span>
          </h2>
          <p style={{ marginTop: "18px", color: "var(--text-secondary)", fontSize: "1.0625rem", lineHeight: 1.7 }}>
            Join insurance teams using InsurAI to process policies faster,
            validate claims accurately, and stay audit-ready.
          </p>
          <ul data-testid="cta-benefits" style={{ listStyle: "none", padding: 0, margin: "28px 0 0", display: "flex", flexDirection: "column", gap: "10px", alignItems: "center" }}>
            {[
              "Process policies 10x faster",
              "Reduce fraud detection time",
              "Ensure regulatory compliance",
            ].map((benefit) => (
              <li key={benefit} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "var(--text-secondary)" }}>
                <span style={{ color: "var(--success)", fontSize: "16px", lineHeight: 1 }}>✓</span>
                {benefit}
              </li>
            ))}
          </ul>
          <div style={{ display: "flex", gap: "12px", marginTop: "32px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/signup" data-testid="cta-start-trial" className="btn-primary" style={{ padding: "14px 34px", fontSize: "15px", borderRadius: "10px" }}>
              Start Free Trial →
            </Link>
            <Link href="/login" className="btn-secondary" style={{ padding: "14px 34px", fontSize: "15px", borderRadius: "10px" }}>
              Sign In
            </Link>
          </div>
          <p style={{ marginTop: "14px", fontSize: "12px", color: "var(--text-muted)" }}>
            No credit card required · SOC2 compliant · Cancel anytime
          </p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer data-testid="site-footer" style={{
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        padding: "64px 24px 32px",
      }}>
        <div style={{ maxWidth: "960px", margin: "0 auto" }}>
          {/* Top row: brand + nav columns */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr repeat(5, 1fr)", gap: "32px", marginBottom: "48px" }}>
            {/* Brand */}
            <div>
              <div style={{ fontWeight: 800, fontSize: "17px", color: "var(--text-primary)", marginBottom: "10px", letterSpacing: "-0.02em" }}>
                🛡️ InsurAI
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.7, maxWidth: "200px" }}>
                AI-powered policy intelligence for modern insurance teams.
              </p>
            </div>

            {/* Nav columns */}
            {[
              {
                heading: "Product",
                testId: "footer-product",
                links: [
                  { label: "Features", href: "/#features" },
                  { label: "How It Works", href: "/#how-it-works" },
                  { label: "Pricing", href: "/pricing" },
                  { label: "Changelog", href: "/changelog" },
                ],
              },
              {
                heading: "Security",
                testId: "footer-security",
                links: [
                  { label: "SOC2 Type II", href: "/security" },
                  { label: "Data Isolation", href: "/security#isolation" },
                  { label: "On-Premise", href: "/security#on-premise" },
                  { label: "Audit Logging", href: "/security#audit" },
                ],
              },
              {
                heading: "Documentation",
                testId: "footer-documentation",
                links: [
                  { label: "Getting Started", href: "/docs" },
                  { label: "API Reference", href: "/docs/api" },
                  { label: "Integrations", href: "/docs/integrations" },
                  { label: "Guides", href: "/docs/guides" },
                ],
              },
              {
                heading: "Company",
                testId: "footer-company",
                links: [
                  { label: "About", href: "/about" },
                  { label: "Contact", href: "/contact" },
                  { label: "Blog", href: "/blog" },
                  { label: "Careers", href: "/careers" },
                ],
              },
              {
                heading: "Legal",
                testId: "footer-legal",
                links: [
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms", href: "/terms" },
                  { label: "Cookie Policy", href: "/cookies" },
                  { label: "GDPR", href: "/gdpr" },
                ],
              },
            ].map(({ heading, testId, links }) => (
              <div key={heading} data-testid={testId}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "14px" }}>
                  {heading}
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "9px" }}>
                  {links.map(({ label, href }) => (
                    <li key={label}>
                      <Link href={href} className="footer-link" style={{ fontSize: "13px", textDecoration: "none" }}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom row: copyright */}
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <p style={{ fontSize: "12px", color: "var(--text-muted)" }}>
              © {new Date().getFullYear()} InsurAI. All rights reserved.
            </p>
            <div style={{ display: "flex", gap: "20px" }}>
              {[
                { label: "Privacy Policy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Contact", href: "/contact" },
              ].map(({ label, href }) => (
                <Link key={label} href={href} className="footer-link-muted" style={{ fontSize: "12px", textDecoration: "none" }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
   );
}
