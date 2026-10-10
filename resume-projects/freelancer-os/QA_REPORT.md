# Floorly (FreelanceOS) Comprehensive QA Audit Report

**Audit Date:** October 11, 2026  
**Auditor:** Senior QA Engineer & Full-Stack Systems Auditor  
**Audit Branch:** `qa-audit`  
**Current Phase:** Phase 1 & Phase 2 Complete (Read-Only Audit & Reporting)

---

## 1. Executive Summary

- **Overall Platform Health Score:** **7.4 / 10**
- **Findings by Severity:**
  - **Critical (P0):** 3
  - **High (P1):** 6
  - **Medium (P2):** 8
  - **Low (P3):** 7
- **Total Tracked Findings:** 24

### Top 10 Risks

1. **Unprotected Git Environment & Missing `.gitignore`:** Neither the project directory nor root has a `.gitignore` file, exposing `.env` (containing `JWT_SECRET`, database URIs, API keys) to accidental Git commits.
2. **Client Proposals Inaccessible to External Clients:** Proposal routes (`/proposals/:id`) and API endpoints require authenticated freelancer sessions. When a prospective client opens a private link, they are redirected to `/login`, making external proposal sharing impossible.
3. **Unrestricted Plan Limit Bypass on the Server:** While the UI indicates a limit of 2 active clients on the free Starter tier, `POST /api/v1/clients` lacks server-side enforcement of `maxClients`, allowing arbitrary client creation via direct API calls.
4. **Unsafe Fake Subscription Upgrades:** When Stripe keys are missing, calling `/api/v1/subscription/create-checkout-session` or `/change-plan` grants instant full paid tier access in "sandbox demo mode" without admin checks or gateway confirmation.
5. **Simulated Fake Checkout URL on Invoices:** Invoices route generates a mock link (`?mock_stripe_checkout=...`) implying Floorly processes end-client funds directly.
6. **"1-Click Settle Full" End-Client Payment Bypass:** Invoices module includes a 1-click settlement endpoint (`POST /invoices/:id/settle`) that marks arbitrary balances as settled without recording transaction references or authenticating receipts.
7. **No React Error Boundary:** If any client component throws an uncaught JavaScript error, the entire application crashes to a blank white screen.
8. **Simulated Forgot Password Without Backend Endpoint:** `ForgotPasswordPage.jsx` uses `setTimeout` to simulate sending a reset link without connecting to a server endpoint or emailing tokens.
9. **Hardcoded Fictitious AI Model (`gemini-3.8-flash`):** `aiAnalyzer.js` contains `'gemini-3.8-flash'` in its model fallback cascade.
10. **Leftover Purple/Indigo CSS:** `ProjectsPage.jsx` retains `from-white to-indigo-50/30`, `text-indigo-700`, and `bg-indigo-50`.

---

## 2. Architecture & Route Map

### 2.1 Tech Stack Summary
- **Frontend:** React 18, Vite 6, Tailwind CSS, React Router v6, TanStack React Query, Zustand, Lucide React, Recharts.
- **Backend:** Node.js (ES modules), Express.js 4, Mongoose 8 (MongoDB Atlas), Pino logging, Bcrypt.js, JsonWebToken, Stripe SDK, Google Generative AI SDK (`@google/generative-ai`), Puppeteer-core.
- **Design Tokens:** `--page #FAF5EA`, `--surface #FFFFFF`, `--cobalt #0047AB`, `--cobalt-dark #003A8C`, `--cobalt-tint #E8F0FB`, `--sun #FFC72C`, `--sun-tint #FFF4CC`, `--ink #0E1A2B`, `--muted #5B6676`, `--line #E8E0CF`, `--success #067647`, `--warning #B54708`, `--error #B42318`.
- **Typography:** Bricolage Grotesque (Headings & Card Titles), Instrument Sans (Body, Meta, Inputs).

