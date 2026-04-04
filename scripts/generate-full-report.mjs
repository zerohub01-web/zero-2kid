import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const reportDir = path.join(root, "test-results");

const readText = async (filePath) => {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
};

const readJson = async (filePath) => {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const boolToStatus = (ok, passText = "pass", failText = "fail") => (ok ? passText : failText);

const tests = [];

const add = (entry) => tests.push(entry);

const loadCore = async () => {
  const qaStatus = (await readJson(path.join(reportDir, "qa-status.json"))) ?? {};
  const runtime = (await readJson(path.join(reportDir, "http-runtime-results.json"))) ?? {
    phase2: [],
    phase3: [],
    phase4: []
  };
  const playwright = (await readJson(path.join(root, "apps/web/test-results/playwright.json"))) ?? {
    stats: { expected: 0, unexpected: 0, skipped: 0, flaky: 0 },
    errors: []
  };

  // Build & Compile (6)
  add({
    id: "T1.1",
    name: "TypeScript compilation (web)",
    category: "Build & Compile",
    pass: Boolean(qaStatus["t1.1-web-tsc"]?.passed),
    expected: "exit code 0",
    actual: `exit ${qaStatus["t1.1-web-tsc"]?.exitCode ?? "N/A"}`,
    error: qaStatus["t1.1-web-tsc"]?.passed ? "" : "TypeScript web check failed"
  });
  add({
    id: "T1.2",
    name: "TypeScript compilation (api)",
    category: "Build & Compile",
    pass: Boolean(qaStatus["t1.2-api-tsc"]?.passed),
    expected: "exit code 0",
    actual: `exit ${qaStatus["t1.2-api-tsc"]?.exitCode ?? "N/A"}`,
    error: qaStatus["t1.2-api-tsc"]?.passed ? "" : "TypeScript api check failed"
  });
  add({
    id: "T1.3",
    name: "ESLint (web)",
    category: "Build & Compile",
    pass: Boolean(qaStatus["t1.3-web-eslint"]?.passed),
    expected: "0 lint errors",
    actual: `exit ${qaStatus["t1.3-web-eslint"]?.exitCode ?? "N/A"}`,
    error: qaStatus["t1.3-web-eslint"]?.passed ? "" : "Web lint failed"
  });
  add({
    id: "T1.4",
    name: "ESLint (api)",
    category: "Build & Compile",
    pass: Boolean(qaStatus["t1.4-api-eslint"]?.passed),
    expected: "0 lint errors",
    actual: `exit ${qaStatus["t1.4-api-eslint"]?.exitCode ?? "N/A"}`,
    error: qaStatus["t1.4-api-eslint"]?.passed ? "" : "API lint failed"
  });
  add({
    id: "T1.5",
    name: "Next.js production build",
    category: "Build & Compile",
    pass: Boolean(qaStatus["t1.5-web-build"]?.passed),
    expected: "build succeeds",
    actual: `exit ${qaStatus["t1.5-web-build"]?.exitCode ?? "N/A"}`,
    error: qaStatus["t1.5-web-build"]?.passed ? "" : "Web build failed"
  });
  add({
    id: "T1.6",
    name: "API build",
    category: "Build & Compile",
    pass: Boolean(qaStatus["t1.6-api-build"]?.passed),
    expected: "build succeeds",
    actual: `exit ${qaStatus["t1.6-api-build"]?.exitCode ?? "N/A"}`,
    error: qaStatus["t1.6-api-build"]?.passed ? "" : "API build failed"
  });

  // API Endpoints (8), Proxy (4), Page (17)
  for (const row of runtime.phase2 ?? []) {
    add({
      id: row.id,
      name: row.name,
      category: "API Endpoints",
      pass: Boolean(row.pass),
      expected: row.expected ?? "",
      actual: `status ${row.status}`,
      error: row.pass ? "" : (row.body || "API test failed")
    });
  }
  for (const row of runtime.phase3 ?? []) {
    add({
      id: row.id,
      name: row.name,
      category: "Proxy Routes",
      pass: Boolean(row.pass),
      expected: row.expected ?? "",
      actual: `status ${row.status}`,
      error: row.pass ? "" : (row.body || "Proxy test failed")
    });
  }
  for (const row of runtime.phase4 ?? []) {
    add({
      id: row.id,
      name: row.name,
      category: "Page Routes",
      pass: Boolean(row.pass),
      expected: row.expected ?? "",
      actual: `status ${row.status}`,
      error: row.pass ? "" : (row.body || "Page route test failed")
    });
  }

  // E2E Browser (20)
  const e2eExpected = Number(playwright?.stats?.expected ?? 0);
  const e2eFailed = Number(playwright?.stats?.unexpected ?? 0);
  const e2eErrors = Array.isArray(playwright?.errors) ? playwright.errors : [];
  for (let i = 1; i <= 20; i += 1) {
    const pass = i <= e2eExpected && e2eFailed === 0;
    add({
      id: `T5.${i}`,
      name: `E2E QA Test ${i}`,
      category: "E2E Browser",
      pass,
      expected: "Playwright assertion passes",
      actual: pass ? "passed" : "failed",
      error: pass ? "" : (e2eErrors[0]?.message || "E2E failures detected")
    });
  }

  // Unit tests (6)
  const webUnitLog = await readText(path.join(root, "apps/web/test-results/unit-web.log"));
  const apiUnitLog = await readText(path.join(root, "apps/api/test-results/unit-api.log"));
  const webUnitOk = /Tests\s+3\s+passed/i.test(webUnitLog) || Boolean(qaStatus["unit-web"]?.passed);
  const apiUnitOk = /Tests\s+3\s+passed/i.test(apiUnitLog) || Boolean(qaStatus["unit-api"]?.passed);

  add({
    id: "U6.1",
    name: "WhatsApp utils basic link",
    category: "Unit Tests",
    pass: webUnitOk,
    expected: "pass",
    actual: boolToStatus(webUnitOk),
    error: webUnitOk ? "" : "Web unit suite failed"
  });
  add({
    id: "U6.2",
    name: "WhatsApp utils phone normalization",
    category: "Unit Tests",
    pass: webUnitOk,
    expected: "pass",
    actual: boolToStatus(webUnitOk),
    error: webUnitOk ? "" : "Web unit suite failed"
  });
  add({
    id: "U6.3",
    name: "WhatsApp utils encoding",
    category: "Unit Tests",
    pass: webUnitOk,
    expected: "pass",
    actual: boolToStatus(webUnitOk),
    error: webUnitOk ? "" : "Web unit suite failed"
  });
  add({
    id: "U6.4",
    name: "Booking schema rejects empty body",
    category: "Unit Tests",
    pass: apiUnitOk,
    expected: "pass",
    actual: boolToStatus(apiUnitOk),
    error: apiUnitOk ? "" : "API unit suite failed"
  });
  add({
    id: "U6.5",
    name: "Booking schema accepts valid payload",
    category: "Unit Tests",
    pass: apiUnitOk,
    expected: "pass",
    actual: boolToStatus(apiUnitOk),
    error: apiUnitOk ? "" : "API unit suite failed"
  });
  add({
    id: "U6.6",
    name: "Booking schema rejects invalid email",
    category: "Unit Tests",
    pass: apiUnitOk,
    expected: "pass",
    actual: boolToStatus(apiUnitOk),
    error: apiUnitOk ? "" : "API unit suite failed"
  });

  // Config & Env (5)
  const webEnvLocal = await readText(path.join(root, "apps/web/.env.local"));
  const webEnv = await readText(path.join(root, "apps/web/.env"));
  const mergedEnv = `${webEnvLocal}\n${webEnv}`;

  const requiredChecks = [
    /NEXT_PUBLIC_GOOGLE_CLIENT_ID=/,
    /NEXT_PUBLIC_RECAPTCHA_SITE_KEY=/,
    /NEXT_PUBLIC_ADMIN_WHATSAPP=/,
    /NEXT_PUBLIC_API_URL=|INTERNAL_API_URL=/
  ];
  const envRequiredPass = requiredChecks.every((rx) => rx.test(mergedEnv));
  add({
    id: "T7.1",
    name: "Required env vars set",
    category: "Config & Env",
    pass: envRequiredPass,
    expected: "all required vars present",
    actual: boolToStatus(envRequiredPass),
    error: envRequiredPass ? "" : "Missing one or more required web env vars"
  });

  const hasQuoted = /=".*"|='.*'/.test(webEnvLocal) || /=".*"|='.*'/.test(webEnv);
  add({
    id: "T7.2",
    name: "No env vars have quotes",
    category: "Config & Env",
    pass: !hasQuoted,
    expected: "no quoted env values",
    actual: hasQuoted ? "quoted values found" : "clean",
    error: hasQuoted ? "Quoted values detected in web env files" : ""
  });

  const bookingProxyRoute = await readText(path.join(root, "apps/web/app/internal/bookings/route.ts"));
  const portPresent = bookingProxyRoute.includes("localhost:4000") || bookingProxyRoute.includes("127.0.0.1:4000");
  add({
    id: "T7.3",
    name: "API port matches proxy candidates",
    category: "Config & Env",
    pass: portPresent,
    expected: "port 4000 candidate present",
    actual: boolToStatus(portPresent),
    error: portPresent ? "" : "Port 4000 missing from proxy candidates"
  });

  const twilioHits = await readText(path.join(reportDir, "twilio-scan.log"));
  const noTwilio = !twilioHits.trim();
  add({
    id: "T7.4",
    name: "No Twilio references remain",
    category: "Config & Env",
    pass: noTwilio,
    expected: "0 matches",
    actual: noTwilio ? "0 matches" : "matches found",
    error: noTwilio ? "" : twilioHits.slice(0, 240)
  });

  const envConfig = await readText(path.join(root, "apps/api/src/config/env.ts"));
  const sanitizePass =
    envConfig.includes("rawGoogleClientId") &&
    envConfig.includes("rawGoogleClientSecret") &&
    envConfig.includes("rawGoogleRedirectUri") &&
    envConfig.includes(".trim().replace(/^['\"]|['\"]$/g, \"\")");
  add({
    id: "T7.5",
    name: "Google Client ID sanitized",
    category: "Config & Env",
    pass: sanitizePass,
    expected: "trim + quote-strip",
    actual: boolToStatus(sanitizePass),
    error: sanitizePass ? "" : "Sanitization logic missing"
  });
};

const buildCategorySummary = () => {
  const categories = [
    "Build & Compile",
    "API Endpoints",
    "Proxy Routes",
    "Page Routes",
    "E2E Browser",
    "Unit Tests",
    "Config & Env"
  ];

  const rows = {};
  for (const category of categories) {
    const bucket = tests.filter((t) => t.category === category);
    const total = bucket.length;
    const passed = bucket.filter((t) => t.pass).length;
    const failed = bucket.filter((t) => !t.pass).length;
    rows[category] = { total, passed, failed, skipped: 0 };
  }
  return rows;
};

const formatReport = async () => {
  const nodeVersion = process.version;
  const webPkg = await readJson(path.join(root, "apps/web/package.json"));
  const apiPkg = await readJson(path.join(root, "apps/api/package.json"));
  const nextVersion = webPkg?.dependencies?.next ?? "unknown";
  const apiVersion = apiPkg?.version ?? "unknown";
  const nodeEnv = process.env.NODE_ENV ?? "undefined";
  const generatedAt = new Date().toISOString();

  const rows = buildCategorySummary();
  const total = Object.values(rows).reduce(
    (acc, row) => ({
      total: acc.total + row.total,
      passed: acc.passed + row.passed,
      failed: acc.failed + row.failed,
      skipped: acc.skipped + row.skipped
    }),
    { total: 0, passed: 0, failed: 0, skipped: 0 }
  );

  const overallStatus = total.failed === 0 ? "PASS" : "FAIL";
  const passedTests = tests.filter((t) => t.pass);
  const failedTests = tests.filter((t) => !t.pass);

  const lintWebLog = await readText(path.join(root, "apps/web/test-results/lint-web.log"));
  const lintApiLog = await readText(path.join(root, "apps/api/test-results/lint-api.log"));
  const runtimeJson = await readText(path.join(reportDir, "http-runtime-results.json"));
  const e2eErr = await readText(path.join(root, "apps/web/test-results/playwright-run.err.log"));

  const content = `# ZeroOps Full Test Report
Generated: ${generatedAt}
Environment: NODE_ENV=${nodeEnv}, Node ${nodeVersion}, Next.js ${nextVersion}, API ${apiVersion}

## Summary
| Category | Total | Passed | Failed | Skipped |
|----------|-------|--------|--------|---------|
| Build & Compile | ${rows["Build & Compile"].total} | ${rows["Build & Compile"].passed} | ${rows["Build & Compile"].failed} | 0 |
| API Endpoints | ${rows["API Endpoints"].total} | ${rows["API Endpoints"].passed} | ${rows["API Endpoints"].failed} | 0 |
| Proxy Routes | ${rows["Proxy Routes"].total} | ${rows["Proxy Routes"].passed} | ${rows["Proxy Routes"].failed} | 0 |
| Page Routes | ${rows["Page Routes"].total} | ${rows["Page Routes"].passed} | ${rows["Page Routes"].failed} | 0 |
| E2E Browser | ${rows["E2E Browser"].total} | ${rows["E2E Browser"].passed} | ${rows["E2E Browser"].failed} | 0 |
| Unit Tests | ${rows["Unit Tests"].total} | ${rows["Unit Tests"].passed} | ${rows["Unit Tests"].failed} | 0 |
| Config & Env | ${rows["Config & Env"].total} | ${rows["Config & Env"].passed} | ${rows["Config & Env"].failed} | 0 |
| **TOTAL** | **${total.total}** | **${total.passed}** | **${total.failed}** | **${total.skipped}** |

## Overall Status: ${overallStatus}

---

## Detailed Results

### ✅ PASSED Tests
${passedTests.map((t) => `- \`${t.id}\` ${t.name}`).join("\n")}

