# Security Audit Report

Date: 2026-04-04

Scope:
- Reviewed application and config files under `apps/api`, `apps/web`, root config, and package manifests.
- Excluded `node_modules` and generated build output from manual review, but included dependency checks via `npm audit --omit=dev`.

## Findings

### [Critical] Secrets exposed in source and nested environment files are not safely excluded
- Evidence:
  - `apps/web/app/api/auth/signup/route.ts:4` hardcodes a Resend API key fallback in source.
  - `apps/api/.env:2-18` contains live-looking database, JWT, email, Cloudinary, Google, reCAPTCHA, and OpenAI secrets.
  - `.gitignore:1-8` ignores only root `.env` files, not nested files such as `apps/api/.env`.
- Impact:
  - A code leak, accidental commit, support bundle, or log snapshot would expose credentials that can be abused immediately.
  - Nested `.env` files are currently one `git add` away from being committed by mistake.
- Recommendation:
  - Remove hardcoded secrets from code.
  - Rotate every secret currently present in `apps/api/.env`.
  - Update ignore rules to cover nested secret files, for example `**/.env`, `**/.env.*`, while keeping `*.example` files committed.

### [High] Public lead lookup endpoint exposes customer PII without authentication
- Evidence:
  - `apps/api/src/routes/public.routes.ts:26` exposes `GET /api/leads/memory` publicly.
  - `apps/api/src/controllers/leadMemory.controller.ts:20-42` returns name, email, phone, business type, service, budget, status, booking ID, and creation date for any matching email or phone.
- Impact:
  - Anyone who knows or guesses a victim's email or phone number can enumerate lead records and harvest personal/business data.
  - There is no authentication check and no route-specific rate limit on this lookup.
- Recommendation:
  - Remove the endpoint from the public surface or require an authenticated session plus ownership proof.
  - If the feature must stay public, return only a minimal yes/no signal and add strong throttling and abuse monitoring.

### [High] Invoice endpoints rely on object ID secrecy and allow unauthenticated view, download, and signing
- Evidence:
  - `apps/api/src/routes/invoice.routes.ts:34-37` exposes `/api/invoices/:id/sign`, `/api/invoices/:id/pdf`, and `/portal/invoice/:id` without auth.
  - `apps/api/src/controllers/invoice.controller.ts:92-132` returns full invoice details including client PII and payment details.
  - `apps/api/src/controllers/invoice.controller.ts:384-420` accepts any signature payload and marks the invoice as signed.
  - `apps/api/src/controllers/invoice.controller.ts:427-446` serves the PDF for any valid invoice ID, even when `clientPortalVisible` is false.
  - `apps/api/src/controllers/invoice.controller.ts:453-472` exposes the public invoice view whenever `clientPortalVisible` is true.
- Impact:
  - Anyone with an invoice ID can read invoice contents, banking details, and client information, download the PDF, and submit a signature.
  - Draft or non-public invoices are still downloadable through the PDF route as long as the Mongo ID is known.
- Recommendation:
  - Replace bare-ID access with signed, expiring tokens tied to the document and intended action.
  - Require authentication or action-specific HMAC tokens for view, sign, and download operations.
  - Enforce `clientPortalVisible` and ownership checks consistently on every invoice endpoint.

### [High] Contract endpoints have the same bearer-by-ID exposure and permit unauthenticated signing
- Evidence:
  - `apps/api/src/routes/contract.routes.ts:41-45` exposes `/api/contracts/:id/sign`, `/api/contracts/:id/pdf`, `/api/contracts/public/:id`, and `/portal/contract/:id` without auth.
  - `apps/api/src/controllers/contract.controller.ts:106-142` returns full contract data including client PII and signatures.
  - `apps/api/src/controllers/contract.controller.ts:558-592` accepts any submitted signature and marks the contract as signed.
  - `apps/api/src/controllers/contract.controller.ts:599-618` serves PDFs without checking portal visibility or caller identity.
  - `apps/api/src/controllers/contract.controller.ts:625-642` exposes the public contract view whenever `clientPortalVisible` is true.
- Impact:
  - Anyone with a contract ID can read sensitive agreement details, download the PDF, and sign the agreement.
  - This is especially risky because contract pages are client-facing and IDs are intentionally shared in URLs.
- Recommendation:
  - Treat contract links as signed access grants rather than permanent object IDs.
  - Require scoped, expiring tokens for public contract actions and block direct bare-ID access.
  - Apply the same visibility and ownership checks to PDF download as to the public view route.

