import { test, expect, type Page } from "@playwright/test";

/** Clear onboarding state so each test starts clean unless overridden */
async function clearOnboarding(page: Page) {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_workspace");
  });
}

/** Set onboarding as already completed */
async function setOnboarded(page: Page, workspace = "default") {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.setItem("insurai_workspace", "default");
  });
}

// ─── Test 1: Full onboarding flow ────────────────────────────────────────────
test("onboarding flow – step through all 4 steps and land on /dashboard", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_workspace");
  });

  await page.goto("/onboarding");

  // Step 1 – Upload your first policy
  await expect(page.getByText("Let's get your first policy analyzed")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await expect(page.getByText("Upload your first policy")).toBeVisible();
  await page.getByTestId("next-step").click();

  // Step 2 – Index policies
  await expect(page.getByText("Step 2 of 4")).toBeVisible();
  await expect(page.getByText("Index policies")).toBeVisible();
  await page.getByTestId("next-step").click();

  // Step 3 – Ask a policy question
  await expect(page.getByText("Step 3 of 4")).toBeVisible();
  await expect(page.getByText("Ask a policy question")).toBeVisible();
  await page.getByTestId("next-step").click();

  // Step 4 – Validate a claim
  await expect(page.getByText("Step 4 of 4")).toBeVisible();
  await expect(page.getByText("Validate a claim")).toBeVisible();
  await page.getByTestId("launch-btn").click();

  // Should land on /dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
});

// ─── Test 1b: Onboarding steps render ────────────────────────────────────────
test("onboarding steps render – all 4 step titles and action buttons present", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_workspace");
  });

  await page.goto("/onboarding");

  // Step 1
  await expect(page.getByTestId("onboarding-step")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Upload your first policy")).toBeVisible();
  await expect(page.getByTestId("step-action-upload")).toBeVisible();
  await page.getByTestId("next-step").click();

  // Step 2
  await expect(page.getByText("Index policies")).toBeVisible();
  await expect(page.getByTestId("step-action-index")).toBeVisible();
  await page.getByTestId("next-step").click();

  // Step 3
  await expect(page.getByText("Ask a policy question")).toBeVisible();
  await expect(page.getByTestId("step-action-ask")).toBeVisible();
  await page.getByTestId("next-step").click();

  // Step 4
  await expect(page.getByText("Validate a claim")).toBeVisible();
  await expect(page.getByTestId("step-action-validate")).toBeVisible();
});

// ─── Test 1c: Progress indicator exists ──────────────────────────────────────
test("progress indicator – shows Step X of 4 and advances on navigation", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_workspace");
  });

  await page.goto("/onboarding");

  const indicator = page.getByTestId("progress-indicator");
  await expect(indicator).toBeVisible({ timeout: 10_000 });
  await expect(indicator).toContainText("Step 1 of 4");

  await page.getByTestId("next-step").click();
  await expect(indicator).toContainText("Step 2 of 4");

  await page.getByTestId("next-step").click();
  await expect(indicator).toContainText("Step 3 of 4");

  await page.getByTestId("next-step").click();
  await expect(indicator).toContainText("Step 4 of 4");
});

// ─── Test 2: Chat page direct access ─────────────────────────────────────────
test("chat page – shows POLICY CHAT header and input bar", async ({ page }) => {
  await setOnboarded(page);

  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ answer: "test", sources: [], model: "gpt-4", token_usage: { total_tokens: 10 }, retrieved_chunks: 1 }),
    })
  );

  await page.goto("/chat");

  await expect(page.getByText("POLICY CHAT")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("input[placeholder*='coverage']")).toBeVisible();
});

// ─── Test 3: Documents page ───────────────────────────────────────────────────
test("documents page – shows Documents heading", async ({ page }) => {
  await page.goto("/documents");

  await expect(
    page.getByRole("heading", { name: /documents/i }).or(page.getByText(/documents/i)).first()
  ).toBeVisible({ timeout: 10_000 });
});

// ─── Test 4: Onboarding skip – already onboarded ─────────────────────────────
test("onboarding skip – already onboarded redirects to /dashboard", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.setItem("insurai_workspace", "default");
  });

  await page.goto("/onboarding");

  // Should redirect to /dashboard without showing onboarding
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  await expect(page.getByText("Welcome to InsurAI")).not.toBeVisible();
});

// ─── Test 5: Suggestion chips ────────────────────────────────────────────────
test("suggestion chips – visible in empty state, clicking fills input", async ({ page }) => {
  await setOnboarded(page);

  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ answer: "test", sources: [], model: "gpt-4", token_usage: { total_tokens: 10 }, retrieved_chunks: 1 }),
    })
  );

  await page.goto("/chat");

  // Wait for the chat panel to fully render
  await expect(page.getByText("POLICY CHAT")).toBeVisible({ timeout: 10_000 });

  // Suggestion chips should be visible
  const chips = page.getByTestId("suggestion-chips");
  await expect(chips).toBeVisible({ timeout: 8_000 });

  const chipText = "What does my policy cover?";
  const chip = chips.getByText(chipText);
  await expect(chip).toBeVisible();

  // Mock SSE streaming endpoint
  await page.route("**/api/v1/chat/stream**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: "data: test\n\ndata: [DONE]\n\n",
    })
  );

  // Click chip – it sends immediately (sendQuery is called directly)
  await chip.click();

  // After clicking a chip, user message should appear in chat
  await expect(page.getByText(chipText)).toBeVisible({ timeout: 8_000 });
});

// ─── Test 6: Dashboard stats cards ───────────────────────────────────────────
test("dashboard shows stats cards", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Documents Indexed")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Fraud Alerts", { exact: true })).toBeVisible();
});

// ─── Test 7: Claims validation form ──────────────────────────────────────────
test("claims page shows validation form", async ({ page }) => {
  await page.goto("/claims");
  await expect(page.getByText(/claims validation/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("select")).toBeVisible();
});

// ─── Test 8: Fraud alerts table ───────────────────────────────────────────────
test("fraud page shows alerts table", async ({ page }) => {
  await page.goto("/fraud");
  await expect(page.getByText(/fraud detection/i)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("FRD-001")).toBeVisible();
});

// ─── Test 9: Compliance checker ───────────────────────────────────────────────
test("compliance page shows compliance checker", async ({ page }) => {
  await page.goto("/compliance");
  await expect(page.getByText(/compliance/i).first()).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("CPL-001")).toBeVisible();
});

