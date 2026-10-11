import express from 'express';
import Stripe from 'stripe';
import { Invoice } from '../models/Invoice.js';
import { Payment } from '../models/Payment.js';
import { Client } from '../models/Client.js';
import { Project } from '../models/Project.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { config } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import { getSubscriptionDetails } from '../services/subscriptionService.js';
import { generateInvoicePdf, generateReceiptPdf } from '../services/pdfService.js';
import { getGatewayCapabilities, createGatewaySession, GATEWAY_PROVIDERS } from '../services/paymentGatewayAdapter.js';

const router = express.Router();
router.use(requireAuth);

// Helper to generate sequential invoice numbers safely per user
async function getNextInvoiceNumber(userId) {
  const currentYear = new Date().getFullYear();
  const prefix = `INV-${currentYear}-`;
  
  const latest = await Invoice.findOne({
    userId,
    invoiceNumber: { $regex: `^${prefix}\\d+` },
  }).sort({ invoiceNumber: -1 });

  let sequence = 1;
  if (latest && latest.invoiceNumber) {
    const parts = latest.invoiceNumber.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      sequence = lastNum + 1;
    }
  }
  return `${prefix}${String(sequence).padStart(3, '0')}`;
}

// List invoices (Optimized batch fetching)
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoices = await Invoice.find({ userId }).populate('clientId').sort({ createdAt: -1 }).lean();

    if (invoices.length === 0) {
      return res.json({ success: true, invoices: [] });
    }

    const invoiceIds = invoices.map(i => i._id);
    const projectIds = invoices.map(i => i.projectId).filter(Boolean);

    const [payments, projects] = await Promise.all([
      Payment.find({ invoiceId: { $in: invoiceIds }, userId }).lean(),
      Project.find({ _id: { $in: projectIds }, userId }, 'title').lean(),
    ]);

    const paymentsByInvoice = new Map();
    for (const p of payments) {
      const invId = p.invoiceId.toString();
      if (!paymentsByInvoice.has(invId)) paymentsByInvoice.set(invId, []);
      paymentsByInvoice.get(invId).push(p);
    }

    const projectsById = new Map();
    for (const pr of projects) {
      projectsById.set(pr._id.toString(), pr.title);
    }

    const formatted = invoices.map((inv) => {
      const invId = inv._id.toString();
      const projTitle = inv.projectId ? (projectsById.get(inv.projectId.toString()) || 'General Retainer') : 'General Retainer';
      return {
        ...inv,
        id: invId,
        client: inv.clientId,
        projectTitle: projTitle,
        payments: paymentsByInvoice.get(invId) || [],
      };
    });

    res.json({ success: true, invoices: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/invoices/highest-number
router.get('/highest-number', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoices = await Invoice.find({ userId }, 'invoiceNumber').lean();
    let highestSequence = 0;
    for (const inv of invoices) {
      if (inv.invoiceNumber) {
        const match = inv.invoiceNumber.match(/(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > highestSequence) {
            highestSequence = num;
          }
        }
      }
    }
    res.json({ success: true, highestNumber: highestSequence });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/invoices/gateways (Payment gateway availability & capabilities)
router.get('/gateways', async (req, res) => {
  try {
    const currency = req.query.currency || req.user.currency || 'USD';
    const capabilities = getGatewayCapabilities(currency);
    res.json({ success: true, ...capabilities });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create invoice
router.post('/', async (req, res) => {
  try {
    const userId = req.user._id;

    // Requirement 10: Settings Phone and Business Address are required before the first invoice
    if (!req.user.businessPhone || !req.user.businessAddress) {
      return res.status(400).json({
        success: false,
        error: 'Business Phone and Business Address are required before creating an invoice. Please update them in Settings.',
      });
    }

    const {
      clientId,
      projectId,
      lineItems,
      taxRate,
      taxType,
      taxId,
      taxMode,
      reverseChargeNote,
      lateFeeTerms,
      discountAmount,
      dueDate,
      paymentTerms,
      paymentInstructions,
      currency,
      paymentGateway,
    } = req.body;

    if (!clientId || !lineItems || !lineItems.length) {
      return res.status(400).json({ success: false, error: 'Client and at least one line item are required' });
    }

    // Security check: Verify client belongs to current authenticated user
    const client = await Client.findOne({ _id: clientId, userId }).lean();
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or unauthorized' });
    }

    if (projectId) {
      const project = await Project.findOne({ _id: projectId, userId }).lean();
      if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found or unauthorized' });
      }
    }

    const items = lineItems.map(item => ({
      description: item.description || 'Professional Services',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      amount: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
    }));

    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const resolvedTaxType = taxType || req.user.taxType || 'VAT';
    const resolvedTaxRate = resolvedTaxType === 'None' ? 0 : Number(taxRate !== undefined ? taxRate : (req.user.taxRate || 0));
    const effectiveTaxMode = taxMode || req.user.taxMode || 'exclusive';

    let taxAmount = 0;
    let totalAmount = 0;
    const discount = Math.round(Number(discountAmount) || 0);

    if (effectiveTaxMode === 'inclusive' && resolvedTaxRate > 0) {
      // price includes tax
      taxAmount = Math.round((subtotal * resolvedTaxRate) / (100 + resolvedTaxRate));
      totalAmount = Math.max(0, subtotal - discount);
    } else {
      taxAmount = Math.round((subtotal * resolvedTaxRate) / 100);
      totalAmount = Math.max(0, subtotal + taxAmount - discount);
    }

    const invoiceNumber = await getNextInvoiceNumber(userId);

    const newInvoice = await Invoice.create({
      userId,
      clientId,
      projectId: projectId || null,
      invoiceNumber,
      issueDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      status: 'sent',
      currency: currency || req.user.currency || 'USD',
      lineItems: items,
      subtotal,
      taxType: resolvedTaxType,
      taxRate: resolvedTaxRate,
      taxAmount,
      taxId: taxId || req.user.taxId || '',
      taxMode: effectiveTaxMode,
      reverseChargeNote: reverseChargeNote || req.user.reverseChargeNote || '',
      lateFeeTerms: lateFeeTerms || 'Late payments may be subject to a 1.5% monthly interest fee.',
      discountAmount: discount,
      totalAmount,
      amountPaid: 0,
      balanceDue: totalAmount,
      paymentGateway: paymentGateway || 'stripe',
      paymentTerms: paymentTerms || req.user.defaultPaymentTerms || 'Net 15 days',
      paymentInstructions: paymentInstructions || 'Stripe, PayPal, or Wire / Bank Transfer (Wise)',
    });

    await ActivityLog.create({
      userId,
      action: 'CREATE_INVOICE',
      entityType: 'Invoice',
      entityId: newInvoice._id.toString(),
      details: `Created invoice ${invoiceNumber} for ${newInvoice.currency} ${totalAmount.toLocaleString()}`,
    });

    const obj = newInvoice.toObject();
    obj.id = newInvoice._id.toString();

    res.status(201).json({ success: true, invoice: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all recorded payment transactions across all invoices (Payment Ledger)
router.get('/payments/all', async (req, res) => {
  try {
    const userId = req.user._id;
    const payments = await Payment.find({ userId })
      .populate('clientId')
      .populate('invoiceId')
      .sort({ paymentDate: -1, createdAt: -1 });

    const formatted = payments.map((p) => {
      const obj = p.toObject();
      obj.id = p._id.toString();
      obj.client = obj.clientId;
      obj.invoice = obj.invoiceId;
      return obj;
    });

    res.json({ success: true, payments: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete / Reverse a recorded payment transaction
router.delete('/payments/:paymentId', async (req, res) => {
  try {
    const userId = req.user._id;
    const payment = await Payment.findOne({ _id: req.params.paymentId, userId });
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment transaction not found' });
    }

    const invoice = await Invoice.findOne({ _id: payment.invoiceId, userId });
    if (invoice) {
      invoice.amountPaid = Math.max(0, (invoice.amountPaid || 0) - payment.amount);
      invoice.balanceDue = Math.max(0, invoice.totalAmount - invoice.amountPaid);
      invoice.status = invoice.amountPaid === 0 ? 'sent' : invoice.balanceDue === 0 ? 'paid' : 'partial';
      await invoice.save();
    }

    await Payment.deleteOne({ _id: payment._id });

    await ActivityLog.create({
      userId,
      action: 'REVERSE_PAYMENT',
      entityType: 'Payment',
      entityId: payment._id.toString(),
      details: `Reversed payment transaction of ${payment.amount.toLocaleString()} on invoice ${invoice?.invoiceNumber || ''}`,
    });

    res.json({ success: true, message: 'Payment transaction reversed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const [client, project, payments] = await Promise.all([
      Client.findOne({ _id: invoice.clientId, userId }),
      invoice.projectId ? Project.findOne({ _id: invoice.projectId, userId }) : null,
      Payment.find({ invoiceId: invoice._id, userId }),
    ]);

    const obj = invoice.toObject();
    obj.id = invoice._id.toString();

    res.json({
      success: true,
      invoice: obj,
      client,
      project,
      payments,
      user: {
        fullName: req.user.fullName,
        name: req.user.name || req.user.fullName,
        businessName: req.user.businessName,
        businessEmail: req.user.businessEmail,
        businessPhone: req.user.businessPhone,
        businessAddress: req.user.businessAddress,
        logoUrl: req.user.logoUrl,
        signatureUrl: req.user.signatureUrl,
        currency: req.user.currency,
        taxType: req.user.taxType,
        taxRate: req.user.taxRate,
        taxId: req.user.taxId,
        taxMode: req.user.taxMode,
        reverseChargeText: req.user.reverseChargeText,
        paypalEmail: req.user.paypalEmail,
        iban: req.user.iban,
        swiftBic: req.user.swiftBic,
        plan: req.user.plan,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export invoice PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const client = await Client.findOne({ _id: invoice.clientId, userId });

    const pdfBuffer = await generateInvoicePdf({
      invoice: invoice.toObject(),
      client: client ? client.toObject() : null,
      user: req.user.toObject ? req.user.toObject() : req.user,
    });

    const invNum = invoice.invoiceNumber || 'INV';
    const effClient = client || invoice.client;
    const clientName = (effClient?.company || effClient?.name || 'Client')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const filename = `Invoice-${invNum}-${clientName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('Invoice PDF export error:', err);
    res.status(err.message.includes('Settings') || err.message.includes('inconsistent') ? 400 : 500).json({
      success: false,
      error: err.message,
    });
  }
});

// Record a Payment
router.post('/:id/payments', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const { amount, paymentMethod, transactionReference, notes, paymentDate } = req.body;
    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Valid positive payment amount is required' });
    }

    if (paymentAmount > invoice.balanceDue) {
      return res.status(400).json({
        success: false,
        error: `Payment amount (${paymentAmount.toLocaleString()}) exceeds remaining balance due (${invoice.balanceDue.toLocaleString()})`,
      });
    }

    const newPayment = await Payment.create({
      userId,
      invoiceId: invoice._id,
      clientId: invoice.clientId,
      amount: paymentAmount,
      currency: invoice.currency,
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: paymentMethod || 'bank_transfer',
      transactionReference: transactionReference || `TXN-${Date.now()}`,
      notes: notes || '',
    });

    // Recalculate invoice totals
    invoice.amountPaid = (invoice.amountPaid || 0) + paymentAmount;
    invoice.balanceDue = Math.max(0, invoice.totalAmount - invoice.amountPaid);
    invoice.status = invoice.balanceDue === 0 ? 'paid' : 'partial';
    await invoice.save();

    await ActivityLog.create({
      userId,
      action: 'RECORD_PAYMENT',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      details: `Recorded payment of ${paymentAmount.toLocaleString()} on ${invoice.invoiceNumber}. Remaining balance: ${invoice.balanceDue.toLocaleString()}`,
    });

    const obj = invoice.toObject();
    obj.id = invoice._id.toString();

    res.status(201).json({ success: true, payment: newPayment, invoice: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Settle invoice in full (1-click settlement)
router.post('/:id/settle', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    if (invoice.balanceDue <= 0) {
      return res.status(400).json({ success: false, error: 'Invoice has already been settled in full' });
    }

    const settleAmount = invoice.balanceDue;
    const { paymentMethod, transactionReference, notes, paymentDate } = req.body;

    if (!paymentMethod || !transactionReference || !String(transactionReference).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Explicit paymentMethod and transactionReference are required for truth-in-accounting records. Unreferenced or automated settlements are not permitted.',
      });
    }

    const newPayment = await Payment.create({
      userId,
      invoiceId: invoice._id,
      clientId: invoice.clientId,
      amount: settleAmount,
      currency: invoice.currency || 'USD',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod,
      transactionReference: String(transactionReference).trim(),
      notes: notes || 'Full balance invoice settlement',
    });

    invoice.amountPaid = invoice.totalAmount;
    invoice.balanceDue = 0;
    invoice.status = 'paid';
    await invoice.save();

    await ActivityLog.create({
      userId,
      action: 'SETTLE_INVOICE',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      details: `Settled balance of ${settleAmount.toLocaleString()} on ${invoice.invoiceNumber}. Marked as Paid in Full.`,
    });

    const obj = invoice.toObject();
    obj.id = invoice._id.toString();

    res.json({ success: true, payment: newPayment, invoice: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get payment receipt data
router.get('/payments/:paymentId/receipt', async (req, res) => {
  try {
    const userId = req.user._id;
    const payment = await Payment.findOne({ _id: req.params.paymentId, userId });
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const [invoice, client] = await Promise.all([
      Invoice.findOne({ _id: payment.invoiceId, userId }),
      Client.findOne({ _id: payment.clientId, userId }),
    ]);

    res.json({
      success: true,
      payment,
      invoice,
      client,
      user: {
        fullName: req.user.fullName,
        name: req.user.name || req.user.fullName,
        businessName: req.user.businessName,
        businessEmail: req.user.businessEmail,
        businessPhone: req.user.businessPhone,
        businessAddress: req.user.businessAddress,
        logoUrl: req.user.logoUrl,
        signatureUrl: req.user.signatureUrl,
        currency: req.user.currency,
        taxId: req.user.taxId,
        taxType: req.user.taxType,
        plan: req.user.plan,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Export payment receipt PDF
router.get('/payments/:paymentId/pdf', async (req, res) => {
  try {
    const userId = req.user._id;
    const payment = await Payment.findOne({ _id: req.params.paymentId, userId });
    if (!payment) {
      return res.status(404).json({ success: false, error: 'Payment not found' });
    }

    const [invoice, client] = await Promise.all([
      Invoice.findOne({ _id: payment.invoiceId, userId }),
      Client.findOne({ _id: payment.clientId, userId }),
    ]);

    const pdfBuffer = await generateReceiptPdf({
      payment: payment.toObject(),
      invoice: invoice ? invoice.toObject() : null,
      client: client ? client.toObject() : null,
      user: req.user.toObject ? req.user.toObject() : req.user,
    });

    const currentYear = new Date().getFullYear();
    const paymentYear = payment.paymentDate ? new Date(payment.paymentDate).getFullYear() : currentYear;
    const rawId = payment._id.toString();
    const rawRef = (payment.transactionReference || '').replace(/[^A-Za-z0-9]/g, '').slice(-4);
    const seqSuffix = rawRef || rawId.slice(-3) || '001';
    const receiptNumber = payment.receiptNumber || `RCT-${paymentYear}-${seqSuffix.toUpperCase()}`;

    const effClient = client || payment.client;
    const clientName = (effClient?.company || effClient?.name || 'Client')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_');

    const filename = `Receipt-${receiptNumber}-${clientName}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.end(pdfBuffer);
  } catch (err) {
    console.error('Receipt PDF export error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate payment options / gateway details for checkout
router.post('/:id/payment-gateway', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const { gateway } = req.body;
    const client = await Client.findOne({ _id: invoice.clientId, userId });

    const session = await createGatewaySession(gateway, {
      invoice,
      client,
      user: req.user,
      returnUrl: `${config.frontendUrl}/invoices?stripe_paid=true&invoiceId=${invoice._id}`,
      cancelUrl: `${config.frontendUrl}/invoices?stripe_paid=cancelled&invoiceId=${invoice._id}`,
    });

    if (!session.success) {
      return res.status(400).json(session);
    }

    if (session.paymentUrl) {
      if (session.gateway === GATEWAY_PROVIDERS.STRIPE) {
        invoice.stripePaymentUrl = session.paymentUrl;
        invoice.stripeSessionId = session.sessionId;
      } else if (session.gateway === GATEWAY_PROVIDERS.PAYPAL) {
        invoice.paypalPaymentUrl = session.paymentUrl;
      }
      invoice.paymentGateway = session.gateway;
      await invoice.save();
    }

    return res.json(session);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify and record Razorpay payment on invoice
router.post('/:id/razorpay/verify', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing Razorpay signature verification parameters (order_id, payment_id, signature required).',
      });
    }

    if (!config.razorpayKeySecret) {
      return res.status(500).json({
        success: false,
        error: 'RAZORPAY_KEY_SECRET is not configured on this server.',
      });
    }

    const crypto = await import('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid Razorpay payment signature' });
    }

    const paymentAmount = invoice.balanceDue;
    const newPayment = await Payment.create({
      userId,
      invoiceId: invoice._id,
      clientId: invoice.clientId,
      amount: paymentAmount,
      currency: invoice.currency,
      paymentDate: new Date(),
      paymentMethod: 'razorpay',
      transactionReference: razorpay_payment_id,
      notes: `Verified Razorpay payment (Order: ${razorpay_order_id})`,
    });

    invoice.amountPaid = (invoice.amountPaid || 0) + paymentAmount;
    invoice.balanceDue = 0;
    invoice.status = 'paid';
    await invoice.save();

    await ActivityLog.create({
      userId,
      action: 'RECORD_PAYMENT_RAZORPAY',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      details: `Settled balance of ₹${paymentAmount.toLocaleString('en-IN')} via Razorpay for invoice ${invoice.invoiceNumber}.`,
    });

    res.json({
      success: true,
      message: 'Razorpay payment verified and recorded successfully.',
      payment: newPayment,
      invoice,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// Backward compatible Stripe Payment Link endpoint
router.post('/:id/stripe-payment-link', async (req, res) => {
  // Delegate to payment-gateway handler
  req.body.gateway = 'stripe';
  return router.handle(req, res);
});

// Generate / Regenerate secure share link for invoice
router.post('/:id/share-link', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const crypto = await import('crypto');
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const defaultExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    invoice.shareToken = hashedToken;
    invoice.shareEnabled = true;
    invoice.shareExpiresAt = defaultExpiry;
    invoice.revokedAt = null;
    await invoice.save();

    await ActivityLog.create({
      userId,
      action: 'INVOICE_SHARE_LINK_GENERATED',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      details: `Generated secure share link for invoice ${invoice.invoiceNumber}.`,
    });

    const shareUrl = `${config.siteUrl}/i/${rawToken}`;

    res.json({
      success: true,
      rawToken,
      shareUrl,
      expiresAt: invoice.shareExpiresAt,
      message: 'Share link created successfully. Show raw token once.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Revoke invoice share link
router.delete('/:id/share-link', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    invoice.shareEnabled = false;
    invoice.revokedAt = new Date();
    await invoice.save();

    await ActivityLog.create({
      userId,
      action: 'INVOICE_SHARE_LINK_REVOKED',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      details: `Revoked share link for invoice ${invoice.invoiceNumber}.`,
    });

    res.json({ success: true, message: 'Share link has been revoked.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get current invoice share link metadata
router.get('/:id/share-link', async (req, res) => {
  try {
    const userId = req.user._id;
    const invoice = await Invoice.findOne({ _id: req.params.id, userId });
    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    const now = new Date();
    const isExpired = Boolean(invoice.shareExpiresAt && invoice.shareExpiresAt < now);
    const isValid = Boolean(invoice.shareEnabled && !invoice.revokedAt && !isExpired);

    res.json({
      success: true,
      shareEnabled: invoice.shareEnabled,
      expiresAt: invoice.shareExpiresAt,
      revokedAt: invoice.revokedAt,
      viewedAt: invoice.viewedAt,
      isExpired,
      isValid,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