### 2.2 Frontend Routes
| Route | Access | Component | Purpose |
| :--- | :--- | :--- | :--- |
| `/` | Public | `LandingPage` | Marketing landing page with interactive calculator & pricing toggle |
| `/login` | Public | `AuthPage` | Freelancer login (redirects to `/dashboard` if authenticated) |
| `/signup` | Public | `AuthPage` | Freelancer registration |
| `/forgot-password` | Public | `ForgotPasswordPage` | Password recovery |
| `/terms` | Public | `TermsPage` | Terms of service |
| `/privacy` | Public | `PrivacyPage` | Privacy policy & data ownership commitments |
| `/refund`, `/refund-policy` | Public | `RefundPage` | Cancellation & refund policy |
| `/contact` | Public | `ContactPage` | Contact desk & message form |
| `/dashboard` | Protected | `DashboardPage` | Executive revenue, cash flow, receivables & floor protection KPIs |
| `/analyzer` | Protected | `AnalyzerPage` | AI requirement extraction & deterministic pricing recommendation |
| `/proposals` | Protected | `ProposalsPage` | Proposals directory with status filters & PDF generation |
| `/proposals/new` | Protected | `ProposalBuilderPage` | Proposal builder (5-step accordion, live terms variable resolver) |
| `/proposals/:id/edit` | Protected | `ProposalBuilderPage` | Proposal revision & draft editing |
| `/proposals/:id` | Protected | `ProposalBuilderPage` | Proposal detail & approval view |
| `/clients` | Protected | `ClientsPage` | CRM client directory with live aggregated financials |
| `/clients/:id` | Protected | `ClientDetailPage` | Client dossier with project, invoice, and note history |
| `/projects` | Protected | `ProjectsPage` | Project delivery, task board, and time tracking |
| `/invoices` | Protected | `InvoicesPage` | Invoicing, payment ledger, and reminders modal |
| `/expenses` | Protected | `ExpensesPage` | Expense logger, time cost valuation, and gross profit analytics |
| `/templates` | Protected | `TemplatesPage` | Editable clause library (8 categories) & 7 email message templates |
| `/pricing-rules` | Protected | `PricingRulesPage` | Rate configuration, floor boundaries, and live simulator |
| `/agents-doc` | Protected | `AgentsDocPage` | Client-specific `AGENTS.md` context instructions generator |
| `/settings`, `/settings/:section`| Protected | `SettingsPage` | Studio identity, documents, payments, regional, plans, privacy |
| `/proposals/:id/print` | Protected | `ProposalPrintPage` | Dedicated print & PDF layout for proposals |
| `/invoices/:id/print` | Protected | `InvoicePrintPage` | Dedicated print & PDF layout for tax invoices |
| `/invoices/payments/:paymentId/print` | Protected | `PaymentReceiptPrintPage` | Dedicated print & PDF layout for payment receipts |
| `*` | Catch-all | `<Navigate to="/" />` | Wildcard route currently redirects to `/` instead of a 404 page |

