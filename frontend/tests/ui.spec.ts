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
