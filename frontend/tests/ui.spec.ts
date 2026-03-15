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
test("onboarding flow – step through all 3 steps and land on /chat", async ({ page }) => {
  await clearOnboarding(page);

  await page.goto("/");

  // Step 1 – Welcome
  await expect(page.getByText("Welcome to InsurAI")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("94.2%")).toBeVisible();
  await expect(page.getByText("<1%")).toBeVisible();
  await expect(page.getByText("274×")).toBeVisible();

  await page.getByTestId("get-started").click();

  // Step 2 – How It Works
  await expect(page.getByText("How It Works")).toBeVisible();
  await expect(page.getByText("Upload Policies")).toBeVisible();
  await expect(page.getByText("Ask Questions")).toBeVisible();
  await expect(page.getByText("Verify Sources")).toBeVisible();

  await page.getByTestId("next-step").click();

  // Step 3 – Ready to Go
  await expect(page.getByText("You're all set!")).toBeVisible();
  const wsInput = page.getByTestId("workspace-input");
  await wsInput.fill("my-workspace");

  // Mock API calls before launch
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        answer: "test",
        sources: [],
        model: "gpt-4",
        token_usage: { total_tokens: 10 },
        retrieved_chunks: 1,
      }),
    })
  );

  await page.getByTestId("launch-btn").click();

  // Should land on /chat
  await expect(page).toHaveURL(/\/chat/, { timeout: 10_000 });
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
test("onboarding skip – already onboarded redirects to /chat", async ({ page }) => {
  await setOnboarded(page);

  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ answer: "test", sources: [], model: "gpt-4", token_usage: { total_tokens: 10 }, retrieved_chunks: 1 }),
    })
  );

  await page.goto("/");

  // Should redirect to /chat without showing onboarding
  await expect(page).toHaveURL(/\/chat/, { timeout: 10_000 });
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
