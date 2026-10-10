/**
 * Generator for project-specific AGENTS.md technical execution instructions
 * Designed specifically for autonomous coding agents (Claude Engineer, Cursor, Windsurf, Aider).
 */
export class AgentsDocGenerator {
  /**
   * Generates technical specification markdown for web & software projects
   * @param {Object} projectData
   * @param {Object} projectData.project - Project entity or Analysis entity
   * @param {Object} projectData.client - Client entity
   * @param {Object} projectData.user - Freelancer/agency entity
   * @returns {string} Fully structured AGENTS.md specification markdown
   */
  static generate(projectData) {
    const { project, client, user } = projectData;
    const title = project.title || project.projectTitle || 'Client Application';
    const clientName = client?.company || client?.name || 'Client';
    const freelanceName = user?.businessName || user?.name || 'Floorly Freelance Engineering Specialist';
    const projectType = project.projectType || 'custom-web-apps';

    const confirmedReqs = (project.confirmedRequirements || []).map(r => `* ${r}`).join('\n') || '* Responsive UI supporting desktop and mobile devices\n* Robust API contracts and schema validation\n* Error handling, input sanitization, and clean feedback states';
    const exclusions = (project.exclusions || []).map(e => `* ${e}`).join('\n') || '* Legacy data migrations\n* Unapproved out-of-scope revisions\n* Third-party software or advertising fees';
    const deliverables = (project.deliverables || []).map(d => `* ${d}`).join('\n') || '* Production-ready web application build\n* Tested REST API and verified database migrations\n* Comprehensive technical documentation & runbooks';
    const acceptance = (project.acceptanceCriteria || []).map(a => `* ${a}`).join('\n') || '* Verified against agreed scope and unit tests pass\n* Zero high-severity vulnerabilities in dependency audits\n* Signed off in milestone review';

    const pages = (project.pagesAndFeatures || [
      { name: 'Core Application Architecture & Dashboard', hours: 16, complexity: 'medium' },
      { name: 'API Contracts & Database Integration', hours: 14, complexity: 'medium' },
      { name: 'Security, Form Validation & Quality Assurance', hours: 10, complexity: 'simple' },
    ]).map(p => `- **${p.name}** (Complexity: ${p.complexity}, Estimated: ${p.hours}h)`).join('\n');

    const integrations = (project.thirdPartyIntegrations || []).map(i => `* ${i}`).join('\n') || '* Transactional Email Provider\n* Object Storage (S3 API)\n* Payment Gateway (Stripe)';

    return `# AGENTS.md — Technical Architecture & Implementation Guide
**Project:** ${title}
**Client:** ${clientName}
**Contracted Lead / Engineering:** ${freelanceName}
**Generated Date:** ${new Date().toISOString().split('T')[0]}

---

## 1. Project Overview and Objectives
* **Objective:** Build and deploy a secure, high-performance web application for ${clientName}.
* **Scope Summary:** ${project.clientObjectives || 'Deliver a robust, customer-facing digital platform.'}
* **Target Audience:** ${project.targetAudience || 'End users, administrators, and business operators.'}
* **Project Type:** ${projectType}

## 2. Scope and Explicit Exclusions
### Included Scope:
${confirmedReqs}

### Explicit Exclusions (Out of Scope):
${exclusions}

## 3. Confirmed Requirements and Unresolved Questions
### Confirmed Requirements:
${confirmedReqs}

### Unresolved Technical Questions:
* Confirm staging credentials for third-party endpoints.
* Verify domain DNS delegation for production SSL certificate issuance.

## 4. Technology Stack and Architecture
* **Frontend:** React 18+ / Vite, Tailwind CSS, TanStack Query for remote state, Lucide React icons.
* **Backend:** Node.js (ES modules), Express.js REST API with input validation.
* **Database:** MongoDB / PostgreSQL with strict schemas and index definitions.
* **Authentication:** JWT tokens stored in HTTP-only secure cookies with CSRF validation.
* **Logging & Observability:** Structured JSON logging (Pino).

## 5. Application Folder Structure
\`\`\`text
project-root/
├── client/
│   ├── src/
│   │   ├── components/       # Shared UI components (Button, Modal, Card, Table)
│   │   ├── features/         # Feature-sliced modules (Auth, Dashboard, Workflows)
│   │   ├── hooks/            # Custom React hooks
│   │   ├── lib/              # API clients and query configurations
│   │   └── App.jsx           # Root layout and routing
│   └── tailwind.config.js
├── server/
│   ├── src/
│   │   ├── config/           # Database and environment configurations
│   │   ├── controllers/      # Route request handlers
│   │   ├── middleware/       # Auth, rate-limiting, error handler
│   │   ├── models/           # Schemas & queries
│   │   ├── routes/           # Versioned API routes (/api/v1)
│   │   └── index.js          # Server bootstrap
│   └── package.json
└── package.json
\`\`\`

## 6. Design System and UI Guidelines
* **Palette:** Clean modern light theme with high contrast, off-white surface backgrounds (\`#F8FAFC\`), crisp borders (\`#E2E8F0\`), and restrained indigo/brand accents.
* **Typography:** Modern clean sans-serif (Inter / Plus Jakarta Sans).
* **Components:** Accessible keyboard focus states, skeleton loaders, subtle hover transitions.

## 7. Frontend Implementation Plan
${pages}

## 8. Backend Implementation Plan
* Set up Express REST endpoints under \`/api/v1\`.
* Validate all request bodies, params, and queries using strict schemas.
* Handle database connection pooling and graceful shutdown.

## 9. Database Schema and Relationships
* Primary entities with indexed foreign keys.
* Integer minor units or standard decimal formatting for financial values.
* Automatic timestamps (\`createdAt\`, \`updatedAt\`).

## 10. API Contracts and Validation
* \`POST /api/v1/auth/login\` — User authentication
* \`GET /api/v1/resource\` — Paginated resource list
* \`POST /api/v1/resource\` — Create resource with schema validation
* Standard JSON response wrapper: \`{ success: true, data: ... }\` or \`{ success: false, error: ... }\`.

## 11. Authentication and Authorization
* Password hashing using bcrypt with salt rounds >= 10.
* Stateless JWT session validation middleware.
* Strict tenant isolation checking user ownership on every database query.

## 12. Third-Party Integrations
${integrations}

## 13. Security and Privacy
* Rate limiting on public and authentication endpoints.
* Helmet HTTP security headers.
* CORS allowlist strictly matching frontend origin.
* Never log sensitive credentials, passwords, or customer PII.

## 14. Performance and Accessibility
* Lighthouse target score >= 90 across Performance, Accessibility, and Best Practices.
* Semantic HTML5 elements (\`<main>\`, \`<nav>\`, \`<article>\`, \`<header>\`).
* Code-splitting on routes using \`React.lazy\`.

## 15. Error Handling and Observability
* Centralized Express error handler returning structured JSON errors.
* Correlation request IDs attached to each request header.
* Graceful fallback states in React via Error Boundaries.

## 16. Testing Strategy
* Unit tests for calculation engines and critical utility functions.
* Integration tests for authentication and data CRUD endpoints.
* End-to-end smoke tests for the primary user flow.

## 17. Deployment and Environment Configuration
* \`PORT\`: API listening port
* \`DATABASE_URL\`: Connection string
* \`JWT_SECRET\`: High-entropy signing secret
* Deployment target: Docker container / cloud hosting platform.

## 18. Development Milestones
* **Milestone 1:** Repository initialization, schemas, and authentication scaffolding.
* **Milestone 2:** Core feature workflows, interactive dashboard, and business logic.
* **Milestone 3:** Final integration tests, polish, and production handover.

## 19. Definition of Done
* All unit and integration tests pass.
* Zero build errors or unhandled console warnings.
* Full documentation provided in \`AGENTS.md\` and \`README.md\`.

## 20. Acceptance Criteria
${acceptance}
`;
  }
}
