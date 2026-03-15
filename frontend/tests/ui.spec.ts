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
test("onboarding flow – step through all 3 steps and land on /dashboard", async ({ page }) => {
  await page.context().addInitScript(() => {
    localStorage.setItem("insurai_auth", "true");
    localStorage.setItem("insurai_user", JSON.stringify({
      name: "Test User", email: "test@test.com", role: "admin",
      workspace: "default", initials: "TU",
    }));
    localStorage.removeItem("insurai_onboarded");
    localStorage.removeItem("insurai_workspace");
  });

  await page.goto("/");

  // Step 1 – Welcome (workflow cards, NOT fake metrics)
  await expect(page.getByText("Welcome to InsurAI")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("Step 1")).toBeVisible();
  await expect(page.getByText("Upload Policies")).toBeVisible();

  await page.getByTestId("get-started").click();

  // Step 2 – How It Works
  await expect(page.getByText("How It Works")).toBeVisible();
  await page.getByTestId("next-step").click();

  // Step 3 – Ready to Go
  await expect(page.getByText("You're all set!")).toBeVisible();
  await page.getByTestId("workspace-input").fill("my-workspace");
  await page.getByTestId("launch-btn").click();

  // Should land on /dashboard
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
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

  await page.goto("/");

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
