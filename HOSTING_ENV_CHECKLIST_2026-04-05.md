# Hosting Environment Checklist
Date: 2026-04-05

## CAPTCHA Fix Status

The live CAPTCHA failure has two parts:

1. The current Google site key is a **v3 key**, so it cannot render a visible checkbox.
2. The frontend now supports **both** modes:
   - `NEXT_PUBLIC_RECAPTCHA_MODE=v3` for the current production key
   - `NEXT_PUBLIC_RECAPTCHA_MODE=checkbox` if you later create a proper v2 checkbox key pair

## Vercel (`apps/web`) — Add These

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

## Render (`apps/api`) — Add These

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

- `CLIENT_ORIGIN=https://www.zeroops.in`
- `WEB_BASE_URL=https://www.zeroops.in`
- `RECAPTCHA_MIN_SCORE=0.5`

## CAPTCHA Mode Rules

### Use this now

- Keep your current Google **v3** key pair
- Set:
  - Vercel: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<current site key>`
  - Vercel: `NEXT_PUBLIC_RECAPTCHA_MODE=v3`
  - Render: `RECAPTCHA_SECRET_KEY=<matching v3 secret>`
  - Render: `RECAPTCHA_MIN_SCORE=0.5`

### Use this later if you want the visible checkbox again

- Create a new Google reCAPTCHA **v2 checkbox** key pair
- Replace:
  - Vercel: `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=<new v2 checkbox site key>`
  - Vercel: `NEXT_PUBLIC_RECAPTCHA_MODE=checkbox`
  - Render: `RECAPTCHA_SECRET_KEY=<matching v2 checkbox secret>`

## Production Verification

1. Open `/book`
2. Confirm there is no `Invalid key type` error
3. Submit the form
4. Confirm booking is accepted
5. Open the chatbot and complete a lead submission
6. Confirm Render logs do not show:
   - `RECAPTCHA_SECRET_KEY not configured`
   - `missing-input-secret`
   - `invalid-input-secret`