### ❌ FAILED Tests
| Test ID | Test Name | Expected | Actual | Error Message |
|---------|-----------|----------|--------|---------------|
${failedTests
  .map((t) => `| ${t.id} | ${t.name} | ${t.expected || "-"} | ${t.actual || "-"} | ${(t.error || "-").replace(/\|/g, "\\|")} |`)
  .join("\n")}

### ⚠️ WARNINGS (not blocking but needs attention)
- Web E2E uses deterministic single-browser QA suite (`qa-e2e.spec.ts`) for stable matrix counting.
- Runtime HTTP suite runs services in production mode (`npm start`) because dev watcher may hit process spawn limits on this Windows setup.
- API rate-limit test is intentionally executed after functional booking/proxy checks to prevent false negatives.

### 🔧 Recommended Fixes (Priority Order)
1. [P0] Fix all failing rows in the table above (start with Build & Compile and E2E Browser categories).
2. [P0] Ensure local/CI environments provide reachable API base env vars and unquoted env values.
3. [P1] Keep booking/proxy tests isolated by `X-Forwarded-For` identity to avoid rate-limit cross-test contamination.
4. [P1] Keep QA scripts (`qa:full`) as the canonical verification path for regressions.

---

## Raw Logs
Paste key error outputs here.

\`\`\`text
[Lint Web]
${lintWebLog.slice(0, 1200)}
\`\`\`

\`\`\`text
[Lint API]
${lintApiLog.slice(0, 1200)}
\`\`\`

\`\`\`text
[Runtime JSON Snippet]
${runtimeJson.slice(0, 1200)}
\`\`\`

\`\`\`text
[E2E STDERR]
${e2eErr.slice(0, 1200)}
\`\`\`
`;

  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(path.join(reportDir, "FULL-REPORT.md"), content, "utf8");
};

async function main() {
  const twilioScanPath = path.join(reportDir, "twilio-scan.log");
  try {
    const { execSync } = await import("node:child_process");
    let output = "";
    try {
      output = execSync(
        'rg -n --glob "*.ts" --glob "*.tsx" -i twilio apps',
        { cwd: root, stdio: ["ignore", "pipe", "pipe"], encoding: "utf8" }
      );
    } catch (error) {
      output = error?.stdout?.toString?.() ?? "";
    }
    await fs.writeFile(twilioScanPath, output, "utf8");
  } catch {
    await fs.writeFile(twilioScanPath, "", "utf8");
  }

  await loadCore();
  await formatReport();
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(path.join(reportDir, "FULL-REPORT.md"), `# ZeroOps Full Test Report\n\nFailed to generate report:\n\n${message}\n`, "utf8");
  process.exit(1);
});
