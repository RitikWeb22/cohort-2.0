
Act as a senior QA engineer + full-stack developer. Audit my ENTIRE "Floorly" web app (a SaaS for freelancers: AI requirement analyzer, proposals, invoices, payments, projects, clients, expenses & profit, pricing rules, templates, settings, landing page, login/register), find every issue, then fix them in priority order. Work in the phases below and do not skip any phase.

## RULES (read first)

- Create a git branch "qa-audit" (or tell me to) before changing anything. Make small, separate commits per fix group with clear messages.
- PHASE 1 AND 2 ARE READ-ONLY: audit and write the report first. Do not change code until the report is done, then fix in the order of the report.
- Never delete user data, migrations or existing records. Never hardcode secrets. Never invent fake data, fake testimonials, fake metrics or fake payment confirmations. If something can't be verified (needs a real account, API key, or a gateway that isn't approved yet), mark it "NOT VERIFIED" in the report instead of guessing.
- Do not redesign. Fix bugs, inconsistencies and gaps only; keep the existing design system: --page #FAF5EA, --surface #FFFFFF, --cobalt #0047AB, --cobalt-dark #003A8C, --cobalt-tint #E8F0FB, --sun #FFC72C, --ink #0E1A2B, --muted #5B6676, --line #E8E0CF; fonts Bricolage Grotesque (headings) and Instrument Sans (body).
- After every fix group, re-run the build, lint, type-check and tests, and re-test the affected flows.

## PHASE 1: INVENTORY AND AUTOMATED CHECKS

1. Map the project: framework, routes, pages, components, API routes/serverless functions, database schema and migrations, auth provider, AI provider calls, payment code, environment variables (list names only, never print values), scheduled jobs/webhooks, file storage, email service. Output a short architecture summary and a list of all routes.
2. Run install, build, lint, type-check and existing tests. List every error and warning. Check for unused dependencies, vulnerable dependencies (npm audit), duplicate packages, and missing lockfile.
3. Search the codebase for: "FreelanceOS"/"freelanceos" leftovers, hardcoded "₹", "INR", "VAT (18%)", "Gupshup", "WhatsApp", "Gemini 3.8" or any hardcoded model names, hardcoded prices/floors/rates (e.g. 300, 250, 3000, 25000, 40/35/25), "TODO", "FIXME", "console.log", "debugger", commented-out code, mock/seed data used in production paths, localhost URLs, API keys or secrets in source, and any purple/indigo/violet color (hex, rgb, Tailwind purple-*/indigo-*/violet-*/ring-indigo etc.).
4. Verify design tokens are used (CSS variables / theme) rather than hardcoded colors, and that fonts load with fallbacks.

## PHASE 2: FLOW AUDIT (test like a real user, record steps, expected vs actual, severity, file/line)

Use a brand-new empty account AND a demo-data account. Test desktop 1366x768, 1920x1080, browser zoom 125%, tablet 768px and mobile 360px. For each page check: loading state, empty state, error state, validation, keyboard use, console errors, network errors (4xx/5xx), page title, broken links, horizontal scroll, text clipping, overlapping elements, and sidebar footer visibility.

A. Public site: landing page (all sections, CTAs, pricing toggle changes prices, FAQ, footer links), /terms, /privacy, /refund-policy (cancellation), /contact (email, phone, address present), 404 page, favicon, meta tags, Open Graph, robots/sitemap, HTTPS/canonical readiness. These legal pages must exist and be reachable from the footer and the signup form.
B. Auth: register, email verification (if present), login, logout, forgot/reset password, Google sign-in (works or is clearly disabled), session expiry, protected routes redirect to login, returning to the intended page after login, duplicate email handling, password rules, rate limiting on login/register, no user enumeration in error messages.
C. Onboarding and Settings: business identity, country, tax label per country (no "VAT" for India), tax ID, payment methods (bank/PayPal/link/UPI only for INR), numbering, defaults, reverse-charge toggle (no raw "true" anywhere), logo upload, notifications, regional settings, demo data load/clear (only demo records), export, delete account, unsaved-changes warning.
D. Pricing rules: validation, one shared pricing function used by simulator, Analyzer, Proposals builder, change orders and server enforcement; check Essential < Standard < Premium, rounding up, floor never bypassed, rules versioning (sent proposals keep their price).
E. Analyzer: paste brief, AI response parsing, invalid-JSON/timeout/retry handling, category mismatch notice, editable hours, confidence values (flag if all identical), floor check card, create proposal from analysis, model name from config, AI keys never exposed to the browser (calls must go through the server).
F. Proposals: builder, totals math, tax, payment schedule sums exactly to total, payment details required before send, send/share link, view tracking, accept/decline, expiry, revision after send, preview/print/PDF (no sidebar/overlay printed, no clipped text, page breaks, page numbers, A4/Letter, no raw keys like "30/40_30", no purple), duplicate IDs, deliverables/hours consistency between Analyzer, builder, list, Projects.
G. Clients: add/edit/archive/delete (blocked when linked records exist), duplicate email, per-client currency and terms, status auto-updates, Billed/Paid/Outstanding match Invoices.
H. Projects: auto-creation when a proposal is accepted (same deliverables, hours, milestones), task board (mouse + keyboard), time logging, effective hourly rate, milestones to invoices (no double invoicing), change orders, status transitions.
I. Invoices: create from milestone and standalone, sequential immutable numbers, send, reminders, status computed (Draft/Sent/Partially paid/Paid/Overdue/Void), record payment dialog (no one-click settle), overpayment blocked, payment ledger single source of truth (KPIs, invoice panel, Payments tab and receipts must agree), void and reissue, client share page, invoice/receipt PDF (same checks as proposal PDF).
J. Expenses and profit: expense CRUD, receipts, recurring, billable pass-through on invoices, profit formulas (revenue excl. tax, direct costs, time cost = logged hours x standard rate), "-" instead of 0% when no revenue, numbers match Dashboard, Projects and Clients.
K. Templates: clause CRUD/reorder/archive, variables resolve (no raw {{...}} on documents), defaultOn drives new proposals, sent proposals snapshot text, message templates feed send/reminder dialogs.
L. Dashboard: KPI numbers reconcile with source pages, empty states, charts with empty data, floor-protection card, next-steps checklist, currency display.
M. Cross-page consistency: the SAME total/hours/tax/currency must appear in Dashboard, Clients, Proposals, Projects, Invoices, PDFs and emails. Build a reconciliation table for the demo account and flag every mismatch. Check currency handling (display currency selector vs document currency, Intl.NumberFormat everywhere, rounding, no float errors; money stored as integer minor units or decimals, never floating math), and date/timezone handling.

