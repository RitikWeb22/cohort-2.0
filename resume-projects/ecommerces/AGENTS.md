# Project: Production-Ready E-Commerce Platform

Build a production-grade, scalable e-commerce platform with real payment processing, reliable inventory management, transactional order handling, secure authentication, administrative controls, and high-performance product search.

The application must be designed for real-world usage rather than as a demo project.

---

# 1. Core Engineering Principles

Follow these principles throughout the project:

* Production-ready over prototype-ready
* Security by default
* Server is the source of truth
* Never trust client-side prices, stock, discounts, or order totals
* Never allow overselling
* Never mark an order as paid based only on frontend confirmation
* Every payment must be verified server-side
* Every webhook must be idempotent
* Every inventory mutation must be concurrency-safe
* Every important state transition must be explicit
* Database transactions must protect critical business operations
* APIs must be validated and authenticated
* Errors must be observable and actionable
* Design for horizontal scalability
* Avoid unnecessary complexity
* Prefer clear, maintainable modules over clever abstractions

---

# 2. Recommended Stack

## Frontend

* React.js
* Vite
* JavaScript
* Tailwind CSS
* Framer Motion
* React Router
* TanStack Query
* React Hook Form
* Zod
* Axios

## Backend

* Node.js
* Express.js
* JavaScript
* MongoDB
* Mongoose
* Redis
* Stripe OR Razorpay
* MongoDB Atlas Search

## Infrastructure

* Docker
* Redis
* MongoDB Atlas
* Object storage for product images
* CDN
* Reverse proxy
* CI/CD

## Optional

* BullMQ for background jobs
* Winston/Pino for structured logging
* Sentry for error monitoring
* OpenTelemetry for distributed tracing

---

# 3. Architecture

Use a modular monolith architecture initially.

Recommended structure:

```text
# AGENTS.md

Guidance for AI coding agents (Claude Code, Codex, Cursor, Copilot, etc.) working on **KORA**.
Read this file fully before making changes. When in doubt, follow the existing code over this file, then ask.

## 1. Project Overview

**KORA** is a premium cloth brand e-commerce platform (MERN stack) with a light, editorial theme.
It supports variant-level inventory (size / colour / fabric), Razorpay payments, an order state machine,
background jobs, and an admin panel.

- **Client:** React (Vite), Redux Toolkit + RTK Query, plain CSS with design tokens
- **Server:** Node.js, Express, MongoDB (Mongoose), Redis, BullMQ
- **Payments:** Razorpay (Orders API + signed webhooks)
- **Media:** Cloudinary
- **Email:** Resend
- **Deploy:** Vercel (client), Render/Railway (server), MongoDB Atlas, Upstash Redis
- **Not used:** AWS. Do not add AWS services or SDKs.

## 2. Repository Layout

```
kora/
├── .github/workflows/        # ci.yml, deploy.yml
├── docker-compose.yml        # api, client, mongo, redis (local dev)
├── client/src/
│   ├── components/{ui,layout,common}
│   ├── features/             # auth, catalog, product, cart, checkout, orders, wishlist, reviews, admin
│   ├── pages/  layouts/  hooks/  services/  store/
│   ├── styles/               # theme.css (tokens), globals.css
│   ├── lib/  utils/  routes/  constants/
└── server/
    ├── src/
    │   ├── config/           # env, db, redis, cloudinary, razorpay, logger
    │   ├── modules/          # auth, users, products, categories, cart, orders,
    │   │                     # payments, inventory, coupons, reviews, search, admin
    │   ├── middlewares/      # auth, rbac, rateLimiter, errorHandler, upload
    │   ├── jobs/{queues,workers,schedulers}
    │   ├── events/  integrations/  utils/  docs/
    │   └── app.js
    ├── tests/{unit,integration,e2e}
    ├── scripts/              # seed.js, migrate.js
    └── server.js
```

Each server module is self-contained: `*.model.js`, `*.repository.js`, `*.service.js`,
`*.controller.js`, `*.routes.js`, `*.validator.js`. Keep new code inside the relevant module.

## 3. Setup and Commands

```bash
# Local services (mongo + redis)
docker compose up -d mongo redis

# Server
cd server && cp .env.example .env && npm install
npm run dev          # nodemon
npm run seed         # demo products, categories, admin user
npm test             # unit + integration
npm run test:e2e
npm run lint