// ─── Test 10: Landing page – chip click populates input ───────────────────────
test("landing page – clicking a chip populates the query input", async ({ page }) => {
  // Ensure unauthenticated so landing page is shown
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  await page.goto("/");

  // Landing page heading should be visible
  await expect(page.getByText("Ask Anything About Your Policies")).toBeVisible({ timeout: 10_000 });

  const input = page.getByTestId("policy-query-input");
  await expect(input).toBeVisible();

  // Initially the input should be empty (value="")
  await expect(input).toHaveValue("");

  // Click the first chip
  const firstChip = page.getByTestId("question-chip-0");
  await expect(firstChip).toBeVisible();

  const chipText = await firstChip.textContent();
  // Strip the magnifying glass icon text if any (trim whitespace)
  const expectedText = (chipText ?? "").trim().replace(/^./, "").trim();

  await firstChip.click();

  // Input should now be populated with the chip's question
  await expect(input).not.toHaveValue("");
  const inputValue = await input.inputValue();
  expect(inputValue.length).toBeGreaterThan(10);

  // Clicking a different chip replaces the value
  const secondChip = page.getByTestId("question-chip-1");
  await secondChip.click();
  const newValue = await input.inputValue();
  expect(newValue).not.toBe(inputValue);
});

// ─── Test 11: Landing page – input focus and keyboard accessibility ────────────
test("landing page – query input is keyboard accessible", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  await page.goto("/");
  await expect(page.getByText("Ask Anything About Your Policies")).toBeVisible({ timeout: 10_000 });

  const input = page.getByTestId("policy-query-input");

  // Tab to the input and type a query
  await input.focus();
  await page.keyboard.type("What is my deductible?");
  await expect(input).toHaveValue("What is my deductible?");

  // Clear the input
  await input.fill("");
  await expect(input).toHaveValue("");

  // Chip should be focusable via Tab
  const chip = page.getByTestId("question-chip-0");
  await expect(chip).toBeVisible();
  // Chips are <button> elements – they must be in the tab order
  const tagName = await chip.evaluate((el) => el.tagName.toLowerCase());
  expect(tagName).toBe("button");
});

// ─── Test 12: Enterprise-Grade Security cards ─────────────────────────────────
test("landing page – Enterprise-Grade Security section renders 6 security cards", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  await page.goto("/");
  await expect(page.getByText("Enterprise-Grade Security")).toBeVisible({ timeout: 10_000 });

  const cards = page.getByTestId("security-card");
  await expect(cards).toHaveCount(6);

  // Verify the two new cards are present
  await expect(page.getByText("On-Premise Deployment")).toBeVisible();
  await expect(page.getByText("Data Isolation")).toBeVisible();
});

// ─── Test 13: Testimonials section ───────────────────────────────────────────
test("landing page – Why Insurance Teams Choose InsurAI renders 3 testimonial cards", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  await page.goto("/");
  await expect(page.getByText("Why Insurance Teams Choose InsurAI")).toBeVisible({ timeout: 10_000 });

  const cards = page.getByTestId("testimonial-card");
  await expect(cards).toHaveCount(3);

  // Verify each professional is present
  await expect(page.getByText("Sarah Reynolds")).toBeVisible();
  await expect(page.getByText("David Kim")).toBeVisible();
  await expect(page.getByText("Maria Lopez")).toBeVisible();
});

// ─── Test 14: Final CTA section ───────────────────────────────────────────────
test("landing page – final CTA has Start Free Trial button and benefits list", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  await page.goto("/");
  await expect(page.getByText("Ready to transform your")).toBeVisible({ timeout: 10_000 });

  // CTA button exists
  const ctaBtn = page.getByTestId("cta-start-trial");
  await expect(ctaBtn).toBeVisible();

  // Benefits list renders with all 3 items
  const benefits = page.getByTestId("cta-benefits");
  await expect(benefits).toBeVisible();
  await expect(page.getByText("Process policies 10x faster")).toBeVisible();
  await expect(page.getByText("Reduce fraud detection time")).toBeVisible();
  await expect(page.getByText("Ensure regulatory compliance")).toBeVisible();

  // Trust message
  await expect(page.getByText("No credit card required")).toBeVisible();
});
test("AI You Can Trust section renders 4 trust cards", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_workspace");
  });
  await page.goto("/");

  await expect(page.getByText("AI You Can Trust")).toBeVisible({ timeout: 10_000 });
  // Use role heading to avoid strict-mode collision with body text that contains the same words
  await expect(page.getByRole("heading", { name: "Citation-Backed" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Source Transparency" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reasoning Explained" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Audit Trail" })).toBeVisible();
  await expect(page.getByText("Every AI query and decision is logged for compliance.")).toBeVisible();
});

// ─── Test: Footer ─────────────────────────────────────────────────────────────
test("landing page – footer renders with all 5 sections and key links", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  await page.goto("/");

  const footer = page.getByTestId("site-footer");
  await expect(footer).toBeVisible({ timeout: 10_000 });

  // All 5 nav sections
  await expect(page.getByTestId("footer-product")).toBeVisible();
  await expect(page.getByTestId("footer-security")).toBeVisible();
  await expect(page.getByTestId("footer-documentation")).toBeVisible();
  await expect(page.getByTestId("footer-company")).toBeVisible();
  await expect(page.getByTestId("footer-legal")).toBeVisible();

  // Required links
  await expect(footer.getByRole("link", { name: "About" })).toBeVisible();
  await expect(footer.getByRole("link", { name: "Privacy Policy" }).first()).toBeVisible();
  await expect(footer.getByRole("link", { name: "Terms" }).first()).toBeVisible();
  await expect(footer.getByRole("link", { name: "Contact" }).first()).toBeVisible();
});

// ─── Performance tests ────────────────────────────────────────────────────────

test("landing page – hero renders before 3 s (LCP proxy)", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  const start = Date.now();
  await page.goto("/");
  // h1 is the Largest Contentful Paint candidate
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 3_000 });
  const elapsed = Date.now() - start;
  expect(elapsed).toBeLessThan(3_000);
});

test("landing page – no significant layout shift on load (CLS proxy)", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 5_000 });

  // Collect CLS via PerformanceObserver
  const cls = await page.evaluate(() =>
    new Promise<number>((resolve) => {
      let score = 0;
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const e = entry as PerformanceEntry & { hadRecentInput?: boolean; value?: number };
          if (!e.hadRecentInput) score += e.value ?? 0;
        }
      });
      try {
        obs.observe({ type: "layout-shift", buffered: true });
      } catch {
        // Not supported in all browsers
      }
      // Settle after 1 s of observations
      setTimeout(() => { obs.disconnect(); resolve(score); }, 1_000);
    })
  );

  // Good CLS is < 0.1 (Google threshold)
  expect(cls).toBeLessThan(0.1);
});

