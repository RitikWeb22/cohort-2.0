import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.js';
import { logger } from '../logger.js';
import { getProfessionConfig } from '../config/professions.js';

export class AIRequirementAnalyzer {
  /**
   * Run the multi-stage requirement analysis workflow
   * @param {Object} input
   * @param {string} input.rawText - Client message, email, or brief
   * @param {string} [input.projectType] - Optional user override for project type
   * @param {string} [input.field] - User profession/field
   * @param {string} [input.clientName] - Optional client identifier
   */
  static async analyze(input) {
    const raw = (input.rawText || '').trim();
    if (!raw) {
      throw new Error('Project brief or client message cannot be empty');
    }

    const field = input.field || 'web_developer';

    // Step 1: Input Normalization & Sanitization
    const sanitizedInput = raw.replace(/[<>]/g, '');

    // If Gemini API Key is configured, attempt LLM call
    if (config.geminiApiKey) {
      try {
        const result = await this.callGemini(sanitizedInput, input.projectType, field);
        if (result && result.projectTitle) {
          return {
            ...result,
            rawInput: raw,
            provider: 'gemini',
          };
        }
      } catch (err) {
        logger.warn({ err: err.message }, 'Gemini API call failed, falling back to deterministic semantic pipeline');
      }
    }

    // High quality deterministic semantic analyzer pipeline
    return this.deterministicPipeline(sanitizedInput, input.projectType, field);
  }

  static validateAnalysisSchema(obj) {
    if (!obj || typeof obj !== 'object') return false;
    if (typeof obj.projectTitle !== 'string' || !obj.projectTitle.trim()) return false;
    if (!Array.isArray(obj.pagesAndFeatures) || obj.pagesAndFeatures.length === 0) return false;
    const allValidTasks = obj.pagesAndFeatures.every(t => t && typeof t.name === 'string' && typeof t.hours === 'number' && !isNaN(t.hours));
    if (!allValidTasks) return false;
    return true;
  }