# Client
cd client && npm install
npm run dev
npm run build
npm run lint
```

Before declaring any task done, run lint and tests for every package you touched.

## 4. Architecture Rules

**Server layering (strict):** `routes → validator → controller → service → repository → model`

- Controllers: parse request, call a service, return a response. No business logic, no direct DB calls.
- Services: all business logic. Services may call other modules only through their service layer, never their models.
- Repositories: the only layer that touches Mongoose.
- Wrap async handlers with `asyncHandler`. Throw `ApiError` for expected failures; the central `errorHandler` formats responses.
- Validate every request body, query, and param in `validators/` (Zod or Joi, match the existing choice).
- Use events (`events/`) and BullMQ jobs for side effects (email, invoice, stock release). Do not do them inline in request handlers.

**Client:**

- Feature-based structure. Put feature-specific components, hooks, and API slices in `features/<name>/`.
- Shared UI primitives live in `components/ui/`. Do not duplicate them inside features.
- Server state through RTK Query. Local UI state through `useState` or small slices. Do not fetch with raw `fetch` inside components.
- Routes are protected via `ProtectedRoute` and `AdminRoute`. Never rely on hiding UI as security.

## 5. Critical Domain Rules (do not break)

### Inventory
- Stock is tracked **per variant** (size + colour + fabric).
- Reserve stock with an **atomic** update (`findOneAndUpdate` with a `stock >= qty` condition, or a transaction). Never read-then-write.
- Checkout creates a **10-minute reservation**. `releaseStockWorker` returns stock if payment is not completed in time.
- Any change to inventory logic must include or update the race-condition integration test.

### Orders
- Status flow: `pending → paid → shipped → delivered`, plus `cancelled` and `refunded`.
- Transitions are enforced in one place (the orders state machine). Never set `order.status` directly elsewhere.
- Order totals are computed on the **server** from current product prices. Never trust prices from the client.

### Payments (Razorpay)
- Create the Razorpay order on the server. Amounts are in **paise** (integer). Never use floats for money.
- Verify the payment signature server-side with HMAC SHA256 using the key secret.
- Verify webhook signatures using the raw request body and the webhook secret. The webhook route must receive the raw body (do not run `express.json()` before it).
- Webhooks must be **idempotent**: store the event/payment id and ignore duplicates.
- Never log full payment payloads, secrets, or signatures.

### Auth and security
- JWT access token (short-lived) + refresh token (httpOnly, secure cookie). Hash passwords with bcrypt.
- RBAC via the `rbac` middleware. Admin routes must always be role-checked on the server.
- Apply `rateLimiter` to auth, payment, and coupon endpoints.
- Sanitize input, set security headers (helmet), and restrict CORS to known origins.
- Never commit secrets. Use `.env` and update `.env.example` when adding a variable.

## 6. Environment Variables

Server (`server/.env.example` must list all of these):

```
NODE_ENV=
PORT=
MONGODB_URI=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CLIENT_URL=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
```

Client (`VITE_` prefix only; never put secrets here):

```
VITE_API_URL=
VITE_RAZORPAY_KEY_ID=
```

## 7. Design System (Light Theme)

Use CSS variables from `client/src/styles/theme.css`. Do not hardcode colours.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#FAF7F2` | page background |
| `--surface` | `#FFFFFF` | cards, modals |
| `--sand` | `#EDE6DA` | sections, borders |
| `--ink` | `#1F1D1A` | text |
| `--accent` | `#B08D57` | CTAs, highlights |

- Fonts: **Cormorant Garamond** (headings), **Inter** (body).
- Tone: calm, editorial, generous whitespace, minimal motion. No dark mode unless asked.
- Every interactive element needs a visible focus state, and images need `alt` text.
- Respect `prefers-reduced-motion`.
- Brand name is **KORA** (not "Kora Atelier"). Use it consistently in copy, titles, and metadata.

## 8. Code Style

- JavaScript (ES modules) unless the repo has been migrated to TypeScript. Match the existing files.
- Prettier and ESLint configs are the source of truth. Do not reformat unrelated files.
- Naming: `camelCase` variables/functions, `PascalCase` components/classes, `kebab-case` folders only where already used.
- Prefer small, pure functions. Avoid files over ~300 lines; split them.
- No `console.log` in committed code. Use the logger on the server.
- Comments explain *why*, not *what*.
- Prefer existing utilities (`ApiError`, `asyncHandler`, `pagination`, `idempotency`) over writing new ones.

## 9. API Conventions

- REST, versioned under `/api/v1`.
- Success: `{ success: true, data, meta? }`. Error: `{ success: false, message, code, details? }`.
- Use **cursor-based pagination** for product listing and feeds.
- Document every new endpoint in `server/src/docs/swagger.yaml`.
- Cache read-heavy endpoints (product list, product detail) in Redis and invalidate on product or inventory writes.