test("landing page – interactive query section loads after initial paint", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  await page.goto("/");

  // Hero h1 should appear well before the lazy-loaded interactive section
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 3_000 });

  // The lazy-loaded PolicyQuerySection eventually appears
  await expect(page.getByText("Ask Anything About Your Policies")).toBeVisible({ timeout: 8_000 });
});

// ─── Hover effect consistency tests ──────────────────────────────────────────

async function gotoLanding(page: Page) {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });
  await page.goto("/");
}

test("hover effects – Problem Statement stat cards get accent border on hover", async ({ page }) => {
  await gotoLanding(page);
  await expect(page.getByText("40+ hrs")).toBeVisible({ timeout: 10_000 });

  const card = page.locator(".card-hover").filter({ hasText: "40+ hrs" });
  await card.hover();
  const borderColor = await card.evaluate((el) =>
    getComputedStyle(el).borderColor
  );
  // accent is rgb(59, 130, 246)
  expect(borderColor).toContain("59");
});

test("hover effects – How InsurAI Works step cards get accent border on hover", async ({ page }) => {
  await gotoLanding(page);
  await expect(page.getByText("Upload Policies")).toBeVisible({ timeout: 10_000 });

  const card = page.locator(".card-hover").filter({ hasText: "Upload Policies" });
  await card.hover();
  const borderColor = await card.evaluate((el) =>
    getComputedStyle(el).borderColor
  );
  expect(borderColor).toContain("59");
});

test("hover effects – Testimonial cards get accent border on hover", async ({ page }) => {
  await gotoLanding(page);
  await expect(page.getByText("Sarah Reynolds")).toBeVisible({ timeout: 10_000 });

  const card = page.getByTestId("testimonial-card").first();
  await card.hover();
  const borderColor = await card.evaluate((el) =>
    getComputedStyle(el).borderColor
  );
  expect(borderColor).toContain("59");
});

test("hover effects – AI Transparency trust cards get accent border on hover", async ({ page }) => {
  await gotoLanding(page);
  await expect(page.getByRole("heading", { name: "Citation-Backed" })).toBeVisible({ timeout: 10_000 });

  const card = page.locator(".card-hover").filter({ hasText: "Citation-Backed" });
  await card.hover();
  const borderColor = await card.evaluate((el) =>
    getComputedStyle(el).borderColor
  );
  expect(borderColor).toContain("59");
});

test("hover effects – Security cards get accent border on hover", async ({ page }) => {
  await gotoLanding(page);
  await expect(page.getByText("Enterprise-Grade Security")).toBeVisible({ timeout: 10_000 });

  const card = page.getByTestId("security-card").first();
  await card.hover();
  const borderColor = await card.evaluate((el) =>
    getComputedStyle(el).borderColor
  );
  expect(borderColor).toContain("59");
});

test("hover effects – all hoverable card sections use card-hover class", async ({ page }) => {
  await gotoLanding(page);
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });

  // Scroll to bottom to ensure all sections are rendered
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);

  const hoverCards = page.locator(".card-hover");
  const count = await hoverCards.count();
  // 4 stat + 4 how-it-works + 3 testimonials + 6 role-based + 4 trust + 6 security = 27
  expect(count).toBeGreaterThanOrEqual(27);
});

// ─── Performance: below-fold sections ────────────────────────────────────────
test("performance – all below-fold sections are present in the DOM", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 5_000 });

  // All 6 sections should use content-visibility:auto
  const belowFold = page.locator(".below-fold");
  await expect(belowFold).toHaveCount(6);
});

test("performance – viewport meta is set correctly", async ({ page }) => {
  await page.goto("/");
  const viewport = await page.locator('meta[name="viewport"]').getAttribute("content");
  expect(viewport).toContain("width=device-width");
  expect(viewport).toContain("initial-scale=1");
});

test("performance – theme-color meta is set", async ({ page }) => {
  await page.goto("/");
  const themeColor = await page.locator('meta[name="theme-color"]').getAttribute("content");
  expect(themeColor).toBeTruthy();
});

test("performance – Google Fonts preconnect links are present", async ({ page }) => {
  await page.goto("/");
  const preconnects = await page.locator('link[rel="preconnect"]').all();
  const hrefs = await Promise.all(preconnects.map((l) => l.getAttribute("href")));
  expect(hrefs.some((h) => h?.includes("fonts.googleapis.com"))).toBe(true);
  expect(hrefs.some((h) => h?.includes("fonts.gstatic.com"))).toBe(true);
});

test("performance – PolicyQuerySection lazy-loads after hero (no SSR blocking)", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  // Intercept all JS chunks and record load order
  const loadedChunks: string[] = [];
  page.on("response", (res) => {
    if (res.url().includes("/_next/") && res.url().endsWith(".js")) {
      loadedChunks.push(res.url());
    }
  });

  await page.goto("/");
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 3_000 });

  // Hero must be visible before the lazy section appears
  const heroVisible = await page.locator("h1").first().isVisible();
  expect(heroVisible).toBe(true);

  await expect(page.getByText("Ask Anything About Your Policies")).toBeVisible({ timeout: 8_000 });
});

test("performance – no X-Powered-By header exposed", async ({ page }) => {
  const response = await page.goto("/");
  const poweredBy = response?.headers()["x-powered-by"];
  expect(poweredBy).toBeUndefined();
});

// ─── Route tests ──────────────────────────────────────────────────────────────

test("route – landing page loads at '/'", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
  });

  await page.goto("/");
  await expect(page).toHaveURL("/");
  // Landing page has the hero heading
  await expect(page.locator("h1").first()).toBeVisible({ timeout: 10_000 });
});

test("route – login page loads at '/login'", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL("/login");
  await expect(page.getByText("Sign in to your account")).toBeVisible({ timeout: 10_000 });
});

test("route – onboarding page loads at '/onboarding'", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
  });

  await page.goto("/onboarding");
  await expect(page).toHaveURL("/onboarding");
  await expect(page.getByText("Welcome to InsurAI")).toBeVisible({ timeout: 10_000 });
});

// ─── Login validation tests ───────────────────────────────────────────────────

test("login – valid demo credentials log in successfully", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
    localStorage.removeItem("insurai_onboarded");
  });

  await page.goto("/login");
  await page.fill('input[type="email"]', "demo@insurai.ai");
  await page.fill('input[type="password"]', "demo123");
  await page.click('button[type="submit"]');

  // Should redirect away from /login after successful sign-in
  await expect(page).not.toHaveURL("/login", { timeout: 10_000 });
});