### 2.3 Backend API Endpoints (`/api/v1`)
| Group | Path | Methods | Auth Scoped |
| :--- | :--- | :--- | :--- |
| **Auth** | `/auth/register`, `/auth/login`, `/auth/me`, `/auth/profile`, `/auth/change-password`, `/auth/delete-account`, `/auth/export-data` | POST, GET, PATCH | Yes (`userId`) |
| **Clients** | `/clients`, `/clients/:id`, `/clients/:id/notes`, `/clients/:id/archive` | GET, POST, PATCH, DELETE | Yes (`userId`) |
| **Analyses** | `/analyses`, `/analyses/:id`, `/analyses/:id/approve` | GET, POST, PATCH | Yes (`userId`) |
| **Pricing** | `/pricing/settings`, `/pricing/calculate`, `/pricing/validate-quote` | GET, PATCH, POST | Yes (`userId`) |
| **Proposals**| `/proposals`, `/proposals/:id`, `/proposals/:id/pdf` | GET, POST, PATCH, DELETE | Yes (`userId`) |
| **Projects** | `/projects`, `/projects/:id`, `/projects/:id/tasks`, `/projects/:id/time-logs`, `/projects/:id/change-orders` | GET, POST, PATCH, DELETE | Yes (`userId`) |
| **Invoices** | `/invoices`, `/invoices/:id`, `/invoices/:id/payments`, `/invoices/:id/settle`, `/invoices/:id/pdf`, `/invoices/payments/:id/receipt`, `/invoices/payments/:id/pdf` | GET, POST, PATCH, DELETE | Yes (`userId`) |
| **Expenses** | `/expenses`, `/expenses/:id`, `/expenses/summary` | GET, POST, PATCH, DELETE | Yes (`userId`) |
| **Templates**| `/templates/clauses`, `/templates/clauses/:id`, `/templates/clauses/reorder`, `/templates/starter-library`, `/templates/messages`, `/templates/messages/:key` | GET, POST, PATCH, DELETE | Yes (`userId`) |
| **Subscription** | `/subscription/status`, `/subscription/create-checkout-session`, `/subscription/change-plan`, `/subscription/verify-session` | GET, POST | Yes (`userId`) |
| **Agents Doc** | `/agents-doc/generate`, `/agents-doc/:id` | GET, POST | Yes (`userId`) |
| **Dashboard**| `/dashboard/metrics`, `/dashboard/chart-data` | GET | Yes (`userId`) |
| **Demo** | `/demo/seed`, `/demo/clear` | POST | Yes (`userId`) |

---

## 3. Findings Table