## 10. Testing

- Unit tests for services and utilities. Integration tests (Supertest + in-memory/test Mongo) for routes.
- Mandatory integration tests for: inventory race condition, order state transitions, Razorpay webhook (valid signature, invalid signature, duplicate event).
- Mock Razorpay, Cloudinary, and Resend at the integration boundary. Never call real third-party APIs in tests.
- Fix the code, not the test, unless the test is wrong. Do not delete or skip tests to make CI pass.
- Target 80%+ coverage on `modules/orders`, `modules/payments`, `modules/inventory`.

## 11. Git and PR Rules

- Branches: `feat/<name>`, `fix/<name>`, `chore/<name>`.
- Conventional commits: `feat(orders): add cancel flow`.
- Keep PRs small and focused. Include what changed, why, and how it was tested.
- CI (`ci.yml`) must pass: lint, test, build.
- Do not push to `main` directly. Do not force-push shared branches.

## 12. Agent Workflow

1. Read the relevant module and its tests before editing.
2. Make the smallest change that solves the task. No drive-by refactors.
3. Add or update tests for behaviour you change.
4. Run lint and tests. Report the results honestly, including failures.
5. If requirements are ambiguous or a change touches payments, inventory, or auth, state your assumptions before implementing.

## 13. Do Not

- Do not add AWS services, new payment gateways, or new major dependencies without asking.
- Do not store card data. Razorpay handles it.
- Do not change the order state machine, inventory reservation logic, or webhook handling without updating their tests.
- Do not bypass validation, RBAC, or rate limiting for convenience.
- Do not commit `.env`, secrets, build output, or `node_modules`.
- Do not edit generated files, lockfiles (except via the package manager), or `seed.js` demo data casually.

## 14. Definition of Done

- [ ] Feature works end to end (client and server where relevant)
- [ ] Input validated, errors handled, RBAC applied
- [ ] Tests added or updated and passing
- [ ] Lint passes, no `console.log`
- [ ] Swagger and `.env.example` updated if needed
- [ ] No hardcoded colours, secrets, or magic numbers
- [ ] Brief PR description written
```

Business logic must live primarily inside services.

Controllers should remain thin.

```text
Route
  ↓
Middleware
  ↓
Controller
  ↓
Service
  ↓
Repository / Database
```

Do not put business logic directly inside route handlers.

---

# 4. Authentication

Implement secure authentication.

Support:

* Email/password authentication
* Secure password hashing
* Access tokens
* Refresh tokens
* Logout
* Token rotation
* Email verification
* Password reset
* Account status
* Admin authentication

Never store plaintext passwords.

Use:

```text
bcrypt
```

or an equally strong password hashing algorithm.

Never store sensitive tokens in localStorage when an HttpOnly cookie strategy is appropriate.

For browser authentication prefer:

```text
HttpOnly
Secure
SameSite
```

cookies.

---

# 5. User Roles

Minimum roles:

```text
CUSTOMER
ADMIN
SUPER_ADMIN
```

Permissions must be checked server-side.

Never rely on:

```javascript
if (user.role === "admin")
```

on the frontend as a security mechanism.

Frontend role checks are only for UX.

Backend authorization is mandatory.

---

# 6. Product System

Products should support:

* Name
* Slug
* Description
* Images
* SKU
* Brand
* Category
* Subcategory
* Price
* Compare-at price
* Discount
* Tax
* Inventory
* Reserved inventory
* Sold quantity
* Attributes
* Variants
* Status
* Search metadata
* SEO metadata
* Created/updated timestamps

Example:

```text
Product
├── Basic information
├── Pricing
├── Inventory
├── Variants
├── Media
├── Categories
├── Attributes
└── SEO
```

Never trust product price received from the client.

The backend must retrieve the current price from the database.

---

# 7. Product Variants

Products may have variants.

Examples:

```text
iPhone
├── 128GB / Black
├── 128GB / White
├── 256GB / Black
└── 256GB / White
```

Inventory should be tracked at the SKU/variant level whenever variants exist.

Do not maintain only product-level inventory when individual variants can sell independently.

---

# 8. Cart Architecture

Cart operations:

```text
Add item
Update quantity
Remove item
Clear cart
Get cart
Validate cart
```

Cart data should contain:

```text
productId
variantId
quantity
```

Do not permanently trust:

```text
price
discount
tax
subtotal
```

from the frontend.

Before checkout, the backend must revalidate:

* Product existence
* Variant existence
* Product availability
* Current price
* Promotions
* Tax
* Quantity limits
* Inventory

---

# 9. Checkout

Checkout must be server-driven.

Flow:

```text
Cart
 ↓
