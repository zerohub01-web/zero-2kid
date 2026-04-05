# Contract/Invoice Resilience Fix Report
Date: 2026-04-05  
Workspace: `C:\Users\nisha\Documents\ZERO\ZERO`

## Root Cause Confirmed
- Shared failure path in contract/invoice operations depended on Puppeteer PDF generation.
- If Chrome/Chromium was unavailable in runtime, PDF generation threw and entire send/sign actions returned 500.

## Implemented Fixes
- Made contract/invoice send flows resilient:
  - PDF generation is now best-effort with warning codes.
  - Email send is now best-effort with warning codes.
  - Response returns success with warnings when non-critical operations fail.
- Made contract/invoice sign flows resilient:
  - Signature save/status update no longer depends on PDF/email success.
  - Signed notification failures no longer block signing.
- Added explicit response `code` values for easier frontend/debug visibility:
  - `contract_sent_with_warnings`, `contract_send_failed`
  - `contract_signed_with_warnings`, `contract_sign_failed`
  - `invoice_sent_with_warnings`, `invoice_send_failed`
  - `invoice_signed_with_warnings`, `invoice_sign_failed`
- Updated PDF utilities to support runtime executable path configuration:
  - `PUPPETEER_EXECUTABLE_PATH`
  - `CHROME_PATH`
- Updated API env example with Puppeteer executable path hints.
- Updated email services to allow sending without PDF attachments when PDF is unavailable.

## Files Changed
- `apps/api/src/controllers/contract.controller.ts`
- `apps/api/src/controllers/invoice.controller.ts`
- `apps/api/src/services/contractEmail.ts`
- `apps/api/src/services/invoiceEmail.ts`
- `apps/api/src/utils/generateContractPDF.ts`
- `apps/api/src/utils/generateInvoicePDF.ts`
- `apps/api/.env.example`

## Verification
- `npm run build --workspace @zero/api` ✅
- `npm run test:unit --workspace @zero/api` ✅ (10/10 tests passed)

## Deployment Notes
- For full PDF generation in production, ensure a Chrome/Chromium binary is present in API runtime and set:
  - `PUPPETEER_EXECUTABLE_PATH=/path/to/chromium` (or `CHROME_PATH`)
- Even if Chrome is unavailable, sign/send actions now degrade gracefully instead of hard failing.
