# CAPTCHA Visible Checkbox Implementation Report
Date: 2026-04-04

## Summary

Implemented the visible Google reCAPTCHA checkbox flow across the public booking form, homepage booking surface, chatbot lead capture, and booking API response handling.

## What Changed

- Replaced invisible `grecaptcha.execute(...)` submission flow with a shared visible checkbox widget.
- Added shared CAPTCHA utilities and structured client-side message handling.
- Updated the booking form to block submission until a checkbox token exists.
- Updated the chatbot to stop auto-submitting on the last question and require a final visible security-check step.
- Removed production reliance on `recaptchaSkipped` in the web booking proxy.
- Changed API CAPTCHA failures to return explicit response codes:
  - `captcha_required`
  - `captcha_invalid`
  - `captcha_expired`
  - `captcha_unavailable`
- Updated env examples to document that the deployment now needs Google reCAPTCHA v2 checkbox keys.
- Added focused unit coverage for:
  - web CAPTCHA helper behavior
  - API CAPTCHA failure mapping
- Updated the browser spec to reflect that CAPTCHA now blocks submission until completed.

## Files Added

- `apps/web/lib/recaptcha.ts`
- `apps/web/components/security/RecaptchaCheckbox.tsx`
- `apps/web/tests/unit/recaptcha.test.ts`
- `apps/api/tests/unit/recaptcha.service.test.ts`

## Files Updated

- `apps/web/components/booking/BookingRequestForm.tsx`
- `apps/web/components/chatbot/LeadCaptureWidget.tsx`
- `apps/web/app/internal/bookings/route.ts`
- `apps/web/app/book/page.tsx`
- `apps/web/types/recaptcha.d.ts`
- `apps/web/tests/full-e2e.spec.ts`
- `apps/web/.env.example`
- `apps/api/src/services/recaptcha.service.ts`
- `apps/api/src/controllers/bookings.controller.ts`
- `apps/api/.env.example`

## Verification

Passed:

- `npm run test:unit` in `apps/web`
- `npm run test:unit` in `apps/api`
- `npm run build --workspace @zero/api`
- `npm run build --workspace @zero/web`

Not run:

- Live browser E2E with a real Google widget
- Production deploy validation

## Required Manual Follow-up

1. Replace the current reCAPTCHA key pair with a Google reCAPTCHA **v2 checkbox** key pair.
   - `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - `RECAPTCHA_SECRET_KEY`
2. Redeploy web and API after the new keys are set.
3. Test both public lead entry points in a real browser:
   - `/book` and homepage booking form
   - chatbot lead capture
4. Confirm expected outcomes:
   - submit is blocked until checkbox is completed
   - valid checkbox leads create bookings successfully
   - expired checkbox shows retry messaging
   - admin receives the lead as normal

## Notes

- The existing `RECAPTCHA_MIN_SCORE` env var is now effectively non-operative for the visible checkbox flow.
- The unrelated local file `BLOG_HOTFIX_REPORT_2026-04-04.md` was not touched.