Checkout Request
 ↓
Validate Cart
 ↓
Fetch Current Product Prices
 ↓
Validate Inventory
 ↓
Calculate Pricing
 ↓
Create Payment
 ↓
Reserve Inventory
 ↓
Return Payment Information
 ↓
Customer Completes Payment
 ↓
Payment Provider Webhook
 ↓
Verify Payment
 ↓
Confirm Order
```

Never calculate the final order total only on the frontend.

The backend must calculate:

```text
subtotal
discount
shipping
tax
grandTotal
```

---

# 10. Money Handling

Never use floating-point arithmetic for financial calculations.

Bad:

```javascript
const total = 19.99 + 9.99;
```

Prefer integer minor units.

Example:

```javascript
const priceInPaise = 1999;
```

For USD:

```javascript
const priceInCents = 1999;
```

All payment calculations must use integer minor units.

---

# 11. Payment Architecture

Support either:

```text
Stripe
```

or:

```text
Razorpay
```

Payment provider code must be isolated behind an abstraction.

Example:

```text
payments/
├── payment.service.js
├── payment.interface.js
├── stripe.provider.js
└── razorpay.provider.js
```

Application business logic should not be tightly coupled to one provider.

Example interface:

```javascript
createPayment()
verifyPayment()
refundPayment()
capturePayment()
```

---

# 12. Payment Security

Never trust:

```text
paymentSuccess = true
```

from the frontend.

The server must verify payment status with the payment provider.

Correct source of truth:

```text
Payment Provider
        ↓
Verified Webhook
        ↓
Backend
        ↓
Order
```

Webhook signatures must always be verified.

Never process unsigned payment webhooks.

---

# 13. Webhook Idempotency

Webhooks can be delivered multiple times.

Therefore every webhook must be idempotent.

Store:

```text
providerEventId
eventType
processedAt
status
```

Before processing:

```javascript
if (await eventAlreadyProcessed(event.id)) {
    return;
}
```

Use a unique database constraint on the provider event ID.

Never assume:

```text
one webhook = one delivery
```

---

# 14. Payment State Machine

Payment states:

```text
CREATED
PENDING
AUTHORIZED
PAID
FAILED
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

Invalid transitions must be rejected.

Example:

```text
PAID → PENDING
```

must not be allowed.

---

# 15. Order State Machine

Order lifecycle:

```text
PENDING_PAYMENT
      ↓
PAID
      ↓
PROCESSING
      ↓
SHIPPED
      ↓
DELIVERED
```

Alternative terminal states:

```text
CANCELLED
REFUNDED
PARTIALLY_REFUNDED
```

Example:

```text
PENDING_PAYMENT → PAID
PENDING_PAYMENT → CANCELLED

PAID → PROCESSING
PAID → CANCELLED

PROCESSING → SHIPPED

SHIPPED → DELIVERED

PAID → REFUNDED
DELIVERED → REFUNDED
```

Do not allow arbitrary order status updates.

Implement an explicit transition validator.

---

# 16. Inventory Model

Inventory must distinguish between:

```text
availableStock
reservedStock
soldStock
```

Conceptually:

```text
availableStock =
totalStock - reservedStock - soldStock
```

However, the actual implementation should maintain a carefully controlled representation rather than repeatedly calculating stock from unrelated collections.

Example:

```text
Inventory

sku
quantity
reservedQuantity
soldQuantity
version
```

---

# 17. Inventory Reservation

Never simply do:

```javascript
if (stock >= quantity) {
    stock -= quantity;
}
```

This is vulnerable to race conditions.

Two customers could simultaneously read:

```text
stock = 1
```

and both purchase the item.

Result:

```text
stock = -1
```

or overselling.

---

# 18. Atomic Inventory Reservation

Inventory reservation must happen atomically.

Preferred pattern:

```javascript
await Inventory.findOneAndUpdate(
  {
    sku,
    availableStock: { $gte: quantity }
  },
  {
    $inc: {
      availableStock: -quantity,
      reservedStock: quantity
    }
  },
  {
    new: true
  }
);
```

If no document is returned:

```text
Insufficient inventory
```

This operation must be treated as the atomic reservation boundary.

---

# 19. Reservation Lifecycle