## PHASE 3: PAYMENT WORKFLOW AUDIT (two separate systems)

My payment gateway account (Razorpay and/or a Merchant of Record) may NOT be approved yet. Do NOT build a fake checkout or fake confirmations. Audit what exists and make it safe.

SYSTEM 1: Floorly's own subscription billing (users paying me for Starter/Solo/Pro/Agency; USD pricing from a single config; Starter free with 2 active clients; Solo $9 ($7.50 annual), Pro $19 ($15.80 annual), Agency $49 ($40.70 annual)):

- Find all billing code and plan logic. Report what is implemented, what is a stub, and what is missing.
- Plan data lives in ONE config (prices, limits, features) used by the landing page, pricing toggle, Settings > Plan and billing, in-app upgrade prompts and server-side checks.
- Plan limits are enforced on the SERVER (e.g. 2 active clients on Starter, feature gating for Pro/Agency features), not only hidden in the UI. Test by calling the API directly.
- Wrap all gateway code behind an adapter interface (createCheckout, handleWebhook, cancelSubscription, getSubscription) and a feature flag BILLING_ENABLED. When disabled or when keys are missing: upgrade buttons show "Billing opens soon" with a waitlist/contact option, and plan changes are possible only by an admin override (documented) for beta users. No fake "payment successful" states anywhere.
- When a real gateway is configured (Razorpay Subscriptions/Orders or a Merchant of Record like Dodo Payments, Paddle or Polar; keep the adapter generic): verify the checkout flow, success/cancel/failure return pages, webhook endpoint with signature verification, idempotency (processing the same event twice must not double-upgrade), handling of out-of-order events, failed payment/dunning state, cancellation (access until period end), plan change/proration policy, refunds, currency per region, tax/invoice receipts for my customers, and that the success redirect alone NEVER grants a plan (only a verified webhook does). Secrets only in server env vars; webhook URL documented; test mode vs live mode clearly separated.
- Write a short "Billing go-live checklist" file (BILLING_GO_LIVE.md) with exact env vars, webhook URLs, test card/UPI steps and what to verify before switching to live.

SYSTEM 2: My users collecting money from THEIR clients (invoice payments):

- Floorly does NOT hold or process these funds at launch. Verify the app only shows the user's own payment instructions (bank details, PayPal/Stripe/Razorpay link, UPI for INR) and a "Record payment" flow. Remove or hide any button/copy that implies Floorly collects payments ("Pay with Stripe" that doesn't work, "1-Click Settle Full", etc.).
- Payment links entered by users are validated (https, allowed hosts optional), rendered as safe links (rel="noopener noreferrer"), and bank details are masked in the UI, never logged, and access-controlled per user.
- Payment ledger rules: amount > 0, <= balance, correct currency, date not in the far future, delete only the last payment with confirmation, every change recorded in the activity log; invoice status recomputed from the ledger; milestone/project/client/dashboard update consistently.
- Receipts: numbering unique, PDF correct, includes remaining balance.

## PHASE 4: SECURITY, PRIVACY AND DATA

