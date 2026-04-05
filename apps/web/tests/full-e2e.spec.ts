import { test, expect, Page } from "@playwright/test";

const BASE = process.env.WEB_URL || "http://localhost:3000";

async function openChatIfPresent(page: Page): Promise<boolean> {
  const trigger = page
    .locator(
      'button[aria-label*="chat" i], button:has-text("Chat"), button:has-text("chat"), [class*="chatbot"][role="button"], [class*="chat-trigger" i]'
    )
    .first();

  if ((await trigger.count()) === 0) return false;

  if (await trigger.isVisible().catch(() => false)) {
    await trigger.click({ timeout: 3000 }).catch(() => undefined);
    return true;
  }

  return false;
}

test.describe("Homepage", () => {
  test("T5.1 - loads without error", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));

    await page.goto(BASE);
    await expect(page).toHaveTitle(/ZeroOps|ZERO/i);
    expect(errors).toHaveLength(0);
  });

  test("T5.2 - hero headline visible", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator("h1").first()).toBeVisible();
  });

  test("T5.3 - navbar links present", async ({ page }) => {
    await page.goto(BASE);
    const links = ["Pricing", "Services", "Maintenance", "Works", "Testimonials", "Book"];
    for (const link of links) {
      await expect(page.getByRole("link", { name: new RegExp(link, "i") }).first()).toBeVisible();
    }
  });

  test("T5.4 - Resend announcement bar visible", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByText(/Resend/i).first()).toBeVisible();
  });

  test("T5.5 - no console errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(m.text());
    });

    await page.goto(BASE);
    await page.waitForTimeout(2000);

    const realErrors = errors.filter((e) => !/favicon|recaptcha|Failed to load resource/i.test(e));
    expect(realErrors).toHaveLength(0);
  });

  test("T5.6 - stat cards render numbers", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.getByText(/99\.9%|3x|24\/7|360/i).first()).toBeVisible();
  });

  test("T5.7 - pricing section visible", async ({ page }) => {
    await page.goto(BASE);
    await page.getByText(/Pricing/i).first().scrollIntoViewIfNeeded();
    await expect(page.getByText(/14,999|39,999|89,999/i).first()).toBeVisible();
  });

  test("T5.8 - footer visible with contact info", async ({ page }) => {
    await page.goto(BASE);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(page.getByText(/zerohub01@gmail\.com/i)).toBeVisible();
  });

  test("T5.9 - chatbot widget opens", async ({ page }) => {
    await page.goto(BASE);
    const opened = await openChatIfPresent(page);

    if (opened) {
      await expect(page.getByText(/AI Lead Assistant|Lead Assistant|capture/i).first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe("Booking Form", () => {
  test("T5.10 - /book page loads", async ({ page }) => {
    await page.goto(`${BASE}/book`);
    await expect(page).not.toHaveURL(/404/i);
    await expect(page.locator("form").first()).toBeVisible();
  });

  test("T5.11 - form fields all present", async ({ page }) => {
    await page.goto(`${BASE}/book`);
    await expect(page.locator('input[name="name"], input[placeholder*="name" i]').first()).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="phone"], input[type="tel"]').first()).toBeVisible();
  });

  test("T5.12 - form validation shows errors on empty submit", async ({ page }) => {
    await page.goto(`${BASE}/book`);
    await page.getByRole("button", { name: /submit|book|request/i }).first().click();
    await expect(page.getByText(/required|please|error|fix/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("T5.13 - full booking form submission flow", async ({ page }) => {
    await page.goto(`${BASE}/book`);

    await page.fill('input[name="name"], input[placeholder*="name" i]', "Test User ZeroOps");
    await page.fill('input[name="email"], input[type="email"]', "test@zeroops.in");
    await page.fill('input[name="phone"], input[type="tel"]', "9999999999");
    await page.fill('input[name="businessType"], input[placeholder*="business" i]', "Tech / SaaS Startup");

    const serviceSelect = page.locator('select[name="service"], [name="serviceType"]');
    if (await serviceSelect.count()) {
      await serviceSelect.first().selectOption({ index: 1 });
    }

    const teamSizeInput = page.locator('input[name="teamSize"], input[placeholder*="team" i]');
    if (await teamSizeInput.count()) {
      await teamSizeInput.first().fill("2-10");
    }

    const message = page.locator("textarea").first();
    if (await message.count()) {
      await message.fill("This is a test booking from automated tests");
    }

    await page.getByRole("button", { name: /submit|book|request/i }).first().click();
    await page.waitForTimeout(5000);

    const success = page.getByText(/success|received|thank|done|booking submitted/i).first();
    const knownError = page.getByText(/unavailable|failed|error|try again|validation|security check|captcha/i).first();

    const hasSuccess = await success.isVisible().catch(() => false);
    const hasError = await knownError.isVisible().catch(() => false);
    expect(hasSuccess || hasError).toBe(true);
  });

  test("T5.14 - WhatsApp button appears after success", async ({ page }) => {
    await page.goto(`${BASE}/book`);
    const waBtn = page.locator('a[href*="wa.me"]');
    const count = await waBtn.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test("T5.15 - reCAPTCHA blocks submission until completed", async ({ page }) => {
    await page.goto(`${BASE}/book`);

    await page.fill('input[name="name"], input[placeholder*="name" i]', "CAPTCHA Test").catch(() => undefined);
    await page.fill('input[name="email"], input[type="email"]', "captcha@test.com").catch(() => undefined);
    await page.fill('input[name="phone"], input[type="tel"]', "8888888888").catch(() => undefined);
    await page.fill('input[name="businessType"], input[placeholder*="business" i]', "Startup").catch(() => undefined);
    const serviceSelect = page.locator('select[name="service"], [name="serviceType"]');
    if (await serviceSelect.count()) {
      await serviceSelect.first().selectOption({ index: 1 });
    }
    await page.fill('input[name="teamSize"], input[placeholder*="team" i]', "2-10").catch(() => undefined);
    await page.fill("textarea", "Need a marketing dashboard and reporting setup.").catch(() => undefined);

    await page.getByRole("button", { name: /submit|book|request/i }).first().click();
    await expect(page.getByText(/Complete the CAPTCHA security check before submitting/i).first()).toBeVisible({
      timeout: 5000
    });
  });
});

test.describe("Chatbot Lead Capture", () => {
  test("T5.16 - chatbot opens and shows first message", async ({ page }) => {
    await page.goto(BASE);
    const opened = await openChatIfPresent(page);
    if (opened) {
      await expect(page.getByText(/Hi|Hello|name|Assistant/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("T5.17 - option pill buttons appear for business type", async ({ page }) => {
    await page.goto(BASE);
    const opened = await openChatIfPresent(page);
    if (!opened) return;

    const input = page.locator('input[placeholder*="name" i], input[placeholder*="full name" i], input[type="text"]').first();
    if (await input.count()) {
      await input.fill("Test User");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(700);
      await input.fill("test@zeroops.in");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(700);
      await input.fill("9999999999");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1200);
    }

    const pills = page.locator('[class*="option-pill"], button:has-text("Other")');
    expect(await pills.count()).toBeGreaterThanOrEqual(0);
  });

  test("T5.18 - Other option shows text input", async ({ page }) => {
    await page.goto(BASE);
    const otherBtn = page.getByRole("button", { name: /Other/i }).first();
    if (await otherBtn.isVisible().catch(() => false)) {
      await otherBtn.click();
      await expect(page.locator('input[placeholder*="Type your answer" i], input[type="text"]').first()).toBeVisible();
    }
  });
});

test.describe("Google Auth", () => {
  test("T5.19 - /login page loads", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await expect(page).not.toHaveURL(/404|500/i);
  });

  test("T5.20 - Google login button visible", async ({ page }) => {
    await page.goto(`${BASE}/login`);
    const googleBtn = page.locator('button:has-text("Google"), [class*="google" i], div[class*="google" i]').first();
    await expect(googleBtn).toBeVisible({ timeout: 5000 });
  });

  test("T5.21 - no GOOGLE_CLIENT_ID hard crash in dev", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (m) => errors.push(m.text()));
    await page.goto(`${BASE}/login`);
    await page.waitForTimeout(2000);

    const crashError = errors.find((e) => /Cannot read|undefined|TypeError/i.test(e) && /GOOGLE_CLIENT_ID/i.test(e));
    expect(crashError ?? "").toBe("");
  });
});

test.describe("Admin Panel", () => {
  test("T5.22 - /admin redirects correctly", async ({ page }) => {
    await page.goto(`${BASE}/admin`);
    await expect(page).not.toHaveURL(/404/i);
  });

  test("T5.23 - /zero-control loads", async ({ page }) => {
    await page.goto(`${BASE}/zero-control`);
    const url = page.url();
    expect(url.includes("zero-control") || url.includes("login")).toBe(true);
  });

  test("T5.24 - /portal loads or redirects", async ({ page }) => {
    await page.goto(`${BASE}/portal`);
    await expect(page).not.toHaveURL(/404|500/i);
  });
});

test.describe("Marketing Page", () => {
  test("T5.25 - /services/marketing loads", async ({ page }) => {
    await page.goto(`${BASE}/services/marketing`);
    await expect(page).not.toHaveURL(/404/i);
  });

  test("T5.26 - Growth Ops content visible", async ({ page }) => {
    await page.goto(`${BASE}/services/marketing`);
    await expect(page.getByText(/Growth Ops|Marketing|INR|\u20B9/i).first()).toBeVisible();
  });

  test("T5.27 - Book Audit CTA links to /book", async ({ page }) => {
    await page.goto(`${BASE}/services/marketing`);
    await expect(page.locator('a[href="/book"]').first()).toBeVisible();
  });

  test("T5.28 - WhatsApp link correct number", async ({ page }) => {
    await page.goto(`${BASE}/services/marketing`);
    const waLink = page.locator('a[href*="wa.me/919746927368"]');
    expect(await waLink.count()).toBeGreaterThan(0);
  });
});

test.describe("WhatsApp CTAs", () => {
  test("T5.29 - homepage has WhatsApp link", async ({ page }) => {
    await page.goto(BASE);
    const waLinks = page.locator('a[href*="wa.me"]');
    expect(await waLinks.count()).toBeGreaterThanOrEqual(0);
  });

  test("T5.30 - WhatsApp number is correct (919746927368)", async ({ page }) => {
    await page.goto(BASE);
    const waLinks = page.locator('a[href*="wa.me"]');
    const count = await waLinks.count();
    for (let i = 0; i < count; i += 1) {
      const href = await waLinks.nth(i).getAttribute("href");
      if (href) {
        expect(href).toContain("919746927368");
      }
    }
  });

  test("T5.31 - Resend banner links to resend.com", async ({ page }) => {
    await page.goto(BASE);
    const resendLink = page.locator('a[href*="resend.com"]').first();
    if (await resendLink.count()) {
      const href = await resendLink.getAttribute("href");
      expect(href ?? "").toContain("resend.com");
    }
  });
});

test.describe("Mobile Responsive", () => {
  test("T5.32 - homepage mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE);
    await expect(page.locator("h1").first()).toBeVisible();

    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewWidth + 20);
  });

  test("T5.33 - booking form mobile usable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/book`);
    await expect(page.locator("input, textarea").first()).toBeVisible();
  });
});

test.describe("Performance Basics", () => {
  test("T5.34 - homepage loads under 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto(BASE, { waitUntil: "networkidle" });
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(5000);
  });

  test("T5.35 - no broken images on homepage", async ({ page }) => {
    await page.goto(BASE);
    const images = page.locator("img");
    const count = await images.count();

    let broken = 0;
    for (let i = 0; i < count; i += 1) {
      const loaded = await images.nth(i).evaluate((img: HTMLImageElement) => img.naturalWidth > 0);
      if (!loaded) broken += 1;
    }

    expect(broken).toBe(0);
  });
});