test("login – invalid credentials show an error message", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "wrong@example.com");
  await page.fill('input[type="password"]', "badpassword");
  await page.click('button[type="submit"]');

  await expect(page.getByText("Invalid email or password. Please try again.")).toBeVisible({ timeout: 10_000 });
  await expect(page).toHaveURL("/login");
});

// ─── Login UX tests ───────────────────────────────────────────────────────────

test("login UX – SSO buttons render", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("sso-google")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("sso-microsoft")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("sso-google")).toContainText("Continue with Google");
  await expect(page.getByTestId("sso-microsoft")).toContainText("Continue with Microsoft");
});

test("login UX – forgot password link exists below password field", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("forgot-password")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("forgot-password")).toContainText("Forgot password?");
});

// ─── Navbar visibility tests ──────────────────────────────────────────────────

test("navbar unauthenticated – shows only logo, Sign In, and Start Free Trial", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.removeItem("insurai_auth");
    localStorage.removeItem("insurai_user");
    localStorage.removeItem("insurai_onboarded");
  });

  await page.goto("/");

  // Should show Sign In and Start Free Trial
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link", { name: /start free trial/i })).toBeVisible();

  // Should NOT show app nav links
  await expect(page.getByRole("link", { name: /^dashboard$/i })).not.toBeVisible();
  await expect(page.getByRole("link", { name: /^policies$/i })).not.toBeVisible();
  await expect(page.getByRole("link", { name: /^ai assistant$/i })).not.toBeVisible();
});

test("navbar authenticated – shows product navigation links", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.setItem("insurai_workspace", "default");
  });

  await page.goto("/dashboard");

  // Should show all product nav links
  await expect(page.getByRole("link", { name: /^dashboard$/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link", { name: /^policies$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^ai assistant$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^claims$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^fraud$/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /^compliance$/i })).toBeVisible();

  // Should NOT show Sign In or Start Free Trial
  await expect(page.getByRole("link", { name: /sign in/i })).not.toBeVisible();
  await expect(page.getByRole("link", { name: /start free trial/i })).not.toBeVisible();
});

test("navbar – authenticated user pressing back to / redirects to /dashboard", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.setItem("insurai_workspace", "default");
  });

  // Navigate to dashboard then go back to /
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  await page.goto("/");

  // Should redirect to dashboard, NOT show landing page
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  await expect(page.getByRole("link", { name: /start free trial/i })).not.toBeVisible();
});

// ─── Onboarding layout tests ──────────────────────────────────────────────────

test("onboarding layout – minimal header renders without main app navbar", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_user_role");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });

  // Minimal onboarding header is present
  await expect(page.getByTestId("onboarding-header")).toBeVisible();

  // App nav links must NOT be visible
  await expect(page.getByRole("link", { name: "Dashboard" })).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Policies" })).not.toBeVisible();
  await expect(page.getByRole("link", { name: "AI Assistant" })).not.toBeVisible();
  await expect(page.getByRole("link", { name: "Claims" })).not.toBeVisible();
});

test("onboarding layout – InsurAI logo visible in minimal header", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_user_role");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("onboarding-header")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("onboarding-header").getByText("InsurAI")).toBeVisible();
});

test("onboarding layout – workspace setup page also uses minimal header", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "underwriter",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.setItem("insurai_user_role", "underwriter");
  });

  await page.goto("/onboarding/workspace");
  await expect(page.getByTestId("onboarding-header")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("link", { name: "Dashboard" })).not.toBeVisible();
});

// ─── OnboardingProgress step-highlight tests ─────────────────────────────────

test("onboarding progress – step 1 (Role) is active on role selection screen", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_user_role");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("onboarding-progress-bar")).toBeVisible();

  await expect(page.getByTestId("progress-step-1")).toHaveAttribute("data-status", "active");
  await expect(page.getByTestId("progress-step-2")).toHaveAttribute("data-status", "pending");
  await expect(page.getByTestId("progress-step-3")).toHaveAttribute("data-status", "pending");
});

test("onboarding progress – step 2 (Workspace) is active on workspace setup page", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "underwriter",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.setItem("insurai_user_role", "underwriter");
  });

  await page.goto("/onboarding/workspace");
  await expect(page.getByTestId("onboarding-progress-bar")).toBeVisible({ timeout: 10_000 });

  await expect(page.getByTestId("progress-step-1")).toHaveAttribute("data-status", "done");
  await expect(page.getByTestId("progress-step-2")).toHaveAttribute("data-status", "active");
  await expect(page.getByTestId("progress-step-3")).toHaveAttribute("data-status", "pending");
});

test("onboarding progress – step 3 (Upload Policy) is active on feature onboarding steps", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "underwriter",
      workspace: "acme", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.setItem("insurai_user_role", "underwriter");
    localStorage.setItem("insurai_onboarding_step", "1");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("onboarding-progress-bar")).toBeVisible({ timeout: 10_000 });

  await expect(page.getByTestId("progress-step-1")).toHaveAttribute("data-status", "done");
  await expect(page.getByTestId("progress-step-2")).toHaveAttribute("data-status", "done");
  await expect(page.getByTestId("progress-step-3")).toHaveAttribute("data-status", "active");
});

test("onboarding progress – all three step labels are visible", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_user_role");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("onboarding-progress-bar")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("onboarding-progress-bar").getByText("Role")).toBeVisible();
  await expect(page.getByTestId("onboarding-progress-bar").getByText("Workspace")).toBeVisible();
  await expect(page.getByTestId("onboarding-progress-bar").getByText("Upload Policy")).toBeVisible();
});

// ─── Role Selection Tests ─────────────────────────────────────────────────────

test("role selection – shows role selection screen before onboarding steps", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_workspace");
    localStorage.removeItem("insurai_user_role");
  });

  await page.goto("/onboarding");

  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("What's your role?")).toBeVisible();

  // All 4 role options are present
  await expect(page.getByTestId("role-option-underwriter")).toBeVisible();
  await expect(page.getByTestId("role-option-claims_adjuster")).toBeVisible();
  await expect(page.getByTestId("role-option-compliance_officer")).toBeVisible();
  await expect(page.getByTestId("role-option-fraud_analyst")).toBeVisible();
});

