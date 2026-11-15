# HUMORA FOUNDATION – Testing Report

Date: 15 November 2026

## 1. Database security tests — 25/25 passed
Test file: `supabase/tests/humora_rls_tests.sql`. It ran against the live Supabase project, and all test data was rolled back afterwards.

| Area | Result |
|---|---|
| Anonymous visitors cannot read donations, contact messages or audit logs | ✅ |
| Anonymous visitors cannot create activities or change settings | ✅ |
| Donation submission, honeypot, server-side validation (email, currency, amount) | ✅ |
| Adding a payment reference works with the correct email; a wrong email is rejected | ✅ |
| Contact form submission and rate limiting (5 per hour per IP) | ✅ |
| Unverified donations are excluded from public totals | ✅ |
| Unverified impact numbers are hidden | ✅ |
| Editor: can manage content, cannot see donations, cannot raise own role | ✅ |
| An activity cannot be published without a photo | ✅ |
| Finance: can verify donations; `verified_by` is stamped automatically and cannot be spoofed | ✅ |
| Finance: `approved_by` on expenses is forced to the signed-in admin | ✅ |
| Finance: cannot edit website content or read messages | ✅ |
| Public totals show verified donations and approved expenses correctly | ✅ |
| Financial changes are written to the audit log | ✅ |
| The last super admin cannot be demoted | ✅ |

Supabase security advisor: every warning for HUMORA objects has been fixed or is intentional. The public RPCs and `humora_can`/`humora_is_admin` (used inside RLS policies) are meant to be callable.

## 2. Browser tests — 687/687 checks passed
Test file: `tests/browser_test.py`. It runs Playwright and Chrome with the production Content-Security-Policy. Supabase is replaced by an in-memory mock (`tests/mock-supabase.js`), because the test machine has no outbound network.

- **Every page** (10 pages × 2 languages × desktop 1280px / mobile 390px):
  - an `h1` renders
  - `<html lang>` is correct
  - no untranslated keys
  - no English buttons in Bangla mode
  - no broken images
  - no horizontal overflow
  - every internal link resolves
  - no console or CSP errors
- **Mobile menu:** opens, closes with Escape, and switches language. The language is remembered across pages.
- **Donate:**
  - required-field and email validation work
  - successful submission shows the reference and the correct status
  - adding a reference works, with both the "not found" and success cases
- **Contact:** validation, successful send, and the WhatsApp link built from settings.
- **Activity details:** an invalid id is handled gracefully.
- **Impact:** a verified value shows a number; unverified values show "Coming Soon".
- **404 page:** renders.
- **Illustrative photos:** every stock photo on the Home and About pages carries the “Illustrative photo” label. A failed external image falls back to the neutral placeholder.
- **Admin, in English and Bangla:**
  - login screen; a wrong password is rejected
  - the dashboard loads and all 14 modules render
  - donation verification works
  - required fields are enforced
  - sign out works

## 3. Not tested here (requires deployment)
- Real network calls from a browser to Supabase. The SQL behind them was tested directly, as listed above.
- Real file uploads to Supabase Storage. Bucket and policy creation was confirmed.
- Password-reset emails. They need the redirect URL added in Supabase Auth settings.
- Vercel header delivery and Lighthouse/Core Web Vitals scores. Run them after the first deployment.