Inventory reservation:

```text
AVAILABLE
    ↓
RESERVED
    ↓
    ├── PURCHASED
    │
    └── RELEASED
```

Example:

```text
Customer starts checkout
        ↓
Reserve stock
        ↓
Payment succeeds
        ↓
Convert reservation → sold
```

If payment fails:

```text
Reservation
    ↓
Release inventory
```

If checkout expires:

```text
Reservation
    ↓
Release inventory
```

---

# 20. Reservation Expiration

Reservations should have an expiration time.

Example:

```text
reservationExpiresAt
```

A background worker should release expired reservations.

Use:

```text
BullMQ + Redis
```

or another reliable job system.

Never rely only on a browser timeout.

The backend must enforce expiration.

---

# 21. Database Transactions

Use MongoDB transactions for operations that require multiple documents to remain consistent.

Example:

```text
Create order
+
Create order items
+
Create payment record
+
Update inventory
+
Create reservation
```

These operations should be designed around transaction boundaries where appropriate.

Important:

Transactions do not automatically solve every race condition.

The inventory update itself must still use an atomic conditional operation.

---

# 22. Race Conditions

The system must explicitly handle:

### Case 1 — Two customers buy the last item

```text
Customer A → stock = 1
Customer B → stock = 1
```

Only one reservation may succeed.

### Case 2 — Duplicate checkout request

The same request must not create two orders or two reservations.

### Case 3 — Duplicate webhook

The same webhook must not mark an order as paid twice.

### Case 4 — Payment succeeds but response is lost

Webhook processing must recover the order.

### Case 5 — Payment fails after reservation

Inventory must eventually be released.

### Case 6 — Customer retries checkout

The backend must use idempotency keys.

---

# 23. Idempotency

Critical APIs should support idempotency.

Examples:

```text
POST /checkout
POST /payments
POST /orders
POST /refunds
```

Client provides:

```text
Idempotency-Key
```

Backend stores:

```text
key
userId
requestHash
response
createdAt
```

Repeated requests with the same key should return the original result rather than execute the operation again.

---

# 24. Order Creation Strategy

Recommended architecture:

```text
Checkout Request
       ↓
Validate Cart
       ↓
Calculate Server-Side Total
       ↓
Create/Reserve Inventory
       ↓
Create Pending Order
       ↓
Create Payment
       ↓
Return Payment Session
```

After payment:

```text
Webhook
   ↓
Verify Signature
   ↓
Find Order
   ↓
Verify Amount/Currency
   ↓
Mark Payment Paid
   ↓
Confirm Order
   ↓
Finalize Inventory
```

Do not create a completed order merely because a payment page was opened.

---

# 25. Search

Use:

```text
MongoDB Atlas Search
```

or Elasticsearch.

Search should support:

* Product name
* Description
* Brand
* Category
* SKU
* Attributes
* Autocomplete
* Fuzzy search
* Typo tolerance
* Filters
* Sorting
* Price range
* Availability

Example:

```text
/search?q=iphone
```

Filters:

```text
brand
category
minPrice
maxPrice
rating
availability
attributes
```

---

# 26. Search Performance

Do not perform expensive regex queries against large product collections.

Prefer indexed search.

Use:

```text
MongoDB Atlas Search
```

for MongoDB-based deployments.

Search responses should support pagination.

Prefer cursor-based pagination for very large result sets.

---

# 27. Admin Dashboard

Admin dashboard should provide:

```text
Dashboard
Products
Categories
Inventory
Orders
Customers
Payments
Refunds
Coupons
Analytics
Settings
Audit Logs
```

Dashboard metrics:

```text
Revenue
Orders
Average Order Value
Customers
Low Stock Products
Pending Payments
Refunds
Failed Payments
```

---

# 28. Inventory Admin

Admin must be able to:

* Add inventory
* Remove inventory
* Adjust inventory
* View reserved stock
* View sold stock
* View inventory history
* View low-stock products

Never silently change stock.

Every manual inventory adjustment should create an audit record.

Example:

```text
SKU
Previous Quantity
New Quantity
Difference
Admin
Reason
Timestamp
```

---

# 29. Refund System

Refunds must be processed through the payment provider.

Never simply change:

```text
order.status = "REFUNDED"
```

without actually processing the payment refund.

Flow:

```text
Admin requests refund
        ↓
Validate refundable amount
        ↓
Payment provider refund
        ↓
Verify result
        ↓
Update refund record
        ↓
Update order/payment state
```

Support:

```text
Full refund
Partial refund
```

