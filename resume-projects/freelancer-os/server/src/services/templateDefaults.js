/**
 * Starter clauses and message templates for Floorly Templates library
 */

export const STARTER_CLAUSES = [
  {
    starterKey: 'deposit_schedule',
    title: 'Deposit and payment schedule',
    category: 'Payment',
    body: 'Client agrees to the milestone payment schedule: {{payment_schedule}}. Invoices are issued per agreed deliverable and are payable per the agreed terms. Final deliverables and production source assets are handed over upon settlement of all milestone balances.',
    defaultOn: true,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'payment_terms_late_fee',
    title: 'Payment terms and late fee',
    category: 'Payment',
    body: 'Invoices are payable within {{payment_terms}} of receipt. Overdue invoices are subject to {{late_fee}}. Work on subsequent milestones may be paused if outstanding balances remain unpaid past the due date.',
    defaultOn: true,
    appliesTo: ['proposals', 'invoices'],
  },
  {
    starterKey: 'deposit_refund_policy',
    title: 'Deposit refund policy',
    category: 'Payment',
    body: 'The initial kickoff deposit is fully refundable if the project is cancelled in writing prior to work commencing. Once project discovery, planning, or production work has begun, the deposit becomes non-refundable to cover allocated studio time.',
    defaultOn: true,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'revision_rounds',
    title: 'Revision rounds and change requests',
    category: 'Scope and changes',
    body: 'The quotation includes up to {{revision_rounds}} consolidated rounds of feedback and cosmetic revisions per approved deliverable. Any subsequent functional additions, workflow alterations, or out-of-scope requests will be quoted separately under a written change order before work begins.',
    defaultOn: true,
    appliesTo: ['proposals', 'change_orders'],
  },
  {
    starterKey: 'client_feedback_review',
    title: 'Client feedback and review timelines',
    category: 'Delivery and reviews',
    body: 'To keep the project on schedule, Client agrees to provide consolidated reviews and feedback within {{review_days}} business days of deliverable handover. Unresponsive periods exceeding fourteen (14) days may require milestone rescheduling.',
    defaultOn: true,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'ownership_ip_transfer',
    title: 'Ownership and IP transfer',
    category: 'Ownership and IP',
    body: 'All custom deliverables, design assets, and technical documentation produced exclusively under this agreement transfer full, perpetual intellectual property ownership to the Client upon receipt of 100% of the total agreed investment of {{total}} {{currency}}.',
    defaultOn: true,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'third_party_costs',
    title: 'Third-party costs and subscriptions',
    category: 'Third-party costs',
    body: 'Client is solely responsible for direct ongoing operational costs of third-party platforms, including hosting, domains, software licenses, stock assets, transactional messaging, and payment gateway processing fees.',
    defaultOn: true,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'support_warranty',
    title: 'Support and warranty period',
    category: 'Support and warranty',
    body: '{{business_name}} provides {{support_days}} days of complimentary warranty support following production delivery to address any reproducible bugs or defects directly related to the contracted scope of work.',
    defaultOn: true,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'project_delays',
    title: 'Project delays and rescheduling',
    category: 'Delivery and reviews',
    body: 'Estimated timelines assume timely provision of client assets, credentials, and approvals. If delays caused by missing client inputs exceed twenty-one (21) days, the project timeline and delivery milestones will be mutually rescheduled.',
    defaultOn: false,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'cancellation_termination',
    title: 'Cancellation and termination',
    category: 'Legal',
    body: 'Either party may terminate this agreement with seven (7) days written notice. In the event of early termination, Client will be invoiced for all approved work completed up to the termination date, and any unused pre-paid funds will be promptly refunded.',
    defaultOn: false,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'confidentiality',
    title: 'Confidentiality',
    category: 'Legal',
    body: 'Both parties agree to keep all proprietary information, trade secrets, project documents, and business strategies strictly confidential, and will not disclose them to any third party without prior written authorization.',
    defaultOn: false,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'limitation_of_liability',
    title: 'Limitation of liability',
    category: 'Legal',
    body: 'Except in cases of gross negligence or willful misconduct, neither party shall be liable for indirect, incidental, or consequential damages. Total liability under this agreement is limited to the total fees paid by Client under this proposal.',
    defaultOn: false,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'portfolio_publicity',
    title: 'Portfolio and publicity rights',
    category: 'Ownership and IP',
    body: '{{business_name}} retains the non-exclusive right to display completed project designs, non-confidential screenshots, and case studies in its professional portfolio and promotional channels once publicly launched.',
    defaultOn: true,
    appliesTo: ['proposals'],
  },
  {
    starterKey: 'governing_law',
    title: 'Governing law',
    category: 'Legal',
    body: 'This agreement shall be governed by, and construed in accordance with, {{governing_law}}. Any disputes arising under this contract shall be submitted to the competent courts of that jurisdiction.',
    defaultOn: true,
    appliesTo: ['proposals'],
  },
];