| ID | Severity | Area | Page/Route | Expected vs Actual | Steps to Reproduce | File(s) / Line(s) | Fix Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | **Critical** | Security | Git Repo | `.env` must never be tracked or untracked without `.gitignore`. Currently `.gitignore` is completely missing from `freelancer-os`. | Run `git status` from repo root; observe untracked `.env`. | `/.gitignore` (missing) | Needs Fix |
| **SEC-02** | **Critical** | Auth / Sharing | `/proposals/:id` | Clients must be able to view shared proposals via an unguessable token without logging in. Currently wrapped in `<ProtectedRoute>` and requires freelancer JWT. | Send link to external incognito window; client gets forced to `/login`. | `client/src/App.jsx:109`, `server/src/routes/proposals.js:14` | Needs Fix |
| **SEC-03** | **Critical** | Billing | `/api/v1/clients` | Starter plan limit of 2 active clients must be enforced on the server. Currently `POST /api/v1/clients` has no check on `maxClients`. | Send `POST /api/v1/clients` 5 times with a free account; all 5 clients are created. | `server/src/routes/clients.js:132-171` | Needs Fix |
| **PAY-01** | **High** | Billing | `/subscription` | Gateways without API keys should show "Billing opens soon". Currently calling `/create-checkout-session` grants free instant upgrades via fake demo mode. | Click upgrade to Pro without Stripe keys configured; account is marked paid immediately. | `server/src/routes/subscription.js:120-146` | Needs Fix |
| **PAY-02** | **High** | Invoices | `/invoices` | Platform must not imply it processes end-client funds. Currently generates a fake `mock_stripe_checkout` URL and has a "1-Click Settle Full" button. | Select invoice with balance due; observe "1-Click Settle Full" button and mock checkout link. | `client/src/pages/InvoicesPage.jsx:660`, `server/src/routes/invoices.js:426,667` | Needs Fix |
| **ROU-01** | **High** | Routing | `/*` | Unknown routes should render a dedicated 404 Not Found page with navigation back home. Currently redirects silently to `/`. | Navigate to `http://localhost:5173/non-existent-page`. URL reverts to `/`. | `client/src/App.jsx:150` | Needs Fix |
| **ERR-01** | **High** | Reliability | Entire App | A React ErrorBoundary must catch runtime UI errors and render a friendly fallback page. Currently absent. | Throw an error in any child component; entire screen goes blank. | `client/src/App.jsx:1` | Needs Fix |
| **AUT-01** | **High** | Auth | `/forgot-password` | Password reset must connect to a secure token endpoint. Currently `ForgotPasswordPage` simulates submission via `setTimeout` with no backend route. | Submit email on `/forgot-password`; no network call is dispatched. | `client/src/pages/ForgotPasswordPage.jsx:20-24` | Needs Fix |
| **AI-01** | **High** | AI Engine | `/analyzer` | Model fallback cascade must only use valid, provider-supported models. Currently includes fictitious `'gemini-3.8-flash'`. | Inspect `aiAnalyzer.js` candidate models array. | `server/src/services/aiAnalyzer.js:50` | Needs Fix |
| **ROU-02** | **Medium** | Auth | `/login` | When redirected from a protected route to `/login`, app should remember intended destination and redirect back upon login. Currently defaults to `/dashboard`. | Open `/settings` while unauthenticated, sign in, redirected to `/dashboard` instead of `/settings`. | `client/src/App.jsx:55`, `client/src/pages/AuthPage.jsx` | Needs Fix |
| **CON-01** | **Medium** | Public Site | `/contact` | Contact page must have real support details. Currently contains raw placeholder string `support@floorly.com [OR_YOUR_EMAIL_HERE]`. | Open `/contact`, look at email channel card. | `client/src/pages/ContactPage.jsx:93,103,113` | Needs Fix |
| **CON-02** | **Medium** | Public Site | `/contact` | "Frequently Asked" heading on contact page has empty content beneath it. | Open `/contact`, look at sidebar FAQ box. | `client/src/pages/ContactPage.jsx:122-125` | Needs Fix |
| **LEG-01** | **Medium** | Public Site | `/privacy` | Privacy policy layout skips from Section 2 to Section 4 (Section 3 header is styled inconsistently or missing in flow). | Open `/privacy`, view numbering. | `client/src/pages/PrivacyPage.jsx:70` | Needs Fix |
| **LEG-02** | **Medium** | Public Site | `/refund-policy` | Refund policy skips from Section 3 to Section 5. | Open `/refund-policy`, view numbering. | `client/src/pages/RefundPage.jsx:72` | Needs Fix |
| **LEG-03** | **Medium** | Public Site | Public Pages | Email addresses are inconsistent across pages (`@floorly.ai` in body copy vs `@floorly.com` in footer). | Compare contact footer with privacy body text. | `PrivacyPage.jsx`, `TermsPage.jsx`, `Footer.jsx` | Needs Fix |
| **SEO-01** | **Medium** | SEO | Root / Public | Public pages need `robots.txt` (blocking internal app routes) and `sitemap.xml`. Currently `client/public` directory is missing. | Navigate to `/robots.txt`; returns index.html or 404. | `client/public` (missing) | Needs Fix |
| **SEC-04** | **Medium** | Security | Express Headers | Missing Content-Security-Policy (CSP) headers on API responses. | Inspect response headers on `/api/v1/auth/me`. | `server/src/middleware/security.js:43-58` | Needs Fix |
| **UI-01** | **Low** | Design Tokens | `/projects` | Design system rule prohibits purple/indigo. `ProjectsPage.jsx` contains leftover `from-white to-indigo-50/30`, `text-indigo-700`, `bg-indigo-50`. | Open `/projects`, inspect cards. | `client/src/pages/ProjectsPage.jsx:861-864` | Needs Fix |
| **UI-02** | **Low** | Branding | `server/package.json` | Leftover project name `"name": "freelanceos-server"` in package.json. | Inspect `server/package.json`. | `server/package.json:2` | Needs Fix |
| **UI-03** | **Low** | Auth Storage | `useAuthStore.js` | Legacy key references `freelanceos_token`. | Search for `freelanceos_token`. | `client/src/store/useAuthStore.js:5-12` | Needs Fix |
| **CFG-01** | **Low** | Plan Config | Landing / Settings | Plan configuration object is duplicated between `LandingPage.jsx` and `server/src/config/plans.js`. Should be unified into a single client config. | Compare plan limits in `LandingPage.jsx` with `server/src/config/plans.js`. | `client/src/pages/LandingPage.jsx:19-78` | Needs Fix |
| **INR-01** | **Low** | Localization | `/invoices` | Server invoice instruction defaults to hardcoded `Scan UPI QR or complete Razorpay payment for ₹...` in `invoices.js`. | Inspect `server/src/routes/invoices.js:622`. | `server/src/routes/invoices.js:622` | Needs Fix |
| **SEC-05** | **Low** | Security | NPM Audit | 9 vulnerabilities in client dependencies (`braces`, `postcss-selector-parser`, `react-router`), 3 in server (`tinypool`, `vitest`). | Run `npm audit` in client and server. | `package-lock.json` | Needs Fix |
| **TEST-01** | **Low** | Testing | Test Suite | Only 7 unit tests exist (`pricingEngine.test.js`). Need automated tests for money logic, plan limits, and ledger math. | Run `npm test` in server. | `server/src/services/` | Needs Fix |

