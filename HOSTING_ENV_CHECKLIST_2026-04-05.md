# Hosting Environment Checklist
Date: 2026-04-05

## Root Cause Summary

The live CAPTCHA issue is now in the verification stage, not the widget-loading stage.

1. The current production key is a Google reCAPTCHA v3 key.
2. The web app is already using the v3 submit flow.
3. When booking submit still fails with `We couldn't verify the security check. Please try again.`, the most likely cause is one of:
   - Render is missing `RECAPTCHA_SECRET_KEY`
   - Render has a secret from a different Google reCAPTCHA property than the Vercel site key
   - the Google reCAPTCHA property does not allow `zeroops.in` and `www.zeroops.in`
   - the request score is below `RECAPTCHA_MIN_SCORE`

## Vercel (`apps/web`) - Add These

### Required

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- `NEXT_PUBLIC_RECAPTCHA_MODE`
- `NEXT_PUBLIC_WEB_URL`
- `RESEND_API_KEY`

### Recommended

- `NEXT_PUBLIC_ADMIN_WHATSAPP`
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- `INTERNAL_API_URL`
- `NEXT_PUBLIC_API_URL`

### Values to use now

- `NEXT_PUBLIC_RECAPTCHA_MODE=v3`
- `NEXT_PUBLIC_WEB_URL=https://www.zeroops.in`
- `NEXT_PUBLIC_API_BASE_URL=https://zero-api-m0an.onrender.com`

## Render (`apps/api`) - Add These

### Required

- `MONGODB_URI`
- `JWT_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `ADMIN_NOTIFY_EMAIL`
- `CLIENT_ORIGIN`
- `WEB_BASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `RECAPTCHA_SECRET_KEY`
- `RECAPTCHA_MIN_SCORE`

### Required if you use uploads / documents / portal links

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `PORTAL_TOKEN_SECRET`
- `ZERO_BANK_NAME`
- `ZERO_ACCOUNT_NUMBER`
- `ZERO_IFSC_CODE`
- `ZERO_UPI_ID`
- `ZERO_GST_NUMBER`

### Recommended

- `PORT`
- `JWT_EXPIRES_IN`
- `COOKIE_SECURE`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ADMIN_NOTIFY_WHATSAPP`
- `NEXT_PUBLIC_ADMIN_WHATSAPP`

### Values to use now

- `CLIENT_ORIGIN=https://zeroops.in`
- `WEB_BASE_URL=https://www.zeroops.in`
- `RECAPTCHA_MIN_SCORE=0.5`

## CAPTCHA Pairing Rules

### Use this now

- Keep your current Google v3 key pair
- Set:
  - Vercel: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<current v3 site key>`
  - Vercel: `NEXT_PUBLIC_RECAPTCHA_MODE=v3`
  - Render: `RECAPTCHA_SECRET_KEY=<matching v3 secret>`
  - Render: `RECAPTCHA_MIN_SCORE=0.5`

### Use this later only if you want the visible checkbox again

- Create a new Google reCAPTCHA v2 checkbox key pair
- Replace:
  - Vercel: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<new v2 checkbox site key>`
  - Vercel: `NEXT_PUBLIC_RECAPTCHA_MODE=checkbox`
  - Render: `RECAPTCHA_SECRET_KEY=<matching v2 checkbox secret>`

## Google reCAPTCHA Admin Checks

Confirm the current Google reCAPTCHA v3 property:

- uses the same site key configured on Vercel
- uses the same secret configured on Render
- allows both:
  - `zeroops.in`
  - `www.zeroops.in`

## Production Verification

1. Open `/book`
2. Confirm there is no `Invalid key type` error
3. Confirm the security copy says verification runs automatically on submit
4. Submit the booking form
5. Open the chatbot and complete a lead submission

## Render Log Meanings

If the issue still happens, inspect Render logs for these lines:

- `RECAPTCHA_SECRET_KEY not configured`
  - Render secret is missing
- `missing-input-secret` or `invalid-input-secret`
  - Render secret is wrong or empty
- `unexpected-hostname`
  - Google token was issued for a host other than `zeroops.in` or `www.zeroops.in`
- `unexpected-action`
  - token action and server-expected action do not match
- `low-score`
  - the v3 token was valid but scored below `RECAPTCHA_MIN_SCORE`
- `invalid-input-response` or `bad-request`
  - Vercel site key and Render secret do not match, or the Google property domain allowlist is wrong