test("role selection – selecting a role highlights the card and enables Continue", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_workspace");
    localStorage.removeItem("insurai_user_role");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });

  // Continue must be disabled before selection
  await expect(page.getByTestId("role-continue")).toBeDisabled();

  // Select "Underwriter"
  await page.getByTestId("role-option-underwriter").click();

  // Check icon appears on selected card
  await expect(page.getByTestId("role-check-underwriter")).toBeVisible();

  // Continue must now be enabled
  await expect(page.getByTestId("role-continue")).not.toBeDisabled();

  // Role must be persisted in localStorage
  const savedRole = await page.evaluate(() => localStorage.getItem("insurai_user_role"));
  expect(savedRole).toBe("underwriter");

  // Clicking Continue routes to workspace setup
  await page.getByTestId("role-continue").click();
  await expect(page).toHaveURL(/\/onboarding\/workspace/, { timeout: 10_000 });
});

test("role selection – each role option saves the correct value", async ({ page }) => {
  const roles = [
    { testId: "role-option-underwriter",        value: "underwriter" },
    { testId: "role-option-claims_adjuster",         value: "claims_adjuster" },
    { testId: "role-option-compliance_officer",  value: "compliance_officer" },
    { testId: "role-option-fraud_analyst",       value: "fraud_analyst" },
  ];

  for (const { testId, value } of roles) {
    await page.context().addInitScript(() => {
      localStorage.setItem("insurai_auth", "true");
      localStorage.setItem("insurai_user", JSON.stringify({
        name: "Test User", email: "test@test.com", role: "admin",
        workspace: "default", initials: "TU",
      }));
      localStorage.removeItem("insurai_onboarded");
      localStorage.removeItem("insurai_user_role");
    });

    await page.goto("/onboarding");
    await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });
    await page.getByTestId(testId).click();

    const savedRole = await page.evaluate(() => localStorage.getItem("insurai_user_role"));
    expect(savedRole).toBe(value);

    // Reset context for next iteration
    await page.evaluate(() => {
      localStorage.removeItem("insurai_user_role");
      localStorage.removeItem("insurai_onboarding_step");
    });
  }
});

test("role selection – if role already saved, onboarding starts at step 1 directly", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.setItem("insurai_user_role", "fraud_analyst");
  });

  await page.goto("/onboarding");

  // Should skip role selection and go straight to step 1
  await expect(page.getByTestId("progress-indicator")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await expect(page.getByTestId("role-selection")).not.toBeVisible();
});

test("role selection – dashboard shows role-based tips after role is set", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.setItem("insurai_workspace", "default");
    localStorage.setItem("insurai_user_role", "underwriter");
    localStorage.setItem("insurai_has_documents", "true");
  });

  await page.goto("/dashboard");

  await expect(page.getByTestId("role-tips")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Tips for Underwriters")).toBeVisible();
});

test("role badge – hidden on /onboarding before a role is selected", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_user_role");
    localStorage.removeItem("insurai_onboarded");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("role-badge")).not.toBeVisible();
});

test("role badge – selecting a role updates user state and persists role", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_user_role");
    localStorage.removeItem("insurai_onboarded");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });

  await page.getByTestId("role-option-claims_adjuster").click();

  // Role is persisted in insurai_user_role
  const savedRole = await page.evaluate(() => localStorage.getItem("insurai_user_role"));
  expect(savedRole).toBe("claims_adjuster");

  // User object's role is updated so the Navbar can reflect it
  const userJson = await page.evaluate(() => localStorage.getItem("insurai_user"));
  const user = JSON.parse(userJson!);
  expect(user.role).toBe("claims_adjuster");
});

// ─── Role card UI improvement tests ──────────────────────────────────────────

test("role cards – Continue button is disabled before any role is selected", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_user_role");
    localStorage.removeItem("insurai_onboarded");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("role-continue")).toBeDisabled();
});

test("role cards – selecting a role shows check icon on that card", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_user_role");
    localStorage.removeItem("insurai_onboarded");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });

  // No check icons before selection
  await expect(page.getByTestId("role-check-fraud_analyst")).not.toBeVisible();

  await page.getByTestId("role-option-fraud_analyst").click();

  // Check icon visible on selected card only
  await expect(page.getByTestId("role-check-fraud_analyst")).toBeVisible();
  await expect(page.getByTestId("role-check-underwriter")).not.toBeVisible();
});

test("role cards – selecting a different role moves the check icon", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_user_role");
    localStorage.removeItem("insurai_onboarded");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });

  await page.getByTestId("role-option-underwriter").click();
  await expect(page.getByTestId("role-check-underwriter")).toBeVisible();

  // Switch selection
  await page.getByTestId("role-option-compliance_officer").click();
  await expect(page.getByTestId("role-check-compliance_officer")).toBeVisible();
  await expect(page.getByTestId("role-check-underwriter")).not.toBeVisible();
});

test("role cards – Continue button activates after role selection", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_user_role");
    localStorage.removeItem("insurai_onboarded");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });

  await expect(page.getByTestId("role-continue")).toBeDisabled();
  await page.getByTestId("role-option-claims_adjuster").click();
  await expect(page.getByTestId("role-continue")).not.toBeDisabled();
});

// ─── Onboarding completion & skip tests ──────────────────────────────────────

test("onboarding completion – step 1 action saves completion and redirects to /dashboard", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.setItem("insurai_user_role", "underwriter");
  });

  await page.goto("/onboarding");

  // Should start at step 1 (role already set)
  await expect(page.getByText("Step 1 of 4")).toBeVisible({ timeout: 10_000 });

  // Click the step 1 primary action button
  await page.getByTestId("step-action-upload").click();

  // Must redirect to /dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });

  // insurai_onboarded must be saved
  const onboarded = await page.evaluate(() => localStorage.getItem("insurai_onboarded"));
  expect(onboarded).toBe("true");
});

test("onboarding completion – workspace is saved on completion", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.setItem("insurai_user_role", "fraud_analyst");
  });

  await page.goto("/onboarding");
  await expect(page.getByText("Step 1 of 4")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("launch-btn") // not visible yet – skip to step 4 first
    .or(page.getByTestId("next-step")).first().click();
  // Navigate through all steps to launch
  await page.getByTestId("next-step").click();
  await page.getByTestId("next-step").click();
  await page.getByTestId("launch-btn").click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  const workspace = await page.evaluate(() => localStorage.getItem("insurai_workspace"));
  expect(workspace).toBe("default");
});

test("onboarding skip – /onboarding redirects to /dashboard for returning users", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.setItem("insurai_workspace", "default");
  });

  await page.goto("/onboarding");

  // Should be redirected to /dashboard without showing onboarding UI
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  await expect(page.getByTestId("role-selection")).not.toBeVisible();
  await expect(page.getByTestId("progress-indicator")).not.toBeVisible();
});