### [High] Customer JWTs can satisfy admin checks used by the blog admin API
- Evidence:
  - `apps/api/src/utils/auth.ts:5-12` and `apps/api/src/utils/customerAuth.ts:9-16` sign both admin and customer tokens with the same JWT secret.
  - `apps/api/src/middleware/auth.ts:11-18` only verifies signature validity and never validates token type or required claims.
  - `apps/web/app/api/admin/blog/route.ts:44-58` and `apps/web/app/api/admin/blog/[id]/route.ts:49-63` treat any `200 OK` from `/api/admin/me` as proof of admin authorization.
- Impact:
  - A valid customer JWT copied into a `token` cookie can pass `requireAuth`, making `/api/admin/me` return success even though no admin role is present.
  - The blog admin API then authorizes create/update/delete operations based only on that success response.
- Recommendation:
  - Use separate secrets or a required `token_type` claim for admin and customer tokens.
  - Validate claim shape in `requireAuth` and reject tokens missing `adminId` and `role`.
  - Make the blog admin API verify an allowed admin role, not just `response.ok`.

### [Medium] CAPTCHA enforcement fails open and booking creation continues after failed checks
- Evidence:
  - `apps/api/src/services/recaptcha.service.ts:10-16` returns success when no secret or token is present.
  - `apps/api/src/services/recaptcha.service.ts:54-56` returns success on network/runtime failure.
  - `apps/api/src/controllers/bookings.controller.ts:116-129` logs failed CAPTCHA signals but still creates the booking.
- Impact:
  - Bots can submit leads without a valid CAPTCHA during missing-token, upstream-failure, or explicit failed-verification cases.
  - This weakens spam protection and can pollute CRM, email flows, and follow-up automation.
- Recommendation:
  - Fail closed for missing/invalid CAPTCHA in public booking flows unless an explicit maintenance override is enabled.
  - Distinguish between operational fallback and attacker-controlled bad tokens.

### [Medium] Global error handler discloses stack traces and internal error messages to clients
- Evidence:
  - `apps/api/src/app.ts:85-88` returns `err.message` and `err.stack` in the HTTP response body.
- Impact:
  - Attackers can harvest framework internals, file paths, and implementation details that make targeted exploitation easier.
- Recommendation:
  - Return a generic error body in production and log the detailed stack server-side only.

### [Low] Public debug endpoints leak environment and session metadata
- Evidence:
  - `apps/web/app/api/debug/route.ts:3-7` returns environment-derived API base data.
  - `apps/web/app/api/debug-env/route.ts:3-11` reveals runtime mode and a partial Google client ID.
  - `apps/api/src/routes/auth.routes.ts:25` exposes `/api/auth/debug-session`.
  - `apps/api/src/controllers/customerAuth.controller.ts:231-269` returns session state and customer identifiers when a customer cookie is present.
- Impact:
  - These routes simplify reconnaissance and leak internal deployment details that do not need to be public.
- Recommendation:
  - Remove debug routes from production builds or restrict them behind admin auth and environment flags.

### [High] Dependency audit reports known vulnerabilities in shipped packages
- Evidence:
  - `apps/web/package.json:27` pins `next` to `14.2.35`.
  - `apps/api/package.json:22` depends on `express@^4.19.2`.
  - `npm audit --omit=dev` reported 3 high-severity package findings on 2026-04-04:
    - `next` with multiple advisories including request deserialization DoS and rewrite/request smuggling issues.
    - `path-to-regexp` via Express stack ReDoS advisory.
    - `lodash` code-injection / prototype-pollution advisories.
- Impact:
  - Some of these are reachable remotely depending on deployment and traffic patterns.
- Recommendation:
  - Upgrade Next.js to a patched release line.
  - Re-resolve the Express dependency tree to a version that pulls a fixed `path-to-regexp`.
  - Update or remove the vulnerable lodash consumer.

## Immediate Actions

1. Rotate all secrets currently stored in `apps/api/.env` and remove the hardcoded Resend key from source.
2. Lock down invoice and contract endpoints behind signed access tokens before exposing them further.
3. Disable or protect `GET /api/leads/memory`, `/api/debug`, `/api/debug-env`, and `/api/auth/debug-session`.
4. Split admin/customer JWT trust domains and harden admin authorization checks.
5. Change CAPTCHA handling to fail closed for public lead intake.
6. Remove stack traces from API responses.
7. Patch vulnerable dependencies reported by `npm audit`.

## Notes

- This was a static audit plus dependency audit. I did not run active exploitation against live services.
- The highest-risk issues are the exposed secrets, the public document endpoints, and the public lead-memory lookup.
