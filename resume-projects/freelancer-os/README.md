# Floorly 🚀

**Never undercharge again — Global AI Business & Proposal Engine**
Built according to [AGENTS.md](file:///d:/whats-matter-series/cohort-2.0%20restart/resume-projects/freelancer-os/AGENTS.md).

Floorly is a production-ready, full-stack SaaS application engineered for independent freelancers, web developers, designers, and small digital agencies to convert unstructured client briefs into professional proposals, transparent quotations with strict floor price enforcement, project execution roadmaps, client-specific `AGENTS.md` instructions, and trackable financial records across global currencies (USD, EUR, GBP, INR, AUD, CAD, AED, SGD).

---

## 🎨 Visual Direction & Design

* **Theme:** Clean modern light theme
* **Backgrounds:** Off-white (`#F8FAFC`) with crisp pure white card surfaces (`#FFFFFF`)
* **Typography:** Charcoal primary (`#0F172A`) and slate secondary (`#475569`) with Plus Jakarta Sans and JetBrains Mono
* **Accents:** Restrained professional blue and indigo (`#4F46E5`, `#2563EB`)
* **Borders & Shadows:** Subtle hairline borders (`#E2E8F0`) and micro-elevation shadows (`0 1px 3px rgba(15, 23, 42, 0.05)`)

---

## ✨ Core Features & Workflows

1. **Dashboard:** High-level metrics for Contracted Revenue, Invoiced, Received, Receivables, Overdue, and Net Profit Margin with interactive monthly cash inflow charts.
2. **AI Requirement Analyzer:** Multi-stage (LangGraph-inspired) workflow that ingests raw WhatsApp messages, emails, or briefs and extracts features, ambiguities, clarification questions, effort hours, risks, and acceptance criteria.
3. **Smart Pricing Engine:** Deterministic calculation engine with server-side minimum floor enforcement. Generates 3 transparent tiers: Minimum Acceptable, Recommended, and Premium.
4. **Proposals & Quotations Studio:** Full proposal builder with itemized deliverables, payment milestone schedules, and printable contract previews.
5. **Client CRM:** Customer records, communication history, total contracted value, and live receivable balances.
6. **Projects & Scope Change Management:** Milestone tracker, task checklists, and a formal change-order system that prevents unbilled scope creep.
7. **Client-Specific AGENTS.md Generator:** Generates a 20-section comprehensive technical guide tailored specifically for AI coding agents to implement the client's approved application.
8. **Invoices & Payment Reconciliation:** Milestone invoices with partial/advance payment recording, automatic balance due recalculation, and payment receipts.
9. **Expenses & Profit:** Direct overhead logging (API credits, hosting, domains) with net project margin calculations.
10. **Pricing Rules & Floor Guard:** Live simulator and configuration interface for hourly rates, category minimums, complexity multipliers, and rush fees.

---

## 🛠️ Technology Stack

* **Frontend:** React 18, Vite, Tailwind CSS, Lucide React, Framer Motion, TanStack Query, Zustand, Recharts.
* **Backend:** Node.js (ES Modules), Express.js, JWT Authentication, Zod validation, Pino structured logging.
* **AI Layer:** Google Gemini API integration with deterministic semantic fallback pipeline.
* **Database:** Unified Mongoose data models with embedded fallback store for instant zero-dependency execution.

---

## 🚀 Getting Started

### Prerequisites
* Node.js v18+ and npm installed

### Running Locally
```bash
# Install root, server, and client dependencies
npm install
npm --prefix server install
npm --prefix client install

# Start both backend API (port 5000) and frontend (port 5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
The API server runs on [http://localhost:5000](http://localhost:5000) with a health check at [http://localhost:5000/health](http://localhost:5000/health).

---

## 🧪 Testing

```bash
# Run backend deterministic pricing engine unit tests
npm test
```
