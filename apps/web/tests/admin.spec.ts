/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page, type Route } from "@playwright/test";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

interface MockLead {
  id: string;
  bookingId: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  status: "new" | "contacted" | "converted" | "closed";
  createdAt: string;
  message: string;
  businessType: string;
  teamSize: string;
  budget: string;
}

function jsonResponse(route: Route, payload: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(payload)
  });
}

async function mockAdminSession(page: Page): Promise<void> {
  const parsed = new URL(BASE_URL);

  await page.context().addCookies([
    {
      name: "token",
      value: "e2e-admin-token",
      domain: parsed.hostname,
      path: "/",
      httpOnly: false,
      secure: parsed.protocol === "https:",
      sameSite: "Lax"
    }
  ]);

  await page.route("**/api/admin/me", (route) =>
    jsonResponse(route, { adminId: "e2e_admin", role: "SUPER_ADMIN" })
  );
}

async function mockDashboardApis(page: Page): Promise<void> {
  await page.route("**/api/admin/analytics**", (route) =>
    jsonResponse(route, {
      kpis: {
        totalBookings: 14,
        revenue: 275000,
        growthPercent: 18.4,
        activeCustomers: 7,
        highValueLeads: 5,
        conversionRate: 21,
        repeatCustomers: 2,
        topService: "Business Automation"
      }
    })
  );

  await page.route("**/api/admin/services**", (route) =>
    jsonResponse(route, [
      { id: "svc-1", title: "Website Development", isActive: true },
      { id: "svc-2", title: "Digital Marketing", isActive: true }
    ])
  );

  await page.route("**/api/admin/bookings**", (route) => jsonResponse(route, []));
  await page.route("**/api/admin/blog**", (route) => jsonResponse(route, { blogs: [] }));
}

test.describe("ZeroOps Admin Panel E2E", () => {
  test("1) redirects logged-out users from /admin to /login", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  });

  test("2) sidebar navigation works in logged-in state", async ({ page }) => {
    await mockAdminSession(page);
    await mockDashboardApis(page);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });

    await page.getByRole("link", { name: /Leads & Bookings/i }).click();
    await expect(page).toHaveURL(/\/admin\/leads(?:\?.*)?$/);

    await page.getByRole("link", { name: /Blog Manager/i }).click();
    await expect(page).toHaveURL(/\/admin\/blog(?:\?.*)?$/);
  });

  test("3) dashboard overview shows welcome header and 4 stat cards", async ({ page }) => {
    await mockAdminSession(page);
    await mockDashboardApis(page);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: "domcontentloaded" });

    await expect(page.getByRole("heading", { name: /Welcome back, Admin/i })).toBeVisible();
    await expect(page.getByText(/Total Leads/i)).toBeVisible();
    await expect(page.getByText(/Active Services/i)).toBeVisible();
    await expect(page.getByText(/Published Blogs/i)).toBeVisible();
    await expect(page.getByText(/Total Revenue\s*\/\s*Value/i)).toBeVisible();
  });

  test("4a) leads manager renders empty state safely", async ({ page }) => {
    await mockAdminSession(page);

    await page.route("**/api/admin/bookings**", (route) => jsonResponse(route, []));
    await page.route("**/api/bookings**", (route) => jsonResponse(route, []));
    await page.route("**/internal/bookings**", (route) => jsonResponse(route, []));

    await page.goto(`${BASE_URL}/admin/leads`, { waitUntil: "domcontentloaded" });

    await expect(page.getByText(/No leads found/i)).toBeVisible();
  });

  test("4b) leads manager renders one lead row with action button", async ({ page }) => {
    await mockAdminSession(page);

    const lead: MockLead = {
      id: "lead-001",
      bookingId: "BK-260402-LEAD1",
      name: "Karthikeyan SP",
      email: "karthikeyansp578@gmail.com",
      phone: "8590464379",
      service: "Digital Marketing",
      status: "new",
      createdAt: "2026-04-02T10:00:00.000Z",
      message: "Need complete growth system",
      businessType: "Startup",
      teamSize: "2-10",
      budget: "Not specified"
    };

    await page.route("**/api/admin/bookings**", (route) => jsonResponse(route, [lead]));
    await page.route("**/api/bookings**", (route) => jsonResponse(route, [lead]));
    await page.route("**/internal/bookings**", (route) => jsonResponse(route, [lead]));

    await page.goto(`${BASE_URL}/admin/leads`, { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Karthikeyan SP")).toBeVisible();
    await expect(page.getByRole("button", { name: /View Full Details/i })).toBeVisible();
  });

  test("5) blog manager CTA and empty state render correctly", async ({ page }) => {
    await mockAdminSession(page);

    await page.route("**/api/admin/blog**", (route) => jsonResponse(route, { blogs: [] }));

    await page.goto(`${BASE_URL}/admin/blog`, { waitUntil: "domcontentloaded" });

    const writeButton = page.getByRole("button", { name: /\+\s*Write New Post/i });
    await expect(writeButton).toBeVisible();
    await writeButton.click();

    await expect(page.getByText(/No blog posts yet\. Start writing!/i)).toBeVisible();
  });
});