test("onboarding skip – / redirects to /dashboard for returning users", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.setItem("insurai_workspace", "default");
  });

  await page.goto("/");

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
});

test("onboarding skip – onboarding_step key is removed on completion", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.setItem("insurai_user_role", "claims_adjuster");
    localStorage.setItem("insurai_onboarding_step", "2");
  });

  await page.goto("/onboarding");
  await expect(page.getByText("Step 2 of 4")).toBeVisible({ timeout: 10_000 });

  // Complete via step action button
  await page.getByTestId("step-action-index").click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  const stepKey = await page.evaluate(() => localStorage.getItem("insurai_onboarding_step"));
  expect(stepKey).toBeNull();
});

// ─── Protected route redirect tests ──────────────────────────────────────────

const PROTECTED_ROUTES = ["/dashboard", "/claims", "/documents", "/chat", "/fraud", "/compliance"];

for (const route of PROTECTED_ROUTES) {
  test(`protected route – unauthenticated user visiting ${route} is redirected to /login`, async ({ page }) => {
    await page.context().addInitScript(() => {
      localStorage.removeItem("insurai_auth");
      localStorage.removeItem("insurai_user");
    });

    await page.goto(route);

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
}

test("protected route – authenticated user can access /dashboard", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.setItem("insurai_workspace", "default");
    localStorage.setItem("insurai_has_documents", "true");
  });

  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/login/);
});

test("protected route – authenticated user can access /claims", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.setItem("insurai_workspace", "default");
  });

  await page.goto("/claims");

  await expect(page).toHaveURL(/\/claims/, { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByText("Claims Validation")).toBeVisible({ timeout: 10_000 });
});

test("protected route – authenticated user can access /documents", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.setItem("insurai_onboarded", "true");
    localStorage.setItem("insurai_workspace", "default");
  });

  await page.goto("/documents");

  await expect(page).toHaveURL(/\/documents/, { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/login/);
  await expect(page.getByText("Documents")).toBeVisible({ timeout: 10_000 });
});

// ─── Onboarding route protection tests ───────────────────────────────────────

const ONBOARDING_PROTECTED = ["/dashboard", "/claims", "/documents", "/chat", "/fraud", "/compliance", "/settings"];

for (const route of ONBOARDING_PROTECTED) {
  test(`onboarding guard – authenticated but not-onboarded user visiting ${route} is redirected to /onboarding`, async ({ page }) => {
    await page.context().addInitScript(() => {
      localStorage.setItem("insurai_auth", "true");
      localStorage.setItem("insurai_user", JSON.stringify({
        name: "Test User", email: "test@test.com", role: "",
        workspace: "default", initials: "TU",
      }));
      localStorage.removeItem("insurai_onboarded");
      localStorage.removeItem("insurai_workspace");
    });

    await page.goto(route);

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/\/login/);
  });
}

// ─── Signup form tests ────────────────────────────────────────────────────────
test("signup form – work email field exists", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByLabel("Work Email")).toBeVisible({ timeout: 10_000 });
});

test("signup form – password fields exist", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByLabel("Password")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByLabel("Confirm Password")).toBeVisible({ timeout: 10_000 });
});

test("signup form – removed fields (Full Name, Your Role, Organization) do not render", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByLabel("Full Name")).not.toBeVisible();
  await expect(page.getByLabel("Your Role")).not.toBeVisible();
  await expect(page.getByLabel("Organization / Workspace")).not.toBeVisible();
});

// ─── Role selection onboarding tests ─────────────────────────────────────────
test("onboarding role cards – all four required role cards render", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "underwriter",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_user_role");
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_onboarding_step");
  });

  await page.goto("/onboarding");

  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("role-option-underwriter")).toBeVisible();
  await expect(page.getByTestId("role-option-claims_adjuster")).toBeVisible();
  await expect(page.getByTestId("role-option-fraud_analyst")).toBeVisible();
  await expect(page.getByTestId("role-option-compliance_officer")).toBeVisible();
});

test("onboarding role cards – display correct labels", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "underwriter",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_user_role");
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_onboarding_step");
  });

  await page.goto("/onboarding");

  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Underwriter")).toBeVisible();
  await expect(page.getByText("Claims Adjuster")).toBeVisible();
  await expect(page.getByText("Fraud Analyst")).toBeVisible();
  await expect(page.getByText("Compliance Officer")).toBeVisible();
});

test("onboarding role cards – signup page does not show role dropdown", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByLabel("Your Role")).not.toBeVisible();
});

// ─── Settings – organization field label tests ────────────────────────────────
test("settings – organization field shows updated label", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "underwriter",
      workspace: "default", initials: "TU",
    }));
    localStorage.setItem("insurai_onboarded", "true");
  });

  await page.goto("/settings");

  await expect(page.getByLabel("Company or Organization")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Your policies and team members will belong to this workspace.")).toBeVisible();
});

// ─── Password strength indicator tests ───────────────────────────────────────
test("signup – password strength indicator renders when typing", async ({ page }) => {
  await page.goto("/signup");

  const pw = page.getByLabel("Password");
  await pw.fill("abc");
  await expect(page.getByTestId("password-strength")).toBeVisible();
});

test("signup – password strength shows Weak for short password", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Password").fill("abc1");
  await expect(page.getByText("Weak")).toBeVisible();
});

test("signup – password strength shows Strong for complex password", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Password").fill("SecurePass1!");
  await expect(page.getByText("Strong")).toBeVisible();
});

test("signup – rejects password shorter than 8 characters", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Work Email").fill("test@example.com");
  await page.getByLabel("Password").fill("abc1");
  await page.getByLabel("Confirm Password").fill("abc1");
  await page.getByRole("button", { name: /create account/i }).click();
  await expect(page.getByText("Password must be at least 8 characters.")).toBeVisible();
});

// ─── Login – password usability tests ────────────────────────────────────────
test("login – show/hide password toggle renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("toggle-password")).toBeVisible({ timeout: 10_000 });
});

test("login – show/hide toggle reveals password text", async ({ page }) => {
  await page.goto("/login");
  const input = page.getByLabel("Password");
  await input.fill("demo1234");
  await expect(input).toHaveAttribute("type", "password");
  await page.getByTestId("toggle-password").click();
  await expect(input).toHaveAttribute("type", "text");
});

test("login – updated demo credentials (demo1234) log in successfully", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("demo@insurai.ai");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
});

test("login – old demo password (demo123) shows invalid credentials error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill("demo@insurai.ai");
  await page.getByLabel("Password").fill("demo123");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByText("Invalid email or password")).toBeVisible({ timeout: 10_000 });
});

