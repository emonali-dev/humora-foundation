# HUMORA FOUNDATION – Website

**A Little Help, A Brighter Future. · ছোট্ট সহযোগিতা, সুন্দর ভবিষ্যৎ।**

Premium bilingual (English / বাংলা) website and secure admin dashboard for HUMORA FOUNDATION.

- **Public website:** Home, About Us, Activities (+ details), Our Impact, Donate, Transparency, Contact, Privacy Policy, Terms & Conditions, 404.
- **Admin dashboard (`/admin/`):** 14 modules with role-based access, Bangla and English.
- **Backend:** Supabase (PostgreSQL + Row Level Security, Auth, Storage, one Edge Function).
- **Hosting:** Vercel (free tier). No build step and no paid dependencies.

> Built as a fast static site with plain HTML, CSS and JavaScript modules instead of Next.js. The development environment had no package installs, and the owner chose this approach so every feature could be tested. All requirements are covered: bilingual UI, translated database content, SEO metadata, RLS security and admin CRUD. The code can be moved to Next.js later; the database does not change.

---

## 1. Project structure

```
index.html, about/, activities/, activities/view/, impact/, donate/,
transparency/, contact/, privacy/, terms/, 404.html   ← generated pages
admin/index.html                                       ← admin dashboard
assets/css/site.css, assets/css/admin.css              ← design system
assets/js/app.js        language, layout, data helpers
assets/js/main.js       public page logic
assets/js/admin.js      admin dashboard
assets/js/strings.js    all English + Bangla text (keys "c.*" are admin-editable)
assets/js/config.js     public Supabase URL + publishable key
assets/img/             logo, favicon, icons, Open Graph image
tools/build_pages.py    regenerates the HTML pages from one template
supabase/migrations/    database schema, RLS, functions, storage
supabase/functions/humora-admin/   Edge Function to create admin accounts
supabase/tests/humora_rls_tests.sql  database security tests
tests/browser_test.py   end-to-end UI test (Playwright, mocked Supabase)
vercel.json             security headers (CSP, HSTS …) and caching
sitemap.xml, robots.txt, site.webmanifest
```

## 2. Brand

| Token | Value |
|---|---|
| Navy Blue | `#102B46` |
| Humanitarian Green | `#16866B` |
| Warm Gold | `#EBC77C` |
| Background | `#F7F8FA` |
| Fonts | Inter (English), Hind Siliguri (Bangla) |

The logo (`assets/img/logo.svg`, `logo-light.svg`, `logo-mark.svg`) is a heart made of navy and green halves holding a gold person, a symbol of care and hope.

## 2a. Photography

- Illustrative humanitarian photos (Pexels licence: free for commercial use) are listed in `assets/js/photos.js`. They appear in the Hero, Mission, About, Activities, Donation and inner-page headers.
- Each one is labelled **“Illustrative photo / প্রতীকী ছবি”** and credits the photographer. A note in the footer explains that these photos do not show HUMORA's own work.
- Photos are served responsively from the Pexels CDN (`srcset`, compressed, cropped to size). They are lazy-loaded below the fold, and the hero image is preloaded.
- Real photos uploaded in the admin replace the stock images and carry no label: Settings → hero/about photo, and Activities.

## 3. Bilingual system

- The language switcher (English | বাংলা) is in the header and in the mobile menu.
- The choice is saved in `localStorage` and in the URL (`?lang=bn`), so it is kept on every page and links can be shared.
- `<html lang>`, the title, the description, Open Graph locale, canonical and `hreflang` alternates are updated for each language. The sitemap lists both versions.
- Dates, numbers and currency use `Intl` (`bn-BD` gives Bangla digits).
- Database content has `_en` / `_bn` columns: activities, gallery, founders, testimonials, payment methods and reports.
- Admins can edit every website text in both languages under **Language Content**. Empty values fall back to the built-in text.

## 4. Database (Supabase)

Tables (all prefixed `humora_`): `profiles`, `settings`, `content`, `founders`, `activities`, `gallery`, `testimonials`, `impact_statistics`, `payment_methods`, `donations`, `income`, `expenses`, `financial_reports`, `contact_messages`, `audit_logs`, `rate_limits`.

**Security model**
- RLS is enabled on every table.
- Anonymous visitors can only read published content.
- Visitors submit donations and messages only through validated, rate-limited functions (`humora_submit_donation`, `humora_submit_payment_reference`, `humora_submit_contact`), protected by a honeypot field and 5 requests per hour per IP.
- Public impact numbers come from `humora_public_impact()`. Values appear only after an admin marks them verified; until then the site shows "Coming Soon".
- Public finance comes from `humora_public_finance()`. It includes only verified donations, verified income and approved expenses as totals. Donor data is never public.