Refund operations must also be idempotent.

---

# 30. API Design

Use REST APIs with predictable resources.

Example:

```text
GET    /api/products
GET    /api/products/:id
POST   /api/products
PATCH  /api/products/:id
DELETE /api/products/:id

GET    /api/cart
POST   /api/cart/items
PATCH  /api/cart/items/:id
DELETE /api/cart/items/:id

POST   /api/checkout

GET    /api/orders
GET    /api/orders/:id

POST   /api/payments/create
POST   /api/payments/webhook

POST   /api/orders/:id/cancel
POST   /api/orders/:id/refund
```

---

# 31. Validation

Validate all incoming data.

Use:

```text
Zod
```

or an equivalent validation library.

Validate:

* Body
* Query parameters
* Route parameters
* Headers
* Pagination
* Payment amounts
* IDs
* Quantities

Never trust frontend validation.

---

# 32. API Error Format

Use consistent errors.

Example:

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "One or more items are no longer available."
  }
}
```

Do not expose:

* Database errors
* Stack traces
* Internal service information
* Secrets
* Payment credentials

in production responses.

---

# 33. Rate Limiting

Apply rate limiting to:

```text
Authentication
Password reset
Checkout
Payment creation
Coupon validation
Search
Admin APIs
Webhook endpoints where appropriate
```

Use Redis-backed rate limiting when running multiple backend instances.

---

# 34. Security

Implement:

* Helmet
* CORS configuration
* Rate limiting
* Input validation
* Secure cookies
* CSRF protection where applicable
* NoSQL injection protection
* XSS-safe rendering
* Authorization middleware
* Request size limits
* Secure headers

Never expose:

```text
STRIPE_SECRET_KEY
RAZORPAY_SECRET
DATABASE_URL
JWT_SECRET
REDIS_URL
```

to the frontend.

---

# 35. Environment Variables

Use:

```text
.env
.env.example
```

Example:

```env
NODE_ENV=development

PORT=5000

MONGODB_URI=

REDIS_URL=

JWT_SECRET=
JWT_REFRESH_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

CLIENT_URL=
```

Never commit `.env`.

---

# 36. Frontend Architecture

Frontend should be responsive and production-quality.

Pages:

```text
Home
Products
Product Details
Search
Categories
Cart
Checkout
Payment
Order Success
Order History
Order Details
Profile
Login
Register
Forgot Password
Admin Dashboard
```

Use reusable components:

```text
Navbar
ProductCard
ProductGrid
Price
Rating
SearchBar
FilterPanel
CartItem
CheckoutSummary
AddressForm
PaymentForm
OrderStatus
Pagination
Modal
Toast
Skeleton
```

---

# 37. UX States

Every asynchronous operation must support:

```text
Loading
Success
Error
Empty
Retry
```

Avoid blank screens.

Use skeleton loaders where appropriate.

For payment and checkout:

```text
Processing payment...
```

must not be treated as:

```text
Payment successful
```

until the backend confirms the result.

---

# 38. Checkout UX

Checkout should clearly display:

```text
Items
Quantity
Price
Discount
Shipping
Tax
Total
Payment method
Billing address
Shipping address
```

Before payment:

```text
Revalidate cart
```

If product price or stock changed:

```text
Your cart has changed.
Please review the updated order.
```

Do not silently charge a different amount.

---

# 39. Order Confirmation

After payment:

```text
Payment Provider
       ↓
Webhook
       ↓
Backend
       ↓
Order confirmed
       ↓
Frontend polls / fetches order
```

Frontend should not assume success only because the payment SDK returned control.

---

# 40. Caching

Use Redis for appropriate data:

```text
Product cache
Category cache
Search suggestions
Rate limits
Sessions
Temporary checkout state
Idempotency records
Jobs
```

Never cache mutable inventory in a way that can become the source of truth.

Database remains authoritative for inventory.

---

# 41. Cache Invalidation

Whenever product data changes:

```text
Update database
↓
Invalidate relevant cache
```

Do not allow stale price data to become checkout truth.

---

# 42. Background Jobs

Use background jobs for:

```text
Expired reservation cleanup
Order confirmation emails
Shipping notifications
Payment reconciliation
Failed webhook retries
Low-stock notifications
Abandoned cart processing
Search indexing
Analytics aggregation
```

Never make checkout depend on non-critical email delivery.

---

# 43. Webhook Reliability

Webhook processing must be resilient.

Recommended flow:

```text
Webhook
   ↓
Verify signature
   ↓
Persist event
   ↓
