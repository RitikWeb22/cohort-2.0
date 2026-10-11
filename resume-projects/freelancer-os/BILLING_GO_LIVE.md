# Billing Go-Live Checklist & Architecture Guide

This document outlines the strict operational requirements, environment configurations, and verification steps necessary before enabling live subscription billing (`BILLING_ENABLED=true`) on Floorly.

> **Operational Default:** `BILLING_ENABLED=false` by default. Online billing must remain disabled until all items in this guide are satisfied and verified against the staging checklist.

---

## 1. Architecture Overview & Provider Selection

Floorly employs a multi-gateway abstraction architecture (`server/src/services/paymentGatewayAdapter.js`):
- **Stripe:** Primary global subscription billing engine (USD card payments, Apple Pay, Google Pay).
- **Razorpay (Stub/Regional):** Dedicated Indian Rupee (INR) recurring mandates and UPI subscriptions.
- **Merchant of Record (MoR - Polar / Paddle / Dodo Payments):** For automated global tax calculation, EU VAT OSS, and merchant-of-record compliance.

### Provider Note: BILLING_PROVIDER Selection
The environment variable `BILLING_PROVIDER` (`stripe` | `razorpay` | `merchant-of-record`) selects the approved gateway for subscription billing. **Do not assume Stripe is available for every account or geography.** All providers sit behind the uniform interface `createSubscriptionCheckoutSession()`, `createCustomerPortalSession()`, and `fetchSubscriptionState()` in `server/src/services/paymentGatewayAdapter.js`.

---

## 2. Who is the Seller of Record?

Choosing between direct payment gateways and a Merchant of Record fundamentally alters legal, tax, and invoicing obligations:

### Direct Gateways (Stripe / Razorpay)
- **You are the legal Seller of Record.**
- **Your Responsibilities:** You are legally responsible for tax registration (e.g., local sales tax, EU VAT OSS, GST in India), tax calculation, issuing tax-compliant invoices to customers, filing periodic tax returns, and remitting collected taxes to respective tax authorities. Stripe and Razorpay process payments on your behalf, but do not assume legal tax liability.

### Merchant of Record (MoR - Dodo Payments, Paddle, Polar)
- **The MoR provider is the legal Seller of Record.**
- **Provider's Responsibilities:** The MoR provider sells your software subscription to the end customer. The provider automatically handles global tax calculation, EU VAT OSS remittance, local sales tax filing, fraud prevention, and issues legally compliant buyer tax invoices in their name.

> [!IMPORTANT]
> **Confirm with an accountant before launch** to verify your tax residency, nexus thresholds, VAT/GST registration obligations, and whether a direct gateway or MoR is required for your operating entity.

---

## 3. Required Production Environment Variables

To activate live billing, configure these environment variables in your secure server environment (never in client bundles or public git repositories):

```env
# Master Billing Switch (Default: false)
BILLING_ENABLED=false
BILLING_PROVIDER=stripe   # Options: stripe | razorpay | merchant-of-record

# Stripe Production Keys (Required if BILLING_PROVIDER=stripe)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay Production Keys (Required if BILLING_PROVIDER=razorpay)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Merchant of Record Production Keys (Required if BILLING_PROVIDER=merchant-of-record)
MOR_API_KEY=polar_...
MOR_WEBHOOK_SECRET=...

# Platform Administrative API Guard
ADMIN_OVERRIDE_ENABLED=false
ADMIN_API_KEY=your_secure_random_admin_api_key_32_chars_min
ADMIN_IP_ALLOWLIST=203.0.113.195   # Optional comma-separated IP allowlist

# Subscription Lifecycle Configuration
GRACE_PERIOD_DAYS=7               # Days to retain access on past_due before downgrade
```

---

## 4. Webhook Configuration & Endpoints

Register the dedicated webhook endpoints in your respective provider dashboards:

### 1. Stripe Dashboard
- **URL:** `https://api.yourdomain.com/api/v1/subscription/webhook/stripe` (or `/api/v1/subscription/webhook`)
- **Signature Header:** `stripe-signature`
- **Events to Subscribe:**
  - `checkout.session.completed` (activates new subscription)
  - `customer.subscription.updated` (reconciles tier changes, cancellations, and status)
  - `invoice.payment_succeeded` (renews active subscription)
  - `invoice.payment_failed` (transitions user to `past_due` with grace period)
  - `customer.subscription.deleted` (reverts user to Starter upon period expiration)
  - `charge.refunded` (full refund revokes access per policy; partial refund logged)
  - `charge.dispute.created` & `charge.dispute.closed` (dispute logging and alerts)

