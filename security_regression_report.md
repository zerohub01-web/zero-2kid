# ZeroOps Security Regression Report

Date: 2026-04-04

## Step Status

- Step 1: ✅ CONTINUE
- Step 2: ✅ CONTINUE
- Step 3: ✅ CONTINUE
- Step 4: ✅ CONTINUE
- Step 5: ✅ CONTINUE
- Step 6: ✅ CONTINUE
- Step 7: ✅ CONTINUE
- Step 8: ⏭️ SKIP
  - `express` upgraded to `4.22.1`
  - `lodash` resolved to `4.18.1`
  - `path-to-regexp` resolved to `0.1.13`
  - `npm audit --omit=dev` still reports 1 high-severity `next` advisory; available fix is `16.2.2`, which exceeds the requested `14.x` patch boundary

## Local Verification Evidence

- `npm run build --workspace @zero/api`: PASS
- `npm run build --workspace @zero/web`: PASS
- `npm audit --omit=dev`: FAIL
  - Remaining high-severity issue: `next@14.2.35`

## Feature Regression Check

Note: `N` below means "not end-to-end verified in this local pass", not necessarily "known broken".

- N — Admin panel `/ops/login` still loads and authenticates
- N — Customer signup, login, and session flow unaffected
- N — Invoice creation from admin panel still works
- N — Contract creation from admin panel still works
- N — Invoice/Contract emails still dispatch with signed portal links
- N — Stripe checkout and webhook unaffected
- N — Blog admin create/update/delete still works (now requires admin JWT only)
- N — Lead/booking submission from public forms still works
- N — Cloudinary uploads unaffected
- N — Public product listing unaffected

## Security Fix Confirmation

- Y — Customer JWT returns 403 on `/api/admin/me`
- Y — `/api/invoices/:id/pdf` without token returns 401
- Y — `/api/leads/memory` returns stripped response without auth
- Y — `/api/debug` returns 404 in production
- Y — CAPTCHA-missing booking returns 400 (not 200)
- N — `npm audit` shows 0 HIGH/CRITICAL findings

## Deploy Decision

- DO NOT DEPLOY
  - Feature checklist still needs end-to-end confirmation
  - One high-severity `next` advisory remains unresolved on the allowed `14.x` line

## Manual Follow-Up

- Add `PORTAL_TOKEN_SECRET` to Render environment
- Rotate the secrets listed in the audit/remediation prompt and update deployment env vars
- Re-send pending invoice/contract links so clients receive signed portal URLs
- Run one full production invoice and contract flow using real client links
- Decide whether to accept the remaining `next` risk on `14.2.35` or plan a controlled upgrade beyond `14.x`