Return HTTP 200 quickly
   ↓
Process event asynchronously
```

For processing failures:

```text
Retry
↓
Exponential backoff
↓
Dead-letter queue
↓
Admin visibility
```

Do not lose webhook events.

---

# 44. Payment Reconciliation

Create a reconciliation mechanism.

Periodically compare:

```text
Internal Payment State
vs
Payment Provider State
```

This protects against:

* Lost webhooks
* Network failures
* Partial outages
* Manual provider-side changes

---

# 45. Audit Logging

Important administrative actions must be logged.

Examples:

```text
Product created
Product deleted
Price changed
Inventory adjusted
Order cancelled
Refund issued
User suspended
Admin login
Coupon created
```

Audit log:

```text
actorId
action
resourceType
resourceId
metadata
ip
timestamp
```

Never allow ordinary admins to silently delete audit history.

---

# 46. Observability

Implement structured logging.

Every request should have:

```text
requestId
```

Important logs:

```text
Checkout started
Inventory reserved
Inventory reservation failed
Payment created
Payment webhook received
Payment verified
Order created
Order state changed
Refund requested
Refund completed
```

Never log:

```text
card numbers
CVV
passwords
access tokens
secret keys
```

---

# 47. Testing

Write tests for critical business logic.

Minimum coverage:

### Inventory

```text
Reserve available stock
Reject insufficient stock
Concurrent reservation
Release reservation
Confirm reservation
Expire reservation
```

### Payments

```text
Create payment
Verify payment
Invalid webhook
Duplicate webhook
Failed payment
Refund
Duplicate refund
```

### Orders

```text
Valid transition
Invalid transition
Cancellation
Refund
```

### Checkout

```text
Price changed
Stock changed
Duplicate request
Expired reservation
```

---

# 48. Concurrency Testing

Inventory concurrency must be tested explicitly.

Example:

```text
Initial stock = 1

100 concurrent checkout requests

Expected successful reservations = 1
Expected overselling = 0
```

This is a mandatory production-readiness test.

---

# 49. Database Indexes

Create indexes for frequently queried fields.

Examples:

```text
Product:
slug
sku
category
brand
status

Order:
userId
status
createdAt
paymentId

Inventory:
sku

Payment:
providerPaymentId
providerEventId
orderId

Reservation:
sku
orderId
expiresAt
status
```

Use compound indexes where query patterns justify them.

Do not blindly index every field.

---

# 50. Pagination

Never return thousands of records in one API response.

Use:

```text
page
limit
```

for normal admin interfaces.

For high-volume feeds/search:

```text
cursor
limit
```

Prefer server-side pagination.

---

# 51. SEO

Product pages should support:

* SEO title
* Meta description
* Canonical URL
* Open Graph metadata
* Structured product data
* Clean URLs

Example:

```text
/products/apple-iphone-17-pro
```

Avoid:

```text
/products?id=123
```

for the public canonical URL.

---

# 52. Image Handling

Do not store large image binaries directly inside MongoDB.

Use object storage/CDN.

Store:

```text
url
publicId
width
height
alt
```

Generate optimized sizes where appropriate.

Use lazy loading for product images.

---

# 53. Admin Security

Admin routes must use:

```text
Authentication
+
Authorization
+
Rate Limiting
+
Audit Logging
```

Sensitive operations may require additional confirmation.

Examples:

```text
Delete product
Large inventory adjustment
Refund
Change admin role
```

---

# 54. Data Integrity Rules

Never allow:

```text
negative inventory
negative order quantities
negative prices
invalid order transitions
duplicate payment records
duplicate webhook processing
duplicate refunds
```

Database constraints and application validation should work together.

---

# 55. Deployment

Production architecture:

```text
CDN
 ↓
Frontend
 ↓
Reverse Proxy
 ↓
Node.js API
 ↓
Redis
 ↓