  static async callGemini(text, projectTypeOverride, field = 'web_developer') {
    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    // Models configured strictly via environment variables (no hardcoded fallback list)
    const candidateModels = [
      ...new Set([
        config.aiPrimaryModel,
        config.geminiModel,
        config.aiFallbackModel,
      ].filter(Boolean))
    ];

    const prof = getProfessionConfig(field);
    const catList = prof.categories.map(c => c.id).join(', ');

    let persona = `You are Floorly AI, an expert software architect and technical scoping lead for independent freelancers.`;
    let rules = `1. For simple landing pages or single-page websites:
   - Estimate realistic hours between 6 to 14 total hours (NOT 40+ hours).
   - Do NOT add unnecessary enterprise databases or microservices if not requested.
2. For business websites / CMS: Estimate 18 to 30 hours.
3. For custom web applications / SaaS / AI: Estimate 35 to 80+ hours.`;

    if (field === 'graphic_designer') {
      persona = `You are Floorly AI, an expert creative director and brand scoping lead for professional graphic designers and visual artists.`;
      rules = `1. For logo design or brand identity kits: Estimate 8 to 16 total hours. Focus on concept sketches, vector master files, color guides, and typography.
2. For full brand guideline systems or packaging: Estimate 20 to 35 hours.
3. For social media graphics or pitch decks: Estimate 6 to 14 hours.
4. Exclude website coding, software development, or printing expenses unless explicitly requested.`;
    } else if (field === 'content_writer') {
      persona = `You are Floorly AI, an expert editorial director and conversion copywriting strategist for freelance copywriters and content creators.`;
      rules = `1. For 4-5 page website copy: Estimate 10 to 18 total hours (research, wireframe copy, headlines, CTAs).
2. For SEO blog post batches: Estimate 8 to 14 hours (keyword analysis, outlines, drafting, proofing).
3. For sales letters or email sequences: Estimate 6 to 12 hours.
4. Exclude web design, server setup, or visual branding.`;
    } else if (field === 'ui_ux_designer') {
      persona = `You are Floorly AI, an expert lead product designer and UI/UX strategist for freelance digital product designers.`;
      rules = `1. For UX audits and conversion redesigns: Estimate 12 to 20 hours.
2. For mobile app interfaces or SaaS dashboards: Estimate 25 to 50 hours (user flows, wireframes, high-fi Figma components).
3. For design systems and tokens: Estimate 30 to 60 hours.
4. Clarify whether dev handoff or clickable prototyping is required.`;
    } else if (field === 'video_editor') {
      persona = `You are Floorly AI, an expert post-production supervisor and motion design lead for freelance video editors.`;
      rules = `1. For batch of short-form reels / TikToks: Estimate 6 to 15 hours.
2. For long-form YouTube episodes: Estimate 8 to 18 hours.
3. For commercial promos or motion graphics: Estimate 15 to 30 hours.
4. Exclude live in-person video shooting and equipment rental unless requested.`;
    } else if (field === 'digital_marketer') {
      persona = `You are Floorly AI, an expert digital marketing director and growth strategist for freelance marketing consultants.`;
      rules = `1. For SEO technical audits: Estimate 10 to 18 hours.
2. For PPC ad campaign setups: Estimate 12 to 22 hours (audience research, ad angles, pixel tracking, launch QA).
3. For monthly retainers: Estimate 15 to 30 hours.
4. Clearly state that ad spend paid directly to ad platforms (Google/Meta) is excluded from freelancer fees.`;
    }

    const prompt = `${persona}
Analyze this unstructured client message/brief and extract a comprehensive, structured project scope tailored for a ${prof.name}.

CRITICAL ESTIMATION & SCOPING RULES:
${rules}
- Each estimated task in "pagesAndFeatures" MUST have a confidence rating: "high", "medium", or "low".
- Clarification questions MUST be specific and directly relevant to the client's provided text.

Return ONLY a valid JSON object with the following schema:
{
  "projectTitle": "Clear, professional project title",
  "projectType": "${projectTypeOverride || prof.categories[0]?.id || 'custom-web-apps'}", // one of: ${catList}
  "clientObjectives": "High-level commercial or creative objective",
  "targetAudience": "Primary target audience or customers",
  "confirmedRequirements": ["array of explicit requirements mentioned"],
  "unconfirmedAssumptions": ["array of unstated assumptions that need validation"],
  "functionalRequirements": ["detailed bullet points of deliverables/features"],
  "nonFunctionalRequirements": ["quality standards, responsiveness, formatting, delivery specs"],
  "pagesAndFeatures": [
    { "name": "Deliverable or Feature Name", "hours": 4, "complexity": "simple" | "medium" | "complex", "confidence": "high" | "medium" | "low" }
  ],
  "backendRequirements": "Technical or asset delivery infrastructure requirements",
  "thirdPartyIntegrations": ["array of tools, platforms, or dependencies"],
  "deliverables": ["array of final tangible deliverables"],
  "exclusions": ["explicitly excluded items to prevent scope creep"],
  "dependencies": ["things needed from client before start"],
  "clarificationQuestions": [
    { "question": "Precise project-specific question for the client", "answer": "", "resolved": false }
  ],
  "estimatedHours": 10,
  "complexity": "simple" | "medium" | "complex",
  "projectRisks": ["creative or timeline risks identified"],
  "suggestedMilestones": [
    { "title": "Milestone title", "hours": 5, "percentage": 50 }
  ],
  "acceptanceCriteria": ["verifiable conditions to sign off on project"]
}

CLIENT TEXT:
"""${text}"""
`;

    let lastError = null;
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const response = await model.generateContent(prompt);
        const rawContent = response.response.text();
        const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        if (this.validateAnalysisSchema(parsed)) {
          // Normalize confidence ratings
          if (Array.isArray(parsed.pagesAndFeatures)) {
            parsed.pagesAndFeatures = parsed.pagesAndFeatures.map(item => ({
              ...item,
              confidence: item.confidence || 'high',
            }));
          }
          return parsed;
        } else {
          logger.warn({ model: modelName }, 'AI output failed schema validation, trying next candidate');
        }
      } catch (err) {
        lastError = err;
        logger.warn({ model: modelName, err: err.message }, 'Gemini model attempt failed, trying next candidate');
      }
    }
    throw lastError || new Error('All Gemini model calls failed schema validation');
  }

  /**
   * Deterministic semantic analysis engine
   */
  static deterministicPipeline(text, projectTypeOverride, field = 'web_developer') {
    const lower = text.toLowerCase();
    const prof = getProfessionConfig(field);

    if (field !== 'web_developer') {
      let detectedType = projectTypeOverride || prof.categories[0].id;
      for (const cat of prof.categories) {
        if (lower.includes(cat.id.replace(/-/g, ' ')) || lower.includes(cat.id.split('-')[0])) {
          detectedType = cat.id;
          break;
        }
      }

      const firstSentence = text.split(/[.\n]/)[0].trim();
      const title = firstSentence.length > 8 && firstSentence.length < 80
        ? firstSentence
        : `${prof.shortName} Project: ${detectedType.replace(/-/g, ' ').toUpperCase()}`;

      const features = (prof.defaultProposalItems || []).map((item, idx) => ({
        name: item.description,
        hours: item.hours || 3,
        complexity: idx > 2 ? 'medium' : 'simple',
        confidence: 'high'
      }));

      const totalHours = features.reduce((acc, f) => acc + f.hours, 0);

      const clarificationQuestions = [
        {
          question: `What are your core brand guidelines, reference files, or moodboard inspiration for this project?`,
          answer: '',
          resolved: false,
        },
        {
          question: `What is your definitive delivery timeline or key launch date?`,
          answer: '',
          resolved: false,
        },
        {
          question: `Are all source assets, copy drafts, and raw media ready to supply before kickoff?`,
          answer: '',
          resolved: false,
        }
      ];

      return {
        projectTitle: title,
        projectType: detectedType,
        rawInput: text,
        provider: 'deterministic-rules',
        clientObjectives: `Deliver professional, high-standard ${prof.shortName.toLowerCase()} solutions that achieve the client's strategic goals.`,
        targetAudience: 'Target market audience and prospective customers.',
        confirmedRequirements: [
          `Approved project deliverables aligned to ${prof.shortName} industry standards`,
          'Timely draft reviews and structured feedback checkpoints',
          'Production master assets delivered in all industry-standard formats',
        ],
        unconfirmedAssumptions: [
          'Client will supply necessary brand assets, creative briefs, or footage within 48 hours',
          'Third-party software, fonts, ad spend, or printing fees are not included in this quote',
        ],
        functionalRequirements: features.map(f => `${f.name} (${f.hours}h estimated)`),
        nonFunctionalRequirements: [
          'High resolution master files and multi-format exports',
          'Strict adherence to client visual identity and editorial guidelines',
          '2 structured revision rounds included within approved scope',
        ],
        pagesAndFeatures: features,
        backendRequirements: `Asset Delivery: Cloud transfer (Google Drive / Dropbox / Figma / Frame.io) with master source files included.`,
        thirdPartyIntegrations: ['Cloud Storage', 'Review & Approval Portal'],
        deliverables: features.map(f => f.name),
        exclusions: [
          'Additional revision cycles outside the agreed scope',
          'Direct third-party advertising or physical manufacturing/printing charges',
          'Out-of-scope ancillary services',
        ],
        dependencies: [
          'Client brief approval and initial upfront deposit',
          'Prompt review sign-off within 48 hours per milestone',
        ],
        clarificationQuestions,
        estimatedHours: totalHours,
        complexity: totalHours > 25 ? 'medium' : 'simple',
        projectRisks: [
          'Late feedback cycles may shift target milestone delivery dates',
          'Mid-project creative pivots without change orders could cause delays',
        ],
        suggestedMilestones: [
          { title: 'Milestone 1: Creative Discovery & Concept Drafts', hours: Math.round(totalHours * 0.4), percentage: 40 },
          { title: 'Milestone 2: Review Iteration & Refinement', hours: Math.round(totalHours * 0.35), percentage: 35 },
          { title: 'Milestone 3: Final Master Export & Handoff', hours: Math.round(totalHours * 0.25), percentage: 25 },
        ],
        acceptanceCriteria: [
          'All promised milestone assets submitted and reviewed',
          'Final master deliverables delivered in high-resolution master formats',
        ],
      };
    }

    // Detect Project Type (Developer default)
    let detectedType = projectTypeOverride || 'custom-web-apps';
    if (!projectTypeOverride) {
      if (lower.includes('shop') || lower.includes('e-commerce') || lower.includes('cart') || lower.includes('checkout') || lower.includes('product')) {
        detectedType = 'e-commerce';
      } else if (lower.includes('landing') || lower.includes('one page') || lower.includes('lead gen')) {
        detectedType = 'landing-pages';
      } else if (lower.includes('ai') || lower.includes('gpt') || lower.includes('llm') || lower.includes('bot') || lower.includes('rag')) {
        detectedType = 'ai-integrations';
      } else if (lower.includes('api') || lower.includes('database') || lower.includes('microservice') || lower.includes('backend')) {
        detectedType = 'api-backend';
      } else if (lower.includes('saas') || lower.includes('subscription') || lower.includes('multi-tenant')) {
        detectedType = 'saas-applications';
      } else if (lower.includes('website') || lower.includes('redesign') || lower.includes('corporate')) {
        detectedType = 'business-websites';
      }
    }

    // Derive Project Title
    const firstSentence = text.split(/[.\n]/)[0].trim();
    let title = firstSentence.length > 10 && firstSentence.length < 75 
      ? firstSentence 
      : `Client Project: ${detectedType.replace(/-/g, ' ').toUpperCase()}`;

    // Extract pages & tasks based on project type and common keywords
    const features = [];
    if (detectedType === 'landing-pages') {
      features.push({ name: 'Hero Section, Value Proposition & CTA', hours: 3, complexity: 'simple', confidence: 'high' });
      features.push({ name: 'Content Showcase, Product Catalog & Gallery', hours: 4, complexity: 'simple', confidence: 'high' });
      features.push({ name: 'Inquiry Form & Direct Communication Channel', hours: 3, complexity: 'simple', confidence: 'high' });
      if (lower.includes('animation') || lower.includes('3d') || lower.includes('motion')) {
        features.push({ name: 'Micro-interactions & Smooth Scroll Effects', hours: 4, complexity: 'medium', confidence: 'medium' });
      }
    } else {
      if (lower.includes('login') || lower.includes('auth') || lower.includes('user') || lower.includes('account')) {
        features.push({ name: 'User Authentication, Profiles & Session Management', hours: 8, complexity: 'simple', confidence: 'high' });
      }
      if (lower.includes('dashboard') || lower.includes('portal') || lower.includes('analytics') || lower.includes('metrics')) {
        features.push({ name: 'Interactive Analytics & Management Dashboard', hours: 14, complexity: 'medium', confidence: 'high' });
      }
      if (lower.includes('payment') || lower.includes('checkout') || lower.includes('stripe') || lower.includes('paypal') || lower.includes('invoice')) {
        features.push({ name: 'Payment Gateway Integration & Receipt Automation', hours: 10, complexity: 'medium', confidence: 'high' });
      }
      if (lower.includes('track') || lower.includes('map') || lower.includes('gps') || lower.includes('live')) {
        features.push({ name: 'Live Telemetry & Interactive Map Module', hours: 14, complexity: 'complex', confidence: 'medium' });
      }
      if (lower.includes('search') || lower.includes('filter') || lower.includes('table') || lower.includes('grid')) {
        features.push({ name: 'Data Grid View with Multi-criteria Filtering & Export', hours: 8, complexity: 'simple', confidence: 'high' });
      }
      if (lower.includes('notify') || lower.includes('chat') || lower.includes('email') || lower.includes('alert')) {
        features.push({ name: 'Automated Notifications & Webhook Event Trigger', hours: 6, complexity: 'medium', confidence: 'high' });
      }

      // Default features if few matched
      if (features.length < 2) {
        features.push({ name: 'Core Application Interface & Workflows', hours: 12, complexity: 'simple', confidence: 'high' });
        features.push({ name: 'Data Management & Production Deployment', hours: 8, complexity: 'simple', confidence: 'high' });
      }
    }

    const totalHours = features.reduce((acc, f) => acc + f.hours, 0);
    const complexity = totalHours > 50 ? 'complex' : totalHours > 20 ? 'medium' : 'simple';

    // Dynamic Context-Driven Clarification Questions
    const clarificationQuestions = [];
    if (lower.includes('cafe') || lower.includes('restaurant') || lower.includes('food') || lower.includes('menu')) {
      clarificationQuestions.push({
        question: 'Do you already have the final menu items, pricing, and high-resolution food photography ready?',
        answer: '',
        resolved: false,
      });
      clarificationQuestions.push({
        question: 'Should the contact section support direct table reservation requests or general WhatsApp inquiries?',
        answer: '',
        resolved: false,
      });
    }

    if (lower.includes('whatsapp')) {
      clarificationQuestions.push({
        question: 'What is the designated WhatsApp business phone number and default pre-filled message for incoming inquiries?',
        answer: '',
        resolved: false,
      });
    }

    if (lower.includes('shop') || lower.includes('e-commerce') || lower.includes('product') || lower.includes('cart')) {
      clarificationQuestions.push({
        question: 'How many initial products will be listed, and which payment gateway (Stripe, Razorpay, or Cash on Delivery) do you plan to use?',
        answer: '',
        resolved: false,
      });
    }

    if (clarificationQuestions.length < 2) {
      clarificationQuestions.push({
        question: 'Do you already have a domain name and web hosting account configured, or should we set those up for you?',
        answer: '',
        resolved: false,
      });
      clarificationQuestions.push({
        question: 'Do you have existing brand assets (vector logo, color palette, font preferences) or should we design the visual style from scratch?',
        answer: '',
        resolved: false,
      });
    }

    if (clarificationQuestions.length < 3) {
      clarificationQuestions.push({
        question: 'What is your target launch deadline for going live?',
        answer: '',
        resolved: false,
      });
    }

    return {
      projectTitle: title,
      projectType: detectedType,
      rawInput: text,
      provider: 'deterministic-rules',
      clientObjectives: `Deliver a modern, production-grade ${detectedType.replace(/-/g, ' ')} that streamlines core user workflows and provides clear business transparency.`,
      targetAudience: 'End customers, operational staff, and business administrators.',
      confirmedRequirements: [
        'Responsive layout supporting modern mobile, tablet, and desktop viewports',
        'Stateful UI with instant error handling, empty states, and validation',
        'Structured modular architecture allowing seamless feature expansion',
      ],
      unconfirmedAssumptions: [
        'Client will provide API credentials, brand assets, and test accounts within 3 business days of kickoff',
        'Hosting and third-party SaaS subscriptions will be billed directly to the client account',
      ],
      functionalRequirements: features.map(f => `${f.name} (${f.hours}h estimated)`),
      nonFunctionalRequirements: [
        'Lighthouse performance score >= 90',
        'WCAG 2.1 AA accessible typography, visible focus rings, and contrast',
        'Zero console warnings and strict typed API contracts',
      ],
      pagesAndFeatures: features,
      backendRequirements: 'Node.js/Express REST endpoints with validated schemas, secure JWT or session cookies, and database persistence.',
      thirdPartyIntegrations: ['Transactional Mail / SMS provider', 'Cloud Object Storage (S3-compatible)', 'Analytics or Monitoring'],
      deliverables: [
        'Full source code repository with clean git history',
        'Comprehensive documentation and developer instructions (AGENTS.md)',
        'Staging preview deployment URL and production deployment guide',
      ],
      exclusions: [
        'Native Apple App Store or Google Play Store mobile application packaging',
        'Manual ongoing data entry or content creation not specified in the agreement',
        'Payment of third-party API subscription fees or custom domain purchases',
      ],
      dependencies: [
        'Production/Staging environment access and API keys',
        'Timely client feedback within 48 hours for milestone review checkpoints',
      ],
      clarificationQuestions,
      estimatedHours: totalHours,
      complexity,
      projectRisks: [
        'Unconfirmed third-party API specifications may require revision cycles',
        'Ambiguous initial requirements could introduce mid-project scope adjustments if unclarified',
      ],
      suggestedMilestones: [
        { title: 'Milestone 1: Architectural Setup, Wireframes & Core Foundation', hours: Math.round(totalHours * 0.3), percentage: 30 },
        { title: 'Milestone 2: Primary Feature Workflows & API Integrations', hours: Math.round(totalHours * 0.45), percentage: 45 },
        { title: 'Milestone 3: End-to-End QA, Polish & Production Release', hours: Math.round(totalHours * 0.25), percentage: 25 },
      ],
      acceptanceCriteria: [
        'All specified pages render error-free across modern web browsers',
        'Responsive layout verified on mobile (375px), tablet (768px), and desktop (1440px)',
        'Full test suite and build pipeline pass successfully',
      ],
    };
  }
}