// ─── Signup CTA – button text and spinner tests ───────────────────────────────
test("signup – button shows 'Create Account → Continue Setup' when idle", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("button", { name: "Create Account → Continue Setup" })).toBeVisible({ timeout: 10_000 });
});

test("signup – spinner appears immediately after valid form submission", async ({ page }) => {
  await page.goto("/signup");

  await page.getByPlaceholder("jane@company.com").fill("test@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("SecurePass1!");
  await page.getByPlaceholder("Re-enter password").fill("SecurePass1!");

  await page.getByRole("button", { name: "Create Account → Continue Setup" }).click();

  // Spinner should be visible during the 900 ms async delay
  await expect(page.getByTestId("submit-spinner")).toBeVisible({ timeout: 2_000 });
});

test("signup – button is disabled while spinner is showing", async ({ page }) => {
  await page.goto("/signup");

  await page.getByPlaceholder("jane@company.com").fill("test@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("SecurePass1!");
  await page.getByPlaceholder("Re-enter password").fill("SecurePass1!");

  await page.getByRole("button", { name: "Create Account → Continue Setup" }).click();

  // While spinner is visible the button must be disabled
  await expect(page.getByTestId("submit-spinner")).toBeVisible({ timeout: 2_000 });
  await expect(page.getByRole("button", { name: /creating account/i })).toBeDisabled();
});

// ─── Signup trust badges tests ────────────────────────────────────────────────
test("signup – trust badges render with correct text", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByTestId("trust-badge-SOC2 Type II")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("trust-badge-AES-256 Encryption")).toBeVisible();
  await expect(page.getByTestId("trust-badge-Role-Based Access Control")).toBeVisible();
});

test("signup – trust badges contain expected labels", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByTestId("trust-badge-SOC2 Type II")).toHaveText("🔒 SOC2 Type II");
  await expect(page.getByTestId("trust-badge-AES-256 Encryption")).toHaveText("🔐 AES-256 Encryption");
  await expect(page.getByTestId("trust-badge-Role-Based Access Control")).toHaveText("✅ Role-Based Access Control");
});

// ─── Signup SSO buttons tests ─────────────────────────────────────────────────
test("signup – SSO buttons render", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByTestId("sso-google")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("sso-microsoft")).toBeVisible();
});

test("signup – SSO buttons have correct labels", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByTestId("sso-google")).toHaveText(/Continue with Google/);
  await expect(page.getByTestId("sso-microsoft")).toHaveText(/Continue with Microsoft/);
});

test("signup – 'or sign up with email' divider renders", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByText("or sign up with email")).toBeVisible({ timeout: 10_000 });
});

// ─── Back navigation link tests ───────────────────────────────────────────────
test("signup – back link shows 'Back to landing page'", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByTestId("back-to-landing")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("back-to-landing")).toHaveText(/Back to landing page/);
});

test("signup – back link navigates to /", async ({ page }) => {
  await page.goto("/signup");
  await page.getByTestId("back-to-landing").click();
  await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 10_000 });
});

test("login – back link shows 'Back to landing page'", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByTestId("back-to-landing")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("back-to-landing")).toHaveText(/Back to landing page/);
});

test("login – back link navigates to /", async ({ page }) => {
  await page.goto("/login");
  await page.getByTestId("back-to-landing").click();
  await expect(page).toHaveURL(/\/$|\/\?/, { timeout: 10_000 });
});

// ─── Workspace setup onboarding tests ─────────────────────────────────────────
test("workspace setup – form renders with all fields and helper text", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@example.com", role: "underwriter",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.setItem("insurai_user_role", "underwriter");
  });

  await page.goto("/onboarding/workspace");

  await expect(page.getByTestId("workspace-form")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("input-company")).toBeVisible();
  await expect(page.getByTestId("input-workspace")).toBeVisible();
  await expect(page.getByText("Policies and team members will belong to this workspace.")).toBeVisible();
  await expect(page.getByTestId("workspace-submit")).toBeVisible();
});

test("workspace setup – saves workspace and redirects to /policies/upload", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@example.com", role: "underwriter",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.setItem("insurai_user_role", "underwriter");
  });

  await page.goto("/onboarding/workspace");

  await page.getByTestId("input-company").fill("Acme Insurance Co.");
  await page.getByTestId("input-workspace").fill("acme-insurance");
  await page.getByTestId("workspace-submit").click();

  // Spinner visible during the 600 ms save
  await expect(page.getByTestId("workspace-spinner")).toBeVisible({ timeout: 2_000 });

  // After save, redirected to /policies/upload
  await expect(page).toHaveURL(/\/policies\/upload/, { timeout: 10_000 });
});

test("workspace setup – role is persisted to user profile on completion", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@example.com", role: "",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.setItem("insurai_user_role", "fraud_analyst");
  });

  await page.goto("/onboarding/workspace");
  await page.getByTestId("input-company").fill("Acme Insurance Co.");
  await page.getByTestId("input-workspace").fill("acme-insurance");
  await page.getByTestId("workspace-submit").click();

  await expect(page).toHaveURL(/\/policies\/upload/, { timeout: 10_000 });

  // Role must be written into the user profile object
  const userJson = await page.evaluate(() => localStorage.getItem("insurai_user"));
  const user = JSON.parse(userJson!);
  expect(user.role).toBe("fraud_analyst");
  expect(user.workspace).toBe("acme-insurance");
});

test("workspace setup – validates empty company field", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@example.com", role: "underwriter",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
  });

  await page.goto("/onboarding/workspace");
  await page.getByTestId("workspace-submit").click();
  await expect(page.getByText("Company or organization name is required.")).toBeVisible();
});

test("workspace setup – role selection routes to /onboarding/workspace", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@example.com", role: "underwriter",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_user_role");
  });

  await page.goto("/onboarding");
  await expect(page.getByTestId("role-selection")).toBeVisible({ timeout: 10_000 });
  await page.getByTestId("role-option-underwriter").click();
  await page.getByTestId("role-continue").click();
  await expect(page).toHaveURL(/\/onboarding\/workspace/, { timeout: 10_000 });
});