### 2. Razorpay Dashboard
- **URL:** `https://api.yourdomain.com/api/v1/subscription/webhook/razorpay`
- **Signature Header:** `x-razorpay-signature`
- **Events to Subscribe:**
  - `subscription.authenticated` (mandate verified)
  - `subscription.activated` (subscription activated)
  - `subscription.charged` (recurring charge succeeded; renews period)
  - `subscription.halted` (payment retries failed; enters grace period)
  - `subscription.cancelled` (cancelled; retained until period end)
  - `payment.failed` (charge failed; enters grace period)

### 3. Merchant of Record Dashboard (Polar / Paddle / Dodo)
- **URL:** `https://api.yourdomain.com/api/v1/subscription/webhook/merchant-of-record`
- **Signature Header:** `polar-signature` or `x-webhook-signature`
- **Events to Subscribe:**
  - `subscription.created` / `subscription.active` / `order.created` (activates tier)
  - `subscription.updated` (reconciles latest subscription state)
  - `subscription.canceled` / `subscription.revoked` (cancels or revokes access)
  - `refund.created` / `order.refunded` (handles refund policy)

---

## 5. Webhook Route Security & Idempotency Architecture

The webhook route (`/api/v1/subscription/webhook`) enforces strict security safeguards:

1. **Body Parsing Pipeline:** `express.raw({ type: '*/*', limit: '2mb' })` is mounted **BEFORE** `express.json` and request sanitization. This guarantees uncorrupted raw buffer access for cryptographic signature verification while enforcing a 2MB request body size ceiling against denial-of-service payloads.
2. **Exclusion from Auth & CSRF:** The route is excluded from session cookies and CSRF tokens to permit server-to-server gateway deliveries.
3. **Generous Rate Limiting:** A generous rate limit of 200 requests/minute per IP handles legitimate payment gateway event bursts while preventing flood attacks.
4. **Cryptographic Signature Verification:** Every request must pass cryptographic verification against the configured secret (`stripe.webhooks.constructEvent`, Razorpay HMAC-SHA256, or MoR HMAC-SHA256). Invalid or missing signatures immediately receive `400 Bad Request`.
5. **Idempotency with Compound Unique Index:**
   - The MongoDB collection `ProcessedEvent` maintains a compound unique index on `(provider, eventId)`.
   - Indexes are verified and created explicitly at server startup via `ProcessedEvent.createIndexes()`.
   - Duplicate events return `{ success: true, duplicate: true }` without executing side effects.
6. **Failure & Retry Semantics:** An incoming event is recorded as `status: 'processed'` **only after** its business logic handler succeeds. If the handler encounters a transient database or processing error, it throws and returns a `5xx` error so the payment gateway can execute exponential backoff retries.
7. **Out-of-Order Delivery Resilience:** When receiving subscription lifecycle events, Floorly fetches the latest canonical subscription state directly from the provider API (`fetchSubscriptionState()`) rather than blindly trusting potentially stale or delayed event payloads.

---

## 6. Subscription Lifecycle Rules

Floorly implements deterministic, auditable rules for subscription transitions:

### 1. `past_due` Grace Period
- **Grace Period Window:** Configurable via `GRACE_PERIOD_DAYS` (default: 7 days).
- **Access Behavior:** When a recurring charge fails (`invoice.payment_failed` or `subscription.halted`), the account is marked `past_due` with a timestamp `gracePeriodExpiresAt`. During this window, the freelancer retains full access to their paid tier so project work is not interrupted while they update their payment card.
- **Downgrade on Grace Expiry:** If payment is not resolved before `gracePeriodExpiresAt`, the account is automatically downgraded to the Starter (`free`) tier.

### 2. Client Record Preservation on Downgrade
- **Zero Data Deletion:** Existing clients are **never deleted** upon downgrade.
- **Read-Only / Archived Candidates:** When downgraded to Starter (limit: 2 clients), clients created beyond the Starter limit (the 3rd, 4th, 5th, etc.) become read-only and are flagged as `isReadOnly: true` and `isArchivedCandidate: true`. The freelancer can view historical invoices, proposals, and projects, but cannot edit over-limit clients or create new clients until they upgrade or archive clients down to the tier limit.

### 3. Cancellation Access Until Period End
- When a subscription is canceled with `cancel_at_period_end: true` or through customer portal cancellation, the account is marked `cancelAtPeriodEnd: true`.
- Full access to paid features is maintained until `subscriptionExpiresAt` (`current_period_end`). Only after the paid period expires does the account revert to Starter.

### 4. Refund Policy Execution
- **Full Refund:** Per Floorly's written refund policy (e.g. 14-day money-back guarantee), a full refund triggers immediate revocation of paid access (`subscriptionStatus: 'revoked'`, plan reverted to Starter). An auditable entry is logged to `ActivityLog`.
- **Partial Refund:** A partial refund does not terminate access and is recorded as an informational audit log entry.