---

## 4. Financial Reconciliation Table (Demo Account)

The demo dataset was loaded via `/settings/data-and-privacy` to verify ledger consistency across modules:

| Metric | Dashboard Value | Ledger / Module Value | Originating Source | Reconciliation Status |
| :--- | :---: | :---: | :--- | :---: |
| **Total Contracted Revenue** | **$16,500** | **$16,500** | 3 Active Projects: Apex Storefront ($8,500) + Fintech Portal ($4,800) + Brand Redesign ($3,200) | **MATCH (Exact)** |
| **Total Invoiced** | **$11,475** | **$11,475** | Sum of 5 issued invoices (INV-2026-001 through INV-2026-005) | **MATCH (Exact)** |
| **Cash Collected (Paid)** | **$5,825** | **$5,825** | Sum of 3 recorded payments in ledger | **MATCH (Exact)** |
| **Outstanding Receivables** | **$5,650** | **$5,650** | $11,475 total billed minus $5,825 paid | **MATCH (Exact)** |
| **Overdue Balance** | **$1,625** | **$1,625** | INV-2026-005 ($1,625, due Oct 6, 2026) | **MATCH (Exact)** |
| **Active Clients** | **3** | **3** | Apex Dynamics, Horizon Fintech, Solaria Labs | **MATCH (Exact)** |
| **Active Projects** | **3** | **3** | 3 In-Progress Projects | **MATCH (Exact)** |
| **Direct Project Expenses** | **$418** | **$418** | Hosting ($49), Domain ($19), Asset License ($150), Cloud DB ($200) | **MATCH (Exact)** |
| **Time Cost Valuation** | **$2,100** | **$2,100** | 42 logged hours × $50.00 standard rate | **MATCH (Exact)** |
| **Estimated Net Profit** | **$3,307** | **$3,307** | $5,825 collected minus $418 expenses minus $2,100 time cost | **MATCH (Exact)** |

*Result:* No financial drift, rounding errors, `NaN`, or floating point calculation bugs were detected in the demo financial dataset.

---

## 5. Payment Workflow Audit

### 5.1 System 1: Floorly's Own Subscription Billing
- **What Exists:**
  - Config file `server/src/config/plans.js` defines Starter ($0), Solo ($9/mo, $7.50 annual), Pro ($19/mo, $15.80 annual), and Agency ($49/mo, $40.70 annual).
  - Stripe SDK integration initialized in `server/src/routes/subscription.js`.
- **What is Unsafe / Stubbed:**
  - Calling `/subscription/create-checkout-session` without Stripe credentials triggers an automatic "instant demo upgrade", upgrading users to Pro/Agency for free.
  - The `/subscription/verify-session` endpoint validates upon browser redirect instead of relying strictly on an authenticated, idempotent webhook.
  - No gateway adapter abstraction exists (hardcoded to Stripe; no Razorpay / Dodo / Paddle / Polar adapter).
  - Feature flag `BILLING_ENABLED` is missing.
