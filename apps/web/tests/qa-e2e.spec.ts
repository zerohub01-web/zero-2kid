import { expect, test } from "@playwright/test";

const BASE = process.env.WEB_URL || "http://127.0.0.1:3000";

const bookingPayload = {
  name: "QA Web User",
  email: "qa.web@zeroops.in",
  phone: "9876543210",
  businessType: "Tech / SaaS Startup",
  service: "Website Development",
  teamSize: "2-10",
  message: "Automated booking proxy QA test",
  budget: "30000-60000"
};

test("E2E-01 homepage loads", async ({ page }) => {
  await page.goto(BASE);
  await expect(page).toHaveURL(BASE);
});

test("E2E-02 hero heading visible", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.locator("h1").first()).toBeVisible();
});

test("E2E-03 navbar has pricing link", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.getByRole("link", { name: /pricing/i }).first()).toBeVisible();
});

test("E2E-04 resend text visible", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.getByText(/Resend/i).first()).toBeVisible();
});

test("E2E-05 homepage stats visible", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.getByText(/99\.9%|3x|24\/7|360/i).first()).toBeVisible();
});

test("E2E-06 footer contact visible", async ({ page }) => {
  await page.goto(BASE);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(page.getByText(/zerohub01@gmail\.com/i)).toBeVisible();
});

test("E2E-07 /book page loads", async ({ page }) => {
  await page.goto(`${BASE}/book`);
  await expect(page).toHaveURL(/\/book$/);
});

test("E2E-08 booking form fields visible", async ({ page }) => {
  await page.goto(`${BASE}/book`);
  await expect(page.locator('input[name="name"], input[placeholder*="name" i]').first()).toBeVisible();
  await expect(page.locator('input[name="email"], input[type="email"]').first()).toBeVisible();
  await expect(page.locator('input[name="phone"], input[type="tel"]').first()).toBeVisible();
});

test("E2E-09 /book-call page loads", async ({ page }) => {
  await page.goto(`${BASE}/book-call`);
  await expect(page).toHaveURL(/\/book-call$/);
});

test("E2E-10 /services page loads", async ({ page }) => {
  await page.goto(`${BASE}/services`);
  await expect(page).toHaveURL(/\/services$/);
});

test("E2E-11 /services/marketing page loads", async ({ page }) => {
  await page.goto(`${BASE}/services/marketing`);
  await expect(page).toHaveURL(/\/services\/marketing$/);
});

test("E2E-12 marketing content visible", async ({ page }) => {
  await page.goto(`${BASE}/services/marketing`);
  await expect(page.getByText(/Growth Ops|Digital Marketing|Agency Fee/i).first()).toBeVisible();
});

test("E2E-13 /pricing page loads", async ({ page }) => {
  await page.goto(`${BASE}/pricing`);
  await expect(page).toHaveURL(/\/pricing$/);
});

test("E2E-14 /maintenance page loads", async ({ page }) => {
  await page.goto(`${BASE}/maintenance`);
  await expect(page).toHaveURL(/\/maintenance$/);
});

test("E2E-15 /works page loads", async ({ page }) => {
  await page.goto(`${BASE}/works`);
  await expect(page).toHaveURL(/\/works$/);
});

test("E2E-16 /login page loads", async ({ page }) => {
  await page.goto(`${BASE}/login`);
  await expect(page).toHaveURL(/\/login$/);
});

test("E2E-17 /admin resolves (page or redirect)", async ({ page }) => {
  const response = await page.goto(`${BASE}/admin`);
  expect(response?.status()).toBeLessThan(500);
  await expect(page).not.toHaveURL(/404/);
});

test("E2E-18 internal calls slots returns JSON", async ({ request }) => {
  const response = await request.get(`${BASE}/internal/calls/slots`);
  expect([200, 503]).toContain(response.status());
  const data = await response.json();
  expect(typeof data).toBe("object");
});

test("E2E-19 internal bookings proxy returns handled response", async ({ request }) => {
  const response = await request.post(`${BASE}/internal/bookings`, {
    data: bookingPayload,
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "198.51.100.31"
    }
  });
  expect([200, 201, 400, 401, 403, 422, 429, 503]).toContain(response.status());
  const data = await response.json();
  expect(typeof data).toBe("object");
});

test("E2E-20 internal google auth proxy returns handled response", async ({ request }) => {
  const response = await request.post(`${BASE}/internal/google-auth`, {
    data: { credential: "fake-token", clientId: "fake-id" },
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": "198.51.100.32"
    }
  });
  expect([200, 400, 401, 403, 422, 429, 500, 503]).toContain(response.status());
  const data = await response.json();
  expect(typeof data).toBe("object");
});
