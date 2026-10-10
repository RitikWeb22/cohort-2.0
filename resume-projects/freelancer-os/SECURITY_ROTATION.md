# Security Rotation Guide

**Status:** No live secrets or `.env` files were detected in Git history (`git log --all --full-history -- .env` returned 0 matches, and string pattern searches for live credentials returned 0 commits).

However, as standard operational security hygiene following pre-production audits, the following credentials should be rotated prior to live production deployment:

## Credentials to Rotate (Variable Names Only)

1. `JWT_SECRET`
   - **Service:** Authentication JWT signature token
   - **Action:** Generate a fresh cryptographic 64-character random string (`node -e "console.log(crypto.randomBytes(32).toString('hex'))"`).
2. `MONGO_URI`
   - **Service:** MongoDB Atlas connection string
   - **Action:** Rotate the MongoDB Atlas database user password in Cloud Atlas Console and update the connection URI in the production secrets manager.
3. `GEMINI_API_KEY`
   - **Service:** Google AI Studio / Gemini API key
   - **Action:** Revoke the development API key in Google AI Studio / Google Cloud Console and provision a production key restricted by IP or HTTP referrer where applicable.
4. `STRIPE_SECRET_KEY` & `STRIPE_WEBHOOK_SECRET`
   - **Service:** Stripe payments (when `BILLING_ENABLED=true`)
   - **Action:** Ensure live keys (`sk_live_...` and `whsec_...`) are provisioned exclusively in production hosting environment variables, never on developer laptops.
5. `RAZORPAY_KEY_ID` & `RAZORPAY_KEY_SECRET`
   - **Service:** Razorpay payments (when `BILLING_ENABLED=true`)
   - **Action:** Provision live production API keys from the Razorpay Dashboard.
6. `RESEND_API_KEY`
   - **Service:** Transactional email delivery
   - **Action:** Provision an API key from resend.com with domain-sending permissions once DNS records (SPF, DKIM, DMARC) are validated.
7. `ADMIN_API_KEY`
   - **Service:** Platform Administrative API Guard
   - **Action:** Set a secure high-entropy random string for platform administrative overrides.