- **What Must Be Done:**
  - Introduce `BILLING_ENABLED` flag. If `false` or if gateway keys are missing, upgrade buttons show "Billing opens soon" with waitlist/contact options.
  - Create generic payment gateway adapter interface (`createCheckout`, `handleWebhook`, `cancelSubscription`).
  - Enforce plan limits on the server (specifically `maxClients = 2` on Starter tier in `POST /api/v1/clients`).
  - Create [BILLING_GO_LIVE.md](file:///d:/whats-matter-series/cohort-2.0%20restart/resume-projects/freelancer-os/BILLING_GO_LIVE.md) detailing exact env vars, webhooks, and go-live checklist.

### 5.2 System 2: Freelancers Collecting Invoices from Their Clients
- **What Exists:**
  - Offline payment instruction display (Bank/IBAN/SWIFT, PayPal link, UPI).
  - "Record Payment" dialog that validates positive amounts and prevents overpayments exceeding balance due.
  - Single source of truth ledger updating invoice status (`paid` vs `partial`).
- **What is Unsafe / Stubbed:**
  - "1-Click Settle Full" button in `InvoicesPage.jsx` and endpoint `POST /invoices/:id/settle` bypasses payment proof collection.
  - Server returns a mock demo Stripe link (`?mock_stripe_checkout=...`) which misleads users into thinking Floorly collects and escrows client funds.
- **What Must Be Done:**
  - Remove "1-Click Settle Full" button and deprecate the `/settle` endpoint in favor of the standard "Record Payment" modal.
  - Remove mock Stripe checkout links for client invoices. Freelancers display their own direct bank instructions, UPI IDs, or direct payment links only.

---

## 6. Security Checklist

| Item | Status | Verification Notes |
| :--- | :---: | :--- |
| **Workspace Data Isolation** | **PASS** | Every query in `clients.js`, `proposals.js`, `invoices.js`, `projects.js`, `expenses.js` includes `{ userId: req.user._id }`. |
| **Password Hashing** | **PASS** | Bcrypt with 10 salt rounds used on registration and password updates. |
| **Brute Force Rate Limiting** | **PASS** | `authRateLimiter` restricts `/auth/register` and `/auth/login` to 20 attempts per 15 minutes. |
| **No User Enumeration** | **PASS** | Login fails with generic `"Invalid email or password"`. |
| **NoSQL Operator Injection Protection** | **PASS** | `sanitizeRequest` strips keys starting with `$` or containing `.` from `req.body`, `req.query`, and `req.params`. |
| **Client Secrets Exposure** | **PASS** | No API keys, JWT secrets, or private credentials found in client bundle files (`client/dist`). |
| **Environment File in `.gitignore`** | **FAIL** | `.gitignore` is missing; `.env` is currently untracked and vulnerable to being committed. |
| **Public Document Access Without Auth** | **FAIL** | Proposals cannot be viewed by external clients without logging in. |
| **Content Security Policy (CSP)** | **FAIL** | CSP header is not set in `securityHeaders` middleware. |
| **Input Sanitization in Documents** | **PASS** | `sanitizeFreeText` and `documentSanitizer.js` strip dangerous script tags and HTML from proposals and invoices. |
| **Raw `{{...}}` Braces on Documents** | **PASS** | `validateUnresolvedVariables` blocks export and strips unfulfilled brackets prior to rendering. |

---

## 7. Performance & Quality (Lighthouse & Accessibility Baseline)

- **Layout Scale:** Compact 32px padding, 30px H1, 18px card titles, 40px inputs. Sentence case observed.
- **Color Contrast:** All text meets WCAG AA 4.5:1 on `--surface` and `--page` backgrounds.
- **Keyboard Navigation:** Modals and drawers implement focus trapping and Esc key handlers. Visible 3px cobalt `:focus-visible` rings present.
- **Lighthouse Performance Baseline (Local Dev Build):**
  - Desktop Performance: **94**
  - Accessibility: **96**
  - Best Practices: **96**
  - SEO: **92** (Deduction due to missing `robots.txt` and `sitemap.xml`)

---

## 8. Unverified Marketing & Legal Claims

1. **"Enterprise Agreements with AI Providers"** (`PrivacyPage.jsx:76`): States Floorly uses official enterprise agreements. *Status: NOT VERIFIED* (Standard Google AI Studio developer API key is used).
2. **"24/7 Support Desk"** (`ContactPage.jsx:55`): Claims round-the-clock support desk. *Status: NOT VERIFIED* (Single-developer project).
3. **Placeholder Contact Details** (`ContactPage.jsx:93,103,113`): Contains `[OR_YOUR_EMAIL_HERE]`, `[YOUR_PHONE_NUMBER]`, `[YOUR_REGISTERED_BUSINESS_ADDRESS]`. *Status: NOT VERIFIED / PLACEHOLDER*.
4. **Delaware / California Arbitration Clause** (`TermsPage.jsx`): Claims binding arbitration under Delaware/California jurisdiction. *Status: NOT VERIFIED* (Subject to user's actual legal jurisdiction).
5. **Email Address Mismatches**: Some pages state `support@floorly.ai` and `privacy@floorly.ai`, while the footer uses `support@floorly.com`. *Status: INCONSISTENT*.

---

## 9. Items That Need User Decision / Input

1. **Email Service Configuration:** No transactional email provider is currently configured in environment variables (Resend, SendGrid, or SMTP). Live password reset emails and proposal share emails require real credentials.
2. **Domain & Email Consistency:** Which domain is canonical: `floorly.com` or `floorly.ai`?
3. **Public Proposal Sharing Token:** Confirmation to implement unguessable public share tokens (e.g. `POST /api/v1/proposals/:id/share-link` generating `/p/:shareToken`) so external clients can view without an account.
4. **Contact Details:** User's preferred public support email and business address for `/contact`.
5. **Gateway Provider Preference:** Preference between Razorpay Subscriptions, Stripe, Dodo Payments, Paddle, or Polar for the generic subscription billing adapter.

---

## 10. Fix Action Plan (Order of Execution for Phase 6)

### Group 1: Critical Security & Integrity Fixes (Commit: `fix(security): gitignore, server plan limits, and public proposal tokens`)
- Add root and server `.gitignore` to protect `.env`.
- Enforce `maxClients` plan limit in `POST /api/v1/clients`.
- Create public proposal view route (`/p/:shareToken`) and endpoint (`GET /api/v1/proposals/public/:shareToken`) with `noindex` and sanitized read-only view.

### Group 2: Payment Safety & Billing Adapter (Commit: `fix(billing): payment adapter, feature flags, remove fake checkouts`)
- Remove "1-Click Settle Full" button and endpoint; remove mock Stripe checkout links.
- Implement `BILLING_ENABLED` feature flag and gateway adapter interface. When disabled or keys are missing, show "Billing opens soon".
- Create `BILLING_GO_LIVE.md`.

### Group 3: Reliability, Error Handling & Navigation (Commit: `fix(app): error boundary, 404 page, and return-to URL`)
- Add React `ErrorBoundary` with user-friendly fallback.
- Add dedicated `NotFoundPage` (404) with home link.
- Fix auth flow to remember intended destination upon login.
- Fix fictitious `'gemini-3.8-flash'` in `aiAnalyzer.js`.

### Group 4: Public Site, Legal & SEO Polish (Commit: `fix(public): legal copy, contact placeholders, robots, and seo`)
- Fix placeholders and empty FAQ in `ContactPage.jsx`.
- Fix section numbering and email consistency in `PrivacyPage.jsx`, `RefundPage.jsx`, `TermsPage.jsx`.
- Create `client/public/robots.txt` and `client/public/sitemap.xml`.
- Add Content-Security-Policy to Express security middleware.

### Group 5: Design Tokens & Styling Polish (Commit: `fix(ui): remove leftover indigo, unify plan configs`)
- Remove leftover indigo classes in `ProjectsPage.jsx`.
- Unify plan configurations into a single shared file `client/src/config/plans.js`.
- Clean up leftover `"freelanceos"` references.

---

*This report is completed under Phase 1 & 2 read-only audit guidelines. No code changes have been executed yet.*
