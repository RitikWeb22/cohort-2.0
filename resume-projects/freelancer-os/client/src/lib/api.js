/**
 * API client helper for Floorly
 */

const rawBase = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = rawBase ? (rawBase.endsWith('/api/v1') ? rawBase : `${rawBase.replace(/\/$/, '')}/api/v1`) : '/api/v1';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('floorly_token') || localStorage.getItem('freelanceos_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMsg = data.error || `HTTP ${response.status}: ${response.statusText}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.code = data.code;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  getMe: () => apiRequest('/auth/me'),
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (payload) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  updateProfile: (profile) => apiRequest('/auth/profile', { method: 'PATCH', body: JSON.stringify(profile) }),
  forgotPassword: (email) => apiRequest('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (payload) => apiRequest('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),

  // Dashboard
  getDashboardMetrics: () => apiRequest('/dashboard/metrics'),

  // Clients
  getClients: (params = '') => apiRequest(`/clients${params}`),
  getClient: (id) => apiRequest(`/clients/${id}`),
  createClient: (client) => apiRequest('/clients', { method: 'POST', body: JSON.stringify(client) }),
  updateClient: (id, client) => apiRequest(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(client) }),
  deleteClient: (id) => apiRequest(`/clients/${id}`, { method: 'DELETE' }),
  addClientNote: (id, text) => apiRequest(`/clients/${id}/notes`, { method: 'POST', body: JSON.stringify({ text }) }),
  deleteClientNote: (id, noteId) => apiRequest(`/clients/${id}/notes/${noteId}`, { method: 'DELETE' }),

  // Requirement Analysis
  getAnalyses: () => apiRequest('/analyses'),
  getAnalysis: (id) => apiRequest(`/analyses/${id}`),
  getAnalysisConfig: () => apiRequest('/analyses/config'),
  createAnalysis: (payload) => apiRequest('/analyses', { method: 'POST', body: JSON.stringify(payload) }),
  updateAnalysis: (id, payload) => apiRequest(`/analyses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  resolveQuestion: (id, payload) => apiRequest(`/analyses/${id}/questions`, { method: 'POST', body: JSON.stringify(payload) }),
  approveAnalysis: (id) => apiRequest(`/analyses/${id}/approve`, { method: 'POST' }),

  // Pricing
  getPricingSettings: () => apiRequest('/pricing/settings'),
  updatePricingSettings: (settings) => apiRequest('/pricing/settings', { method: 'PATCH', body: JSON.stringify(settings) }),
  estimateQuotation: (payload) => apiRequest('/pricing/estimate', { method: 'POST', body: JSON.stringify(payload) }),
  validateQuote: (payload) => apiRequest('/pricing/validate-quote', { method: 'POST', body: JSON.stringify(payload) }),
  aiGuessPricing: (payload) => apiRequest('/pricing/ai-guess', { method: 'POST', body: JSON.stringify(payload) }),
  resetProfessionPricing: (payload) => apiRequest('/pricing/reset-profession-defaults', { method: 'POST', body: JSON.stringify(payload || {}) }),

  // Proposals
  getProposals: () => apiRequest('/proposals'),
  getProposal: (id) => apiRequest(`/proposals/${id}`),
  createProposal: (payload) => apiRequest('/proposals', { method: 'POST', body: JSON.stringify(payload) }),
  updateProposal: (id, payload) => apiRequest(`/proposals/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProposal: (id) => apiRequest(`/proposals/${id}`, { method: 'DELETE' }),
  recalculateProposal: (id) => apiRequest(`/proposals/${id}/recalculate`, { method: 'POST' }),
  convertToProject: (id) => apiRequest(`/proposals/${id}/convert-to-project`, { method: 'POST' }),
  createProposalShareLink: (id) => apiRequest(`/proposals/${id}/share-link`, { method: 'POST' }),
  revokeProposalShareLink: (id) => apiRequest(`/proposals/${id}/share-link`, { method: 'DELETE' }),
  getProposalShareLink: (id) => apiRequest(`/proposals/${id}/share-link`),

  // Projects
  getProjects: (params = '') => apiRequest(`/projects${params}`),
  getProject: (id) => apiRequest(`/projects/${id}`),
  createProject: (payload) => apiRequest('/projects', { method: 'POST', body: JSON.stringify(payload) }),
  updateProject: (id, payload) => apiRequest(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteProject: (id) => apiRequest(`/projects/${id}`, { method: 'DELETE' }),
  addProjectTask: (id, payload) => apiRequest(`/projects/${id}/tasks`, { method: 'POST', body: JSON.stringify(payload) }),
  logProjectTaskTime: (id, taskId, payload) => apiRequest(`/projects/${id}/tasks/${taskId}/time`, { method: 'POST', body: JSON.stringify(payload) }),
  addChangeRequest: (id, payload) => apiRequest(`/projects/${id}/change-requests`, { method: 'POST', body: JSON.stringify(payload) }),
  approveChangeRequest: (id, crId) => apiRequest(`/projects/${id}/change-requests/${crId}/approve`, { method: 'POST' }),

  // Invoices & Payments
  getInvoices: () => apiRequest('/invoices'),
  getInvoice: (id) => apiRequest(`/invoices/${id}`),
  createInvoice: (payload) => apiRequest('/invoices', { method: 'POST', body: JSON.stringify(payload) }),
  recordPayment: (id, payload) => apiRequest(`/invoices/${id}/payments`, { method: 'POST', body: JSON.stringify(payload) }),
  settleInvoice: (id, payload) => apiRequest(`/invoices/${id}/settle`, { method: 'POST', body: JSON.stringify(payload || {}) }),
  getAllPayments: () => apiRequest('/invoices/payments/all'),
  deletePayment: (paymentId) => apiRequest(`/invoices/payments/${paymentId}`, { method: 'DELETE' }),
  getPaymentReceipt: (paymentId) => apiRequest(`/invoices/payments/${paymentId}/receipt`),
  selectPaymentGateway: (id, payload) => apiRequest(`/invoices/${id}/payment-gateway`, { method: 'POST', body: JSON.stringify(payload) }),
  createInvoiceStripePaymentLink: (id) => apiRequest(`/invoices/${id}/stripe-payment-link`, { method: 'POST' }),
  createInvoiceShareLink: (id) => apiRequest(`/invoices/${id}/share-link`, { method: 'POST' }),
  revokeInvoiceShareLink: (id) => apiRequest(`/invoices/${id}/share-link`, { method: 'DELETE' }),
  getInvoiceShareLink: (id) => apiRequest(`/invoices/${id}/share-link`),
  getInvoiceGateways: (currency) => apiRequest(`/invoices/gateways?currency=${currency || ''}`),

  // Expenses
  getExpenses: () => apiRequest('/expenses'),
  createExpense: (payload) => apiRequest('/expenses', { method: 'POST', body: JSON.stringify(payload) }),
  updateExpense: (id, payload) => apiRequest(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteExpense: (id) => apiRequest(`/expenses/${id}`, { method: 'DELETE' }),
  duplicateExpense: (id) => apiRequest(`/expenses/${id}/duplicate`, { method: 'POST' }),
  toggleExpensePause: (id) => apiRequest(`/expenses/${id}/toggle-pause`, { method: 'PATCH' }),
  bulkDeleteExpenses: (ids) => apiRequest('/expenses/bulk-delete', { method: 'POST', body: JSON.stringify({ ids }) }),
  bulkBillableExpenses: (ids, billableToClient) => apiRequest('/expenses/bulk-billable', { method: 'PATCH', body: JSON.stringify({ ids, billableToClient }) }),

  // AGENTS.md Generator
  generateAgentsDoc: (payload) => apiRequest('/agents-doc/generate', { method: 'POST', body: JSON.stringify(payload) }),

  // SaaS Subscription & Stripe
  getSubscriptionStatus: () => apiRequest('/subscription/status'),
  createCheckoutSession: (payload) => apiRequest('/subscription/create-checkout-session', { method: 'POST', body: JSON.stringify(payload) }),
  changePlan: (payload) => apiRequest('/subscription/change-plan', { method: 'POST', body: JSON.stringify(payload) }),
  verifySubscriptionSession: (payload) => apiRequest('/subscription/verify-session', { method: 'POST', body: JSON.stringify(payload) }),
  simulateSubscriptionStatus: (scenario) => apiRequest('/subscription/simulate-status', { method: 'POST', body: JSON.stringify({ scenario }) }),

  // Demo Data & Account Settings
  getHighestInvoiceNumber: () => apiRequest('/invoices/highest-number'),
  changePassword: (payload) => apiRequest('/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  changeEmail: (payload) => apiRequest('/auth/change-email', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAccount: (payload) => apiRequest('/auth/delete-account', { method: 'POST', body: JSON.stringify(payload) }),
  getDemoStatus: () => apiRequest('/demo/status'),
  loadDemoData: (payload) => apiRequest('/demo/load', { method: 'POST', body: JSON.stringify(payload || {}) }),
  // Templates (Clauses & Messages)
  getClauses: () => apiRequest('/templates/clauses'),
  createClause: (payload) => apiRequest('/templates/clauses', { method: 'POST', body: JSON.stringify(payload) }),
  updateClause: (id, payload) => apiRequest(`/templates/clauses/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteClause: (id, hardDelete = false) => apiRequest(`/templates/clauses/${id}${hardDelete ? '?hardDelete=true' : ''}`, { method: 'DELETE' }),
  reorderClauses: (orderList) => apiRequest('/templates/clauses/reorder', { method: 'POST', body: JSON.stringify({ orderList }) }),
  restoreStarterClause: (id) => apiRequest(`/templates/clauses/${id}/restore-starter`, { method: 'POST' }),
  restoreClauseVersion: (id, version) => apiRequest(`/templates/clauses/${id}/restore-version`, { method: 'POST', body: JSON.stringify({ version }) }),
  duplicateClause: (id) => apiRequest(`/templates/clauses/${id}/duplicate`, { method: 'POST' }),
  getStarterLibrary: () => apiRequest('/templates/starter-library'),
  addFromStarterLibrary: (starterKey) => apiRequest('/templates/starter-library/add', { method: 'POST', body: JSON.stringify({ starterKey }) }),

  getMessageTemplates: () => apiRequest('/templates/messages'),
  updateMessageTemplate: (key, payload) => apiRequest(`/templates/messages/${key}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  restoreDefaultMessageTemplate: (key) => apiRequest(`/templates/messages/${key}/restore-default`, { method: 'POST' }),
  restoreMessageVersion: (key, version) => apiRequest(`/templates/messages/${key}/restore-version`, { method: 'POST', body: JSON.stringify({ version }) }),
  sendTestMessage: (key) => apiRequest('/templates/messages/send-test', { method: 'POST', body: JSON.stringify({ key }) }),
};