export const STARTER_MESSAGES = [
  {
    key: 'send_proposal',
    title: 'Send proposal',
    subject: 'Proposal: {{project_title}} from {{business_name}}',
    body: `Hi {{client_name}},

Thank you for discussing your project with us.

I have prepared a comprehensive proposal for {{project_title}}. The proposal outlines our scope of work, timeline, and investment options.

You can review the full proposal here:
{{payment_link}}

This quotation remains valid for {{valid_days}} days. Please let me know if you have any questions or if you would like any adjustments.

Best regards,
{{sender_name}}
{{business_name}}`,
  },
  {
    key: 'proposal_followup',
    title: 'Proposal follow-up',
    subject: 'Following up on our proposal: {{project_title}}',
    body: `Hi {{client_name}},

I wanted to quickly check in regarding the proposal for {{project_title}} that I sent recently.

Have you had a chance to look it over? I would be glad to hop on a short call to answer any questions or refine the milestones if your timeline has shifted.

Looking forward to your thoughts.

Best regards,
{{sender_name}}
{{business_name}}`,
  },
  {
    key: 'send_invoice',
    title: 'Send invoice',
    subject: 'Invoice {{invoice_number}} for {{project_title}} from {{business_name}}',
    body: `Hi {{client_name}},

Please find attached invoice {{invoice_number}} for {{project_title}} in the amount of {{balance_due}} {{currency}}.

Payment is due on {{due_date}} ({{payment_terms}}).

You can review the invoice and complete payment online here:
{{payment_link}}

Thank you for your business.

Best regards,
{{sender_name}}
{{business_name}}`,
  },
  {
    key: 'payment_reminder_friendly',
    title: 'Payment reminder (friendly)',
    subject: 'Friendly reminder: Invoice {{invoice_number}} is due soon',
    body: `Hi {{client_name}},

This is a courtesy reminder that invoice {{invoice_number}} for {{balance_due}} {{currency}} is due on {{due_date}}.

You can view the invoice details and complete payment here:
{{payment_link}}

If you have already arranged payment, please disregard this note.

Best regards,
{{sender_name}}
{{business_name}}`,
  },
  {
    key: 'payment_reminder_firm',
    title: 'Payment reminder (firm)',
    subject: 'Overdue payment reminder: Invoice {{invoice_number}} ({{days_overdue}} days overdue)',
    body: `Hi {{client_name}},

Our records indicate that invoice {{invoice_number}} in the amount of {{balance_due}} {{currency}} was due on {{due_date}} and is now {{days_overdue}} days past due.

Per our agreed terms, {{late_fee}} may apply to overdue balances.

Please arrange payment at your earliest convenience using this secure link:
{{payment_link}}

If there is an issue or delay with remittance, please let me know so we can coordinate.

Best regards,
{{sender_name}}
{{business_name}}`,
  },
  {
    key: 'payment_received',
    title: 'Payment received (thank you)',
    subject: 'Payment received for Invoice {{invoice_number}} — Thank you!',
    body: `Hi {{client_name}},

We have successfully received your payment for invoice {{invoice_number}} in the amount of {{balance_due}} {{currency}}.

Thank you for your prompt settlement. We appreciate working with you and look forward to our continued progress.

Best regards,
{{sender_name}}
{{business_name}}`,
  },
  {
    key: 'change_order_sent',
    title: 'Change order sent',
    subject: 'Change Order for {{project_title}} from {{business_name}}',
    body: `Hi {{client_name}},

Following our recent discussion regarding additional requirements for {{project_title}}, I have prepared a formal change order detailing the adjusted scope and investment of {{total}} {{currency}}.

Please review the change order specifications here:
{{payment_link}}

Once approved, we will update the project milestones and begin implementation.

Best regards,
{{sender_name}}
{{business_name}}`,
  },
];