// ─── Signup redirect tests ────────────────────────────────────────────────────
test("signup – successful submission redirects to /onboarding", async ({ page }) => {
  await page.goto("/signup");

  await page.getByPlaceholder("jane@company.com").fill("newuser@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("SecurePass1!");
  await page.getByPlaceholder("Re-enter password").fill("SecurePass1!");
  await page.getByRole("button", { name: "Create Account → Continue Setup" }).click();

  await expect(page).toHaveURL(/\/onboarding/, { timeout: 10_000 });
});

test("signup – successful submission does not redirect to /dashboard", async ({ page }) => {
  await page.goto("/signup");

  await page.getByPlaceholder("jane@company.com").fill("newuser2@example.com");
  await page.getByPlaceholder("Min. 8 characters").fill("SecurePass1!");
  await page.getByPlaceholder("Re-enter password").fill("SecurePass1!");
  await page.getByRole("button", { name: "Create Account → Continue Setup" }).click();

  // Wait for navigation then assert we are NOT on /dashboard
  await page.waitForURL(/\/onboarding/, { timeout: 10_000 });
  await expect(page).not.toHaveURL(/\/dashboard/);
});

// ─── Signup inline validation tests ──────────────────────────────────────────
test("signup validation – invalid email shows error below email field on blur", async ({ page }) => {
  await page.goto("/signup");
  await page.getByPlaceholder("jane@company.com").fill("not-an-email");
  await page.getByPlaceholder("jane@company.com").blur();
  await expect(page.getByTestId("error-email")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId("error-email")).toHaveText("Please enter a valid email address.");
});

test("signup validation – empty email shows required error on submit", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Create Account → Continue Setup" }).click();
  await expect(page.getByTestId("error-email")).toBeVisible();
  await expect(page.getByTestId("error-email")).toHaveText("Email address is required.");
});

test("signup validation – weak password shows error below password field on blur", async ({ page }) => {
  await page.goto("/signup");
  await page.getByPlaceholder("Min. 8 characters").fill("abc");
  await page.getByPlaceholder("Min. 8 characters").blur();
  await expect(page.getByTestId("error-password")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId("error-password")).toHaveText("Password must be at least 8 characters.");
});

test("signup validation – password missing number shows inline error", async ({ page }) => {
  await page.goto("/signup");
  await page.getByPlaceholder("Min. 8 characters").fill("abcdefgh");
  await page.getByPlaceholder("Min. 8 characters").blur();
  await expect(page.getByTestId("error-password")).toHaveText("Password must contain at least 1 number.");
});

test("signup validation – mismatched passwords shows error below confirm field on blur", async ({ page }) => {
  await page.goto("/signup");
  await page.getByPlaceholder("Min. 8 characters").fill("SecurePass1!");
  await page.getByPlaceholder("Re-enter password").fill("Different1!");
  await page.getByPlaceholder("Re-enter password").blur();
  await expect(page.getByTestId("error-confirm")).toBeVisible({ timeout: 5_000 });
  await expect(page.getByTestId("error-confirm")).toHaveText("Passwords do not match.");
});

test("signup validation – matching passwords clears confirm error", async ({ page }) => {
  await page.goto("/signup");
  await page.getByPlaceholder("Min. 8 characters").fill("SecurePass1!");
  await page.getByPlaceholder("Re-enter password").fill("Different1!");
  await page.getByPlaceholder("Re-enter password").blur();
  await expect(page.getByTestId("error-confirm")).toBeVisible();

  // Fix the confirm password — error should clear
  await page.getByPlaceholder("Re-enter password").fill("SecurePass1!");
  await expect(page.getByTestId("error-confirm")).not.toBeVisible();
});

test("signup validation – all errors appear on submit with empty form", async ({ page }) => {
  await page.goto("/signup");
  await page.getByRole("button", { name: "Create Account → Continue Setup" }).click();
  await expect(page.getByTestId("error-email")).toBeVisible();
  await expect(page.getByTestId("error-password")).toBeVisible();
  await expect(page.getByTestId("error-confirm")).toBeVisible();
});

// ─── Signup accessibility tests ───────────────────────────────────────────────
test("signup a11y – inputs have associated labels via htmlFor/id", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.locator('label[for="signup-email"]')).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('label[for="signup-password"]')).toBeVisible();
  await expect(page.locator('label[for="signup-confirm"]')).toBeVisible();
  await expect(page.locator('#signup-email')).toBeVisible();
  await expect(page.locator('#signup-password')).toBeVisible();
  await expect(page.locator('#signup-confirm')).toBeVisible();
});

test("signup a11y – inputs have aria-required", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.locator('#signup-email')).toHaveAttribute("aria-required", "true");
  await expect(page.locator('#signup-password')).toHaveAttribute("aria-required", "true");
  await expect(page.locator('#signup-confirm')).toHaveAttribute("aria-required", "true");
});

test("signup a11y – invalid input gets aria-invalid on blur", async ({ page }) => {
  await page.goto("/signup");

  await page.locator('#signup-email').fill("bad-email");
  await page.locator('#signup-email').blur();
  await expect(page.locator('#signup-email')).toHaveAttribute("aria-invalid", "true");

  await page.locator('#signup-password').fill("weak");
  await page.locator('#signup-password').blur();
  await expect(page.locator('#signup-password')).toHaveAttribute("aria-invalid", "true");
});

test("signup a11y – error messages have role=alert", async ({ page }) => {
  await page.goto("/signup");
  await page.locator('#signup-email').fill("bad");
  await page.locator('#signup-email').blur();
  await expect(page.getByTestId("error-email")).toHaveAttribute("role", "alert");
});

test("signup a11y – error element is referenced by aria-describedby", async ({ page }) => {
  await page.goto("/signup");
  await page.locator('#signup-email').fill("bad");
  await page.locator('#signup-email').blur();
  await expect(page.locator('#signup-email')).toHaveAttribute("aria-describedby", "error-email-msg");
});

test("signup a11y – tab order moves through email → password → confirm → submit", async ({ page }) => {
  await page.goto("/signup");

  // Email should be auto-focused
  await expect(page.locator('#signup-email')).toBeFocused({ timeout: 5_000 });

  await page.keyboard.press("Tab");
  await expect(page.locator('#signup-password')).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.locator('#signup-confirm')).toBeFocused();

  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: /Create Account/i })).toBeFocused();
});

test("signup a11y – submit button has aria-busy when loading", async ({ page }) => {
  await page.goto("/signup");
  await page.locator('#signup-email').fill("test@example.com");
  await page.locator('#signup-password').fill("SecurePass1!");
  await page.locator('#signup-confirm').fill("SecurePass1!");
  await page.getByRole("button", { name: /Create Account/i }).click();

  await expect(page.getByTestId("submit-spinner")).toBeVisible({ timeout: 2_000 });
  await expect(page.getByRole("button", { name: /Creating account/i })).toHaveAttribute("aria-busy", "true");
});