MongoDB Atlas
```

Payment providers communicate with:

```text
/api/payments/webhook
```

Background workers process:

```text
Jobs
Retries
Reservations
Emails
Reconciliation
```

---

# 56. Docker

Provide:

```text
Dockerfile
docker-compose.yml
.dockerignore
```

Local development should be easy:

```bash
docker compose up
```

Services:

```text
frontend
backend
mongodb
redis
worker
```

MongoDB Atlas can replace local MongoDB in production.

---

# 57. CI/CD

Pipeline should include:

```text
Install
↓
Lint
↓
Unit Tests
↓
Integration Tests
↓
Build
↓
Security Checks
↓
Deploy
```

Never deploy code that fails critical tests.

---

# 58. Git Rules

Use conventional commits:

```text
feat:
fix:
refactor:
perf:
test:
docs:
chore:
security:
```

Examples:

```text
feat: add atomic inventory reservation
fix: prevent duplicate webhook processing
security: validate payment webhook signatures
perf: optimize product search
```

Do not commit:

```text
.env
credentials
API keys
payment secrets
private certificates
```

---

# 59. Coding Rules

Prefer:

```javascript
const
async/await
early returns
small functions
explicit names
pure utility functions
```

Avoid:

```javascript
deeply nested callbacks
giant controllers
giant components
duplicated business logic
magic numbers
silent errors
```

Use comments to explain **why**, not obvious code behavior.

---

# 60. Production Checkout Invariant

The following invariant must always hold:

```text
A customer can never purchase more inventory
than the system has successfully reserved.
```

The backend database must enforce this.

The frontend must never be responsible for enforcing this rule.

---

# 61. Production Payment Invariant

The following invariant must always hold:

```text
An order cannot become PAID
until the backend has verified payment.
```

Frontend payment callbacks are not sufficient.

Webhook/provider verification is authoritative.

---

# 62. Production Order Invariant

Order state must always follow a valid state transition.

Never allow arbitrary:

```javascript
order.status = req.body.status;
```

Instead:

```javascript
transitionOrder(order, targetStatus);
```

The transition service must validate the current state and target state.

---

# 63. Critical Business Flow

The complete production flow should look like:

```text
                 CUSTOMER
                    │
                    ▼
                 PRODUCT
                    │
                    ▼
                  CART
                    │
                    ▼
                CHECKOUT
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
     Validate Cart       Calculate Total
          │                   │
          └─────────┬─────────┘
                    ▼
             Reserve Inventory
                    │
             ┌──────┴──────┐
             │             │
          Success        Failed
             │             │
             ▼             ▼
        Create Order    Out of Stock
             │
             ▼
       Create Payment
             │
             ▼
        Payment Provider
             │
       ┌─────┴─────┐
       │           │
    Success       Failed
       │           │
       ▼           ▼
    Webhook      Release Stock
       │
       ▼
 Verify Signature
       │
       ▼
 Verify Amount
       │
       ▼
 Mark Payment PAID
       │
       ▼
 Confirm Order
       │
       ▼
 Finalize Inventory
       │
       ▼
 Send Confirmation
```

---

# 64. Definition of Done

A feature is not considered complete until:

* Frontend implemented
* Backend API implemented
* Validation implemented
* Authorization implemented
* Database indexes reviewed
* Error handling implemented
* Loading/error/empty states implemented
* Tests added
* Security reviewed
* Logging implemented where appropriate
* Race conditions considered
* Idempotency considered for critical operations
* Documentation updated
* Environment variables documented
* Production failure scenarios considered

---

# 65. AI Coding Agent Rules

When modifying this project:

1. Inspect the existing architecture before changing it.
2. Reuse existing utilities and services.
3. Do not create duplicate abstractions.
4. Do not rewrite working modules unnecessarily.
5. Never bypass authentication or authorization.
6. Never trust client-side payment information.
7. Never mutate inventory without concurrency protection.
8. Never bypass order state transitions.
9. Never process webhooks without signature verification.
10. Never remove tests to make a feature pass.
11. Add regression tests for important bugs.
12. Keep changes focused.
13. Explain architectural changes when they affect critical flows.
14. Prefer backward-compatible database migrations.
15. Never expose secrets.
16. Never use mock payment success logic in production code.
17. Never use fake inventory logic in production code.
18. Never silently swallow errors.

---

# 66. Most Important Interview Talking Point

This project should demonstrate understanding of:

```text
Race Conditions
Transactions
Atomic Updates
Inventory Reservation
Idempotency
Payment Webhooks
Distributed Systems
State Machines
Consistency
Failure Recovery
```

The key explanation should be:

> Inventory cannot be protected by checking stock and then updating it in separate operations. Multiple requests can observe the same stock before either updates it. The system therefore performs an atomic conditional inventory update that succeeds only when sufficient stock exists, combined with reservation state, transactions where appropriate, idempotency keys, and reliable payment webhooks.

That architecture prevents the classic:

```text
check stock
    ↓
stock available
    ↓
update stock
```

race condition.

Instead:

```text
atomic conditional update
        ↓
reservation created
        ↓
payment
        ↓
confirm OR release
```

This is the core production-grade design of the platform.
