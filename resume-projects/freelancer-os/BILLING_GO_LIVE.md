# Billing Go-Live Checklist & Architecture Guide

This document outlines the strict operational requirements, environment configurations, and verification steps necessary before enabling live subscription billing (`BILLING_ENABLED=true`) on Floorly.

---

## 1. Architecture Overview

Floorly employs a multi-gateway abstraction architecture (`server/src/services/paymentGatewayAdapter.js`):
- **Stripe:** Primary global subscription billing engine (USD card payments, Apple Pay, Google Pay).
- **Razorpay (Stub/Regional):** Dedicated Indian Rupee (INR) recurring mandates and UPI subscriptions.
- **Merchant of Record (MoR - Polar/Paddle/Dodo Payments):** For automated global tax calculation, EU VAT MOSS, and merchant-of-record compliance.

---

## 2. Required Production Environment Variables

To activate live billing, configure these environment variables in your secure server environment (never in client bundles or public git repositories):

```env
# Master Billing Switch (Default: false)
BILLING_ENABLED=true
BILLING_PROVIDER=stripe

# Stripe Production Keys
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Razorpay Production Keys (Optional regional)
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Merchant of Record Production Keys (Optional)
MOR_API_KEY=polar_...
MOR_WEBHOOK_SECRET=...

# Platform Administrative API Guard
ADMIN_API_KEY=your_secure_random_admin_api_key_32_chars_min
```

---

## 3. Webhook Configuration & Endpoints

Register the following webhook endpoints in your provider's dashboard:

### Stripe Dashboard
- **URL:** `https://api.yourdomain.com/api/v1/subscription/webhook`
- **Events to Subscribe:**
  - `checkout.session.completed` (activates new subscription)
  - `invoice.payment_succeeded` (renews active subscription)
  - `invoice.payment_failed` (transitions user to `past_due`)
  - `customer.subscription.deleted` (reverts user to free tier upon expiration)

### Security Safeguards
1. **Signature Verification:** The endpoint rejects any request without a valid cryptographic signature (`400 Bad Request`).
2. **Idempotency Protection:** All incoming events are recorded in the `ProcessedEvent` MongoDB collection. Duplicate events are acknowledged (`200 OK`) and skipped without double-charging or duplicate lifecycle events.
3. **Redirect Protection:** The browser redirect `/settings?billing_status=success` never grants a subscription directly; activation occurs exclusively through verified webhook delivery.

---

## 4. Administrative Plan Override

For customer support interventions, manual enterprise agreements, or complimentary access:
- **Endpoint:** `POST /api/v1/subscription/admin-override-plan`
- **Header:** `X-Admin-Api-Key: <ADMIN_API_KEY>`
- **Payload:**
  ```json
  {
    "targetUserId": "64f1a2...",
    "plan": "pro",
    "durationDays": 365,
    "reason": "Annual enterprise sponsorship"
  }
  ```
- **Audit Logging:** Every administrative override writes an immutable entry to `ActivityLog` recording previous plan, new plan, and reason.

---

## 5. Go-Live Verification Protocol

Before setting `BILLING_ENABLED=true` in production:
1. Verify `ProcessedEvent` model is deployed in MongoDB.
2. Send test webhooks using Stripe CLI: `stripe trigger checkout.session.completed`.
3. Verify that sending the same event ID twice returns `{ success: true, duplicate: true }`.
4. Send an event with an invalid signature; confirm it receives `400 Bad Request`.
5. Verify `/api/v1/subscription/create-checkout-session` rejects non-paying users when `BILLING_ENABLED=false`.
