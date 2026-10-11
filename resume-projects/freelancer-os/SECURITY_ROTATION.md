# Security Rotation & Production Isolation Guide

**Status:** No live secrets or `.env` files were detected in Git history (`git log --all --full-history -- .env` returned 0 matches, and pattern searches for live credentials returned 0 commits).

However, as standard operational security hygiene following pre-production audits, production environments **must use completely isolated infrastructure and fresh credentials**.

---

## 1. Separate Production Resources & Infrastructure Isolation

Never share development or staging database clusters, users, or credentials with production:

1. **Dedicated MongoDB Atlas Cluster & Least-Privilege User:**
   - Provision a dedicated production Atlas cluster (or at minimum an isolated database).
   - Create a dedicated production database user with **least privilege** (scoped strictly to `readWrite` on the production database, e.g. `floorly_production`). Do not assign `atlasAdmin`, `dbAdminAnyDatabase`, or broad cluster management roles.
2. **MongoDB Atlas IP Allowlist:**
   - In MongoDB Atlas **Network Access**, restrict incoming connections strictly to the static egress IP addresses or VPC CIDR blocks of your production application servers.
   - **Never permit `0.0.0.0/0` in production.**
3. **Dedicated Production JWT Secret:**
   - Generate a fresh, high-entropy 64-character random secret dedicated solely to production (`node -e "console.log(crypto.randomBytes(32).toString('hex'))"`).
4. **Separate Production Third-Party API Keys:**
   - Provision independent production API keys across all integrations (Stripe live keys, Razorpay live keys, MoR tokens, Resend sending keys).

---

## 2. Credentials to Rotate (Variable Names Only)

### 1. `JWT_SECRET`
- **Service:** Authentication JWT token signature
- **Action:** Generate a fresh cryptographic 64-character random string (`node -e "console.log(crypto.randomBytes(32).toString('hex'))"`). Store in your production secrets manager.

### 2. `MONGO_URI`
- **Service:** MongoDB Atlas connection string
- **Action:** Provision a dedicated production database user with least-privilege `readWrite` rights and restrict network ingress via Atlas IP Allowlist to production server IPs only.

### 3. `GEMINI_API_KEY`
- **Service:** Google AI Studio / Gemini API key
- **Action:** Provision a production API key in Google Cloud Console / Google AI Studio.
- **Critical Restriction Rule:** Server-side API keys used in Node.js backend services **must be restricted by IP address (server egress IP/CIDR), NOT by HTTP referrer**. HTTP referrer restrictions are designed exclusively for browser client requests and do not apply to server-to-server SDK calls.

### 4. `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`
- **Service:** Stripe subscription billing (when `BILLING_ENABLED=true`)
- **Action:** Ensure live production keys (`sk_live_...` and `whsec_...`) are provisioned exclusively in production hosting environment variables, never committed or shared on developer workstations.

### 5. `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
- **Service:** Razorpay recurring subscriptions (when `BILLING_ENABLED=true`)
- **Action:** Provision live production API keys and configure a production webhook secret in the Razorpay Dashboard.

### 6. `MOR_API_KEY` & `MOR_WEBHOOK_SECRET`
- **Service:** Merchant of Record (Polar / Paddle / Dodo Payments)
- **Action:** Generate production API tokens and configure production webhook signing secrets in the MoR dashboard.

### 7. `RESEND_API_KEY`
- **Service:** Transactional email delivery
- **Action:** Provision a production API key from resend.com with domain-sending permissions once DNS records (SPF, DKIM, DMARC) are validated.

### 8. `ADMIN_API_KEY`
- **Service:** Platform Administrative API Guard (`ADMIN_OVERRIDE_ENABLED=true`)
- **Action:** Generate a secure, high-entropy random string (at least 32 characters, enforced at server startup). Keep `ADMIN_OVERRIDE_ENABLED=false` until administrative access is deliberately required.