**Roles**

| Role | Access |
|---|---|
| `super_admin` | everything, including admin users |
| `admin` | content, finance, messages, audit |
| `editor` | content, messages |
| `finance` | donations, income, expenses, reports, payment instructions |

- Triggers stamp `verified_by` / `approved_by` with the real signed-in admin, so these values cannot be spoofed.
- Every admin change is written to `humora_audit_logs`. Financial tables store the full before/after row.
- The last super admin cannot be removed.
- Storage: `humora-media` (public images and published PDFs) and `humora-receipts` (private; finance only, opened with signed links). Files must be JPG/PNG/WEBP/PDF, up to 5 MB.

## 5. Deployment (free tier)

### 5.1 Supabase
1. Create a project, or use an existing one. All objects are prefixed `humora_`.
2. Run the migrations in order: SQL editor → paste each file in `supabase/migrations/`, or use `supabase db push`.
3. Deploy the Edge Function: `supabase functions deploy humora-admin`.
4. Set the allowed origins: `supabase secrets set HUMORA_ALLOWED_ORIGINS=https://your-domain`.
5. Create the first admin: Authentication → Users → Add user (with email and password). Then run `supabase/seed/bootstrap_super_admin.sql` with that email.
6. Authentication → URL Configuration: add `https://YOUR-DOMAIN/admin/` to **Redirect URLs** so password-reset links work.
7. Optional: run `supabase/tests/humora_rls_tests.sql`. It must end with `HUMORA_TESTS_PASSED`; all test data is rolled back.

### 5.2 Configure the site
Edit `assets/js/config.js`:
- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY` (Project Settings → API keys → publishable key)
- `SITE_URL` (your final domain)

If the domain is not `humora-foundation.vercel.app`, also replace it in `tools/build_pages.py`, `robots.txt` and `sitemap.xml`, then run `python3 tools/build_pages.py`. If the Supabase project changes, update its host in `vercel.json`.

### 5.3 Vercel
1. On vercel.com: **Add New → Project → Import** `emonali-dev/humora-foundation`.
2. Framework preset: **Other**. Leave the build command empty. Output directory: `.` (the root).
3. Deploy. Every push to `main` redeploys automatically.
4. Optional: Settings → Domains → add your own domain. Then update `SITE_URL` and the origins as described above.

**Secrets:** none are needed on Vercel. The service-role key is used only inside the Supabase Edge Function, and Supabase injects it automatically. Never commit `.env` files (`.gitignore` already blocks them).

## 6. What the foundation still needs to provide

Nothing below has been invented; each item stays empty or hidden until it is entered in the admin panel. The Dashboard lists whatever is still missing.

| Information | Where to enter it |
|---|---|
| Contact email, phone, WhatsApp, address | Website Content → Settings |
| Social media links | Website Content → Settings |
| Verified payment accounts (bKash/Nagad/bank) and instructions | Payment Instructions (mark *Verified* + *Active*) |
| Founder names, roles, photos, bios | Website Content → Founders |
| Real hero/about photographs (with permission) | Website Content → Settings |
| Verified activities with real photos | Activities, Gallery |
| Verified impact statistics | Impact Statistics |
| Testimonials (with consent) | Website Content → Testimonials |
| Financial statements (PDF) | Financial Reports |
| Registration information (if registered) | Website Content → Settings |
| Legal review of the Privacy Policy & Terms | Language Content → `c.privacy.body`, `c.terms.body` |

## 7. Donations workflow

1. A donor chooses BDT or USD, picks a suggested or custom amount, and enters their details. The form shows only the verified payment methods.
2. The donor receives a reference such as `HF-1A2B3C4D`. The status is **Pending**, or **Payment Submitted** if a transaction reference was entered.
3. The donor can add a transaction reference later on the Donate page, using the reference and their email.
4. A finance admin confirms the money arrived, then marks the donation **Verified** (or **Rejected**). Only verified donations count in the public totals.
5. The website never claims automatic payment processing. To add a payment gateway later, create it as a new Edge Function that inserts into `humora_donations` and sets `status` after the gateway's webhook confirms payment. The table already stores `payment_method`, `transaction_reference` and the status lifecycle.

## 8. Development

```bash
python3 -m http.server 8080        # then open http://localhost:8080
python3 tools/build_pages.py       # after editing page templates or English defaults
python3 tests/browser_test.py      # UI tests (needs Playwright + Chrome)
```

See `TESTING_REPORT.md` for the latest results.