---

## 7. Customer Portal & Billing Management

Floorly exposes a unified customer billing management endpoint:
- **Endpoint:** `POST /api/v1/subscription/customer-portal`
- **Header:** `Authorization: Bearer <token>`
- **Behavior:**
  - With `BILLING_ENABLED=false`: Returns `{ success: false, code: 'BILLING_DISABLED', error: 'Subscription billing is currently closed. Customer portal is not available.' }`.
  - With `BILLING_ENABLED=true`:
    - **Stripe:** Generates a secure, short-lived Stripe Customer Portal session URL (`stripe.billingPortal.sessions.create`) allowing users to update their payment method, view invoice receipts, and cancel subscriptions.
    - **Razorpay & MoR:** Returns direct portal links or clear instructions to manage active mandates.

---

## 8. Administrative Plan Override Guard

For customer support interventions, manual enterprise agreements, or complimentary access:
- **Endpoint:** `POST /api/v1/subscription/admin-override-plan`
- **Security Safeguards:**
  - **Kill-Switch:** The endpoint returns `403 Forbidden` (`ADMIN_OVERRIDE_DISABLED`) unless `ADMIN_OVERRIDE_ENABLED=true`.
  - **Key Length Verification:** `ADMIN_API_KEY` must be at least 32 characters in length; this is enforced at server startup via `validateRequiredEnv()`.
  - **Constant-Time Comparison:** Key validation uses `crypto.timingSafeEqual` with SHA-256 pre-hashing to prevent timing leakage.
  - **Rate Limiting:** Guarded by a strict 10 requests/minute rate limiter.
  - **IP Allowlist:** Optional `ADMIN_IP_ALLOWLIST` restricts access to authorized management IPs.
- **Audit Log:** Every override records an entry to `ActivityLog` documenting previous plan, new plan, expiration date, and administrative reason.

---

## 9. Environments: Test Mode vs Live Mode

| Attribute | Test Mode / Staging | Production / Live Mode |
| :--- | :--- | :--- |
| **Master Flag** | `BILLING_ENABLED=true` (in staging) | `BILLING_ENABLED=true` |
| **Stripe Keys** | `sk_test_...` / `whsec_...` (test secret) | `sk_live_...` / `whsec_...` (live secret) |
| **Razorpay Keys** | `rzp_test_...` / test secret | `rzp_live_...` / live secret |
| **MoR Keys** | Sandbox API key / test secret | Live production token / secret |
| **Test Cards** | Stripe 4242... test numbers | Real payment methods only |

### Running Webhook Tests with Stripe CLI
Forward live test events to your local or staging server:
```bash
# 1. Start forwarding
stripe listen --forward-to http://localhost:5000/api/v1/subscription/webhook/stripe

# 2. Trigger test lifecycle events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated
stripe trigger charge.refunded
```

### Running Webhook Tests with Razorpay
In the Razorpay Dashboard under **Settings > Webhooks**, create a test webhook pointed to your staging endpoint, select test mode, and trigger test events.

---

## 10. Staging Checklist & Rollback Procedure

### Pre-Launch Staging Checklist
1. `ProcessedEvent` collection index `(provider, eventId)` verified via `ensureBillingIndexes()`.
2. Send test webhooks using Stripe CLI; verify `200 OK` on first delivery.
3. Verify that sending the exact same event ID twice returns `{ success: true, duplicate: true }`.
4. Send an event with an invalid signature; confirm it receives `400 Bad Request`.
5. With `BILLING_ENABLED=false`, checkout endpoints return a 'billing not available' response and grant nothing.
6. Verify customer portal endpoint redirects to Stripe Customer Portal in staging.
7. Verify admin override endpoint is disabled when `ADMIN_OVERRIDE_ENABLED=false`.

### Emergency Rollback Procedure
If unexpected billing behavior, gateway outages, or duplicate webhooks occur in production:
1. **Immediate Checkout Halt:** In production hosting environment variables, set `BILLING_ENABLED=false` and restart/redeploy the server container. Existing users retain their active accounts, while all new checkout attempts immediately return a clean "Subscription checkout is currently closed" response without crashing.
2. **Replaying Missed Webhook Events:**
   - **Stripe:** Navigate to **Stripe Dashboard > Developers > Webhooks > [Your Endpoint]**. Under the **Failed** tab, select the missed events and click **Resend**. Floorly's idempotent `(provider, eventId)` handler will safely process only unrecorded events.
   - **Razorpay:** Navigate to **Razorpay Dashboard > Settings > Webhooks > Logs** and click **Retry** on failed deliveries.
   - **Merchant of Record:** Use the provider's webhook event replay tool in the dashboard.