- Authorization: every API route and every database query is scoped to the logged-in user/workspace (try accessing another user's client/proposal/invoice by ID: it must fail). Check Row Level Security or equivalent. Public share links use unguessable tokens, expose only the intended document, are revocable and noindex.
- Input handling: server-side validation for all writes, XSS (escape/sanitize user text in UI, PDFs, emails; clauses and messages are plain text), CSRF where cookies are used, SQL/NoSQL injection, file upload type/size limits, SSRF on any URL fetch, open redirects.
- Secrets and config: no API keys in client bundles (search build output), .env in .gitignore, CORS restricted, security headers (CSP, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy), cookies httpOnly/secure/sameSite, HTTPS only in production.
- AI safety: prompt-injection from pasted client briefs cannot change pricing rules, floors or other users' data; AI output is validated against a schema, and the floor is enforced server-side AFTER the AI responds; rate limit AI endpoints per user and per plan; handle provider errors and cost spikes; log usage without logging full private briefs; no private data sent to the model beyond what is needed.
- Privacy and legal claims: list every claim on the landing page, Terms and Privacy (e.g. "zero training on data", "bank-grade", user counts, logos, testimonials) and mark each VERIFIED / NOT VERIFIED. Remove or flag unverified ones for me. Make sure data export and account deletion work and match what the Privacy Policy says.
- Logging and errors: no stack traces or secrets shown to users; errors are logged server-side; add an error boundary and a friendly fallback page; add basic monitoring hooks (Sentry-ready) without hardcoding DSNs.
- Backups/migrations: confirm migrations run cleanly on an empty database and on an existing one; note the backup/restore status.

## PHASE 5: QUALITY (accessibility, performance, SEO, UX)

- Accessibility: keyboard-only walkthrough of every page and dialog, focus trap/return in modals and drawers, visible 3px cobalt focus rings on :focus-visible only (no heavy black outline on click), labels and aria for every control, aria-live for dynamic totals/toasts, color is never the only status signal, 4.5:1 contrast (including --muted text), prefers-reduced-motion, no scroll-triggered animations, semantic landmarks, one H1 per page, alt text, language attribute. Run axe/Lighthouse and report scores.
- Performance: Lighthouse on landing, login and dashboard (targets: Performance 90+, Accessibility 95+, Best Practices 95+, SEO 100 on public pages); bundle size and code-splitting; lazy-loaded images; font preloading; no layout shift; N+1 queries and slow endpoints; pagination for long lists (clients, proposals, invoices, expenses); debounced search.
- SEO and sharing (public pages only): title and description per page, canonical, Open Graph/Twitter cards, sitemap.xml, robots.txt (block app routes and share links), JSON-LD SoftwareApplication with offers matching the real pricing config.
- Consistency: one page layout scale (page padding 32px, H1 30px, subtitle 15px, card padding 24px, inputs 40-44px), one StickySaveBar that never overlaps the sidebar, sidebar footer (Settings and user card) always visible and pinned, nav list scrollable with a bottom fade, document.title per page, sentence-case labels, no ALL-CAPS, no monospace, no purple anywhere.
- Copy: English only and global; no India-only wording on global screens (UPI, GST, Razorpay appear only when country/currency is India); no developer-only jargon on customer-facing screens; button labels say what happens.

## PHASE 6: FIX AND VERIFY

- Produce the report first (format below), then fix in this priority order: (1) Critical: data loss, security holes, wrong money calculations, auth bypass, double-charging/double-crediting, fake payment states, secrets exposed; (2) High: totals mismatching across pages, broken core flows, PDFs wrong or clipped, plan limits not enforced server-side, missing legal pages; (3) Medium: accessibility, validation gaps, empty/error states, responsiveness, performance; (4) Low: copy, polish, leftover purple, console warnings.
- Add automated tests for the money logic (pricing pipeline, totals, tax, schedule sums, ledger/status transitions, plan limits, webhook idempotency with mocked events) and a small end-to-end smoke test (register -> set floor -> analyze brief -> create proposal -> accept -> project created -> invoice milestone -> record payment -> profit updates). Use mocks for the AI and the gateway; never call live payment endpoints with real money.
- If a fix is large or risky, don't do it silently: describe it, propose the safest approach and wait for my confirmation. Ask me at most 5 clarifying questions in ONE message when you are blocked.

## REPORT FORMAT (create QA_REPORT.md and also summarize in chat)

1. Summary: overall health score (0-10), counts by severity, top 10 risks.
2. Architecture and route map (short).
3. Findings table: ID, severity (Critical/High/Medium/Low), area, page/route, what is wrong (expected vs actual), steps to reproduce, file(s)/line(s), fix status (Fixed / Needs my decision / NOT VERIFIED).
4. Reconciliation table for the demo account: the same metrics across Dashboard, Clients, Proposals, Projects, Invoices, Expenses and PDFs, with any mismatch highlighted.
5. Payment workflow section: what exists, what is stubbed, what is unsafe, what was fixed, what must be done before going live (link to BILLING_GO_LIVE.md).
6. Security checklist with pass/fail per item.
7. Lighthouse and axe results before/after.
8. List of unverified marketing/legal claims.
9. Items that need me: env vars, gateway approval, legal review of clauses and policies, real testimonials, logo/screenshots, email service, file storage, domain, DNS.
10. Files changed (grouped by commit) and how to run all tests.

Finally: run build, lint, type-check and all tests, then do a last manual pass on the 10 most important flows and report anything still failing. Do not claim something is fixed unless you re-tested it.
