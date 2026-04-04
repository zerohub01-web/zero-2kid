# ZeroOps Remediation Report
Date: 2026-04-04

## Scope Completed

This pass completed the pending admin-panel work, public review flow, proposal link repair, analytics fixes, and the broken client request submission path.

## Root Cause: Client Request Not Reaching Admin

The lead submission issue was caused by two separate problems:

1. `apps/web/app/internal/bookings/route.ts`
   - The proxy did not try `NEXT_PUBLIC_API_BASE_URL`
   - The upstream timeout was too short
   - When upstream failed, it wrote to `fallback-leads.json` and still returned a success-style response

2. `apps/web/components/chatbot/LeadCaptureWidget.tsx`
   - The chatbot treated `fallback === true` as a successful submission
   - This let the client see a success message even when the lead never reached the API or admin inbox

## Fixes Applied

### Booking / Lead Submission

- Hardened `apps/web/app/internal/bookings/route.ts`
  - Added `NEXT_PUBLIC_API_BASE_URL` to upstream candidates
  - Added current request origin as a runtime candidate
  - Increased timeout windows
  - Stopped returning fake success on fallback
  - Now returns `503` with a clear error when the lead is only saved locally

- Fixed `apps/web/components/chatbot/LeadCaptureWidget.tsx`
  - Fallback responses are no longer treated as success
  - The widget now shows an error when the backend did not actually accept the lead

### Invoice / Proposal Prefill

- Updated `apps/web/app/zero-control/invoices/[id]/page.tsx`
  - Added booking prefill UI matching the contract editor
  - Added query-based prefill support for proposal/invoice creation
  - Added booking lookup parsing compatible with the admin booking endpoint

- Added proposal route aliases
  - `apps/web/app/zero-control/proposals/page.tsx`
  - `apps/web/app/zero-control/proposals/[id]/page.tsx`

### Analytics Dashboard

- Updated `apps/api/src/controllers/analytics.controller.ts`
  - Replaced empty/hardcoded stats with DB-backed counts and revenue aggregation
  - Returned INR currency metadata
  - Normalized recent activity timestamps

- Updated `apps/web/app/zero-control/analytics/page.tsx`
  - Added safe date formatting to stop `Invalid Date`
  - Rendered real KPI data
  - Switched revenue display to `₹`
  - Rendered readable activity labels

### New Admin Sections

Created:

- `apps/web/app/zero-control/whatsapp/page.tsx`
- `apps/web/app/zero-control/followups/page.tsx`
- `apps/web/app/zero-control/calls/page.tsx`
- `apps/web/app/zero-control/reviews/page.tsx`

Updated:

- `apps/web/app/zero-control/layout.tsx`
  - Added grouped navigation:
    - MAIN
    - COMMUNICATION
    - DOCUMENTS
    - SETTINGS

### Reviews System

- Added review model and API support
  - `apps/api/src/db/schema.ts`
  - `apps/api/src/controllers/review.controller.ts`
  - `apps/api/src/routes/review.routes.ts`

- Updated portal review submission
  - `apps/web/app/portal/page.tsx`
  - Review form now appears only for eligible completed/signed work
  - Stores submitted state locally per project

- Updated public review display
  - `apps/web/app/testimonials/page.tsx`
  - `apps/web/app/works/page.tsx`

### Proposal URL Repair

- Updated proposal generation/storage
  - `apps/api/src/controllers/bookings.controller.ts`
  - `apps/api/src/services/proposal.service.ts`
  - `apps/api/src/routes/proposal.routes.ts`

- Fixed lead inbox proposal opening
  - `apps/web/app/zero-control/page.tsx`
  - Localhost proposal URLs now resolve to production-safe proposal routes

### Call Status Handling

- Added `confirmed` support in backend and admin UI
  - `apps/api/src/models/CallBooking.ts`
  - `apps/api/src/controllers/calls.controller.ts`
  - `apps/api/src/utils/validation.ts`
  - `apps/web/app/zero-control/calls/page.tsx`
  - `apps/web/app/zero-control/page.tsx`

## Build Verification

Passed:

- `npm run build --workspace @zero/api`
- `npm run build --workspace @zero/web`

## Important Runtime Notes

- If production reCAPTCHA env vars are missing, booking submissions will now fail visibly instead of pretending success
- Any request previously written only to `fallback-leads.json` was not stored in MongoDB and did not reach admin inboxes
- A real production submission should be tested after deploy to confirm:
  - website form submission returns success
  - chatbot submission returns success
  - booking appears in admin lead inbox
  - confirmation email / follow-up pipeline fires as expected

## Suggested Live Validation

1. Submit one lead from the public booking form
2. Submit one lead from the chatbot widget
3. Confirm both appear in admin at `/zero-control` and `/zero-control/whatsapp`
4. Confirm neither request returns a false success if the API is unavailable
5. Open one legacy lead with a proposal and confirm `View Proposal` opens the API PDF route

## Files Most Relevant To The Submission Bug

- `apps/web/app/internal/bookings/route.ts`
- `apps/web/components/chatbot/LeadCaptureWidget.tsx`
- `apps/api/src/controllers/bookings.controller.ts`
- `apps/web/app/zero-control/page.tsx`

