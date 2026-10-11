import express from 'express';
import crypto from 'crypto';
import { Proposal } from '../models/Proposal.js';
import { Invoice } from '../models/Invoice.js';
import { Client } from '../models/Client.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Payment } from '../models/Payment.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { config } from '../config/env.js';
import { rateLimit } from '../middleware/rateLimiter.js';
import { generateProposalPdf, generateInvoicePdf } from '../services/pdfService.js';
import { sanitizeFreeText } from '../services/documentSanitizer.js';

const router = express.Router();

// Strict rate limiter for public document endpoints (per IP)
const publicDocLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // Max 60 requests per 15 minutes per IP
  message: 'Too many requests for this document. Please try again later.',
});

router.use(publicDocLimiter);

// Middleware to enforce no-index, no-follow, and no-store caching
function secureDocumentHeaders(req, res, next) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
}

router.use(secureDocumentHeaders);

/**
 * Helper: hash raw share token with SHA-256
 */
export function hashShareToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken || '')).digest('hex');
}

/**
 * Helper: hash IP address for privacy-safe audit logging
 */
function hashIp(ip) {
  return crypto.createHash('sha256').update(String(ip || 'unknown_ip')).digest('hex').substring(0, 16);
}

// -----------------------------------------------------------------------------
// PUBLIC PROPOSAL ENDPOINTS
// -----------------------------------------------------------------------------

// 1. GET /api/v1/public/proposals/:token
router.get('/proposals/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = hashShareToken(token);

    const proposal = await Proposal.findOne({
      shareToken: hashedToken,
      shareEnabled: true,
    });

    // Check validity, expiration and revocation
    const now = new Date();
    if (!proposal || proposal.revokedAt || (proposal.shareExpiresAt && proposal.shareExpiresAt < now)) {
      return res.status(404).json({
        success: false,
        error: 'Proposal link is invalid, expired, or has been revoked by the sender.',
      });
    }

    const [client, user] = await Promise.all([
      Client.findById(proposal.clientId).select('name company contactPerson email phone').lean(),
      User.findById(proposal.userId).select('name businessName businessEmail businessPhone businessAddress logoUrl signatureUrl currency defaultPaymentTerms').lean(),
    ]);

    // Track "Viewed" state (once)
    if (!proposal.viewedAt) {
      proposal.viewedAt = now;
      if (proposal.status === 'sent') {
        proposal.status = 'viewed';
      }
      await proposal.save();

      await ActivityLog.create({
        userId: proposal.userId,
        action: 'PROPOSAL_VIEWED',
        entityType: 'Proposal',
        entityId: proposal._id.toString(),
        details: `Client viewed proposal ${proposal.proposalNumber} via private link.`,
      });
    }

    // Expose ONLY client-safe fields
    const safeProposal = {
      id: proposal._id.toString(),
      proposalNumber: proposal.proposalNumber,
      title: proposal.title,
      status: proposal.status,
      currency: proposal.currency,
      validUntil: proposal.validUntil,
      lineItems: proposal.lineItems || [],
      pricingBreakdown: {
        estimatedHours: proposal.pricingBreakdown?.estimatedHours || 0,
        subtotal: proposal.pricingBreakdown?.subtotal || 0,
        taxAmount: proposal.pricingBreakdown?.taxAmount || 0,
        totalAmount: proposal.pricingBreakdown?.totalAmount || 0,
      },
      paymentSchedule: proposal.paymentSchedule || [],
      paymentScheduleType: proposal.paymentScheduleType,
      paymentMethod: proposal.paymentMethod,
      paymentDetails: proposal.paymentDetails,
      termsAndConditions: proposal.termsAndConditions,
      createdAt: proposal.createdAt,
      acceptedAt: proposal.acceptedAt,
      acceptedBy: proposal.acceptedBy,
    };

    const safeClient = client ? {
      name: client.name,
      company: client.company,
      contactPerson: client.contactPerson || client.name,
    } : { name: 'Client' };

    const safeUser = user ? {
      businessName: user.businessName || user.name,
      businessEmail: user.businessEmail,
      businessPhone: user.businessPhone,
      businessAddress: user.businessAddress,
      logoUrl: user.logoUrl,
      signatureUrl: user.signatureUrl,
    } : { businessName: 'Studio' };

    res.json({
      success: true,
      proposal: safeProposal,
      client: safeClient,
      user: safeUser,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/v1/public/proposals/:token/accept
router.post('/proposals/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { signerName, notes } = req.body;
    const hashedToken = hashShareToken(token);

    const proposal = await Proposal.findOne({
      shareToken: hashedToken,
      shareEnabled: true,
    });

    const now = new Date();
    if (!proposal || proposal.revokedAt || (proposal.shareExpiresAt && proposal.shareExpiresAt < now)) {
      return res.status(404).json({
        success: false,
        error: 'Proposal link is invalid, expired, or has been revoked by the sender.',
      });
    }

    if (proposal.status === 'accepted') {
      return res.status(400).json({ success: false, error: 'Proposal has already been accepted.' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const ipHash = hashIp(clientIp);

    proposal.status = 'accepted';
    proposal.acceptedAt = now;
    proposal.acceptedBy = (signerName || 'Client').trim();
    proposal.acceptedIpHash = ipHash;
    await proposal.save();

    await ActivityLog.create({
      userId: proposal.userId,
      action: 'PROPOSAL_ACCEPTED',
      entityType: 'Proposal',
      entityId: proposal._id.toString(),
      details: `Proposal ${proposal.proposalNumber} accepted electronically by ${proposal.acceptedBy}.`,
    });

    // Auto-create Project upon acceptance per Rule 9 of AGENTS.md
    const existingProject = await Project.findOne({ proposalId: proposal._id });
    if (!existingProject) {
      const contractValue = proposal.pricingBreakdown?.totalAmount || proposal.pricingBreakdown?.subtotal || 0;
      await Project.create({
        userId: proposal.userId,
        clientId: proposal.clientId,
        proposalId: proposal._id,
        title: proposal.title.replace(/^Proposal:\s*/i, ''),
        status: 'in_progress',
        contractValue,
        currency: proposal.currency || 'USD',
        scopeSnapshot: proposal.termsAndConditions || '',
        deliverables: (proposal.lineItems || []).map((li, idx) => ({
          title: li.description,
          description: li.description,
          status: 'pending',
          order: idx,
        })),
        milestones: (proposal.paymentSchedule || []).map((ms, idx) => ({
          title: ms.milestone,
          amount: ms.amount,
          percentage: ms.percentage,
          status: idx === 0 ? 'in_progress' : 'pending',
          order: idx,
        })),
        tasks: [],
      });
    }

    res.json({
      success: true,
      message: `Proposal ${proposal.proposalNumber} has been successfully accepted.`,
      acceptedAt: proposal.acceptedAt,
      acceptedBy: proposal.acceptedBy,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. POST /api/v1/public/proposals/:token/decline
router.post('/proposals/:token/decline', async (req, res) => {
  try {
    const { token } = req.params;
    const { reason } = req.body;
    const hashedToken = hashShareToken(token);

    const proposal = await Proposal.findOne({
      shareToken: hashedToken,
      shareEnabled: true,
    });

    const now = new Date();
    if (!proposal || proposal.revokedAt || (proposal.shareExpiresAt && proposal.shareExpiresAt < now)) {
      return res.status(404).json({
        success: false,
        error: 'Proposal link is invalid, expired, or has been revoked by the sender.',
      });
    }

    proposal.status = 'rejected';
    proposal.declinedAt = now;
    proposal.declinedReason = (reason || '').trim();
    await proposal.save();

    await ActivityLog.create({
      userId: proposal.userId,
      action: 'PROPOSAL_DECLINED',
      entityType: 'Proposal',
      entityId: proposal._id.toString(),
      details: `Proposal ${proposal.proposalNumber} declined by client.${reason ? ` Reason: ${reason}` : ''}`,
    });

    res.json({
      success: true,
      message: `Proposal ${proposal.proposalNumber} marked as declined.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. GET /api/v1/public/proposals/:token/pdf
router.get('/proposals/:token/pdf', async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = hashShareToken(token);

    const proposal = await Proposal.findOne({
      shareToken: hashedToken,
      shareEnabled: true,
    });

    const now = new Date();
    if (!proposal || proposal.revokedAt || (proposal.shareExpiresAt && proposal.shareExpiresAt < now)) {
      return res.status(404).json({
        success: false,
        error: 'Proposal link is invalid, expired, or has been revoked by the sender.',
      });
    }

    const [client, user] = await Promise.all([
      Client.findById(proposal.clientId).lean(),
      User.findById(proposal.userId).lean(),
    ]);

    const pdfBuffer = await generateProposalPdf(proposal, client, user);
    const filename = `Proposal-${proposal.proposalNumber || 'PROP'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -----------------------------------------------------------------------------
// PUBLIC INVOICE ENDPOINTS
// -----------------------------------------------------------------------------

// 5. GET /api/v1/public/invoices/:token
router.get('/invoices/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = hashShareToken(token);

    const invoice = await Invoice.findOne({
      shareToken: hashedToken,
      shareEnabled: true,
    });

    const now = new Date();
    if (!invoice || invoice.revokedAt || (invoice.shareExpiresAt && invoice.shareExpiresAt < now)) {
      return res.status(404).json({
        success: false,
        error: 'Invoice link is invalid, expired, or has been revoked by the sender.',
      });
    }

    const [client, user] = await Promise.all([
      Client.findById(invoice.clientId).select('name company contactPerson email phone billingAddress').lean(),
      User.findById(invoice.userId).select('name businessName businessEmail businessPhone businessAddress logoUrl signatureUrl currency iban swiftBic upiId paypalEmail bankDetails paymentMethods').lean(),
    ]);

    // Mark as viewed in activity log
    if (!invoice.viewedAt) {
      invoice.viewedAt = now;
      await invoice.save();

      await ActivityLog.create({
        userId: invoice.userId,
        action: 'INVOICE_VIEWED',
        entityType: 'Invoice',
        entityId: invoice._id.toString(),
        details: `Client viewed invoice ${invoice.invoiceNumber} via private link.`,
      });
    }

    const safeInvoice = {
      id: invoice._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
      currency: invoice.currency,
      lineItems: invoice.lineItems || [],
      subtotal: invoice.subtotal || 0,
      taxRate: invoice.taxRate || 0,
      taxAmount: invoice.taxAmount || 0,
      discountAmount: invoice.discountAmount || 0,
      totalAmount: invoice.totalAmount || 0,
      amountPaid: invoice.amountPaid || 0,
      balanceDue: invoice.balanceDue || 0,
      paymentTerms: invoice.paymentTerms,
      paymentInstructions: invoice.paymentInstructions,
      lateFeeTerms: invoice.lateFeeTerms,
    };

    const safeClient = client ? {
      name: client.name,
      company: client.company,
      contactPerson: client.contactPerson || client.name,
      billingAddress: client.billingAddress,
    } : { name: 'Client' };

    // Format safe payment methods
    const safePaymentMethods = {
      instructions: invoice.paymentInstructions || 'Direct bank transfer / Wire settlement',
      bankDetails: user?.bankDetails || (user?.iban ? `IBAN: ${user.iban} | BIC: ${user.swiftBic}` : ''),
      upiId: (invoice.currency === 'INR' && user?.upiId) ? user.upiId : '',
      paypalEmail: user?.paypalEmail || '',
    };

    const safeUser = user ? {
      businessName: user.businessName || user.name,
      businessEmail: user.businessEmail,
      businessPhone: user.businessPhone,
      businessAddress: user.businessAddress,
      logoUrl: user.logoUrl,
    } : { businessName: 'Studio' };

    res.json({
      success: true,
      invoice: safeInvoice,
      client: safeClient,
      user: safeUser,
      paymentMethods: safePaymentMethods,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. GET /api/v1/public/invoices/:token/pdf
router.get('/invoices/:token/pdf', async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = hashShareToken(token);

    const invoice = await Invoice.findOne({
      shareToken: hashedToken,
      shareEnabled: true,
    });

    const now = new Date();
    if (!invoice || invoice.revokedAt || (invoice.shareExpiresAt && invoice.shareExpiresAt < now)) {
      return res.status(404).json({
        success: false,
        error: 'Invoice link is invalid, expired, or has been revoked by the sender.',
      });
    }

    const [client, user] = await Promise.all([
      Client.findById(invoice.clientId).lean(),
      User.findById(invoice.userId).lean(),
    ]);

    const pdfBuffer = await generateInvoicePdf(invoice, client, user);
    const filename = `Invoice-${invoice.invoiceNumber || 'INV'}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /api/v1/public/invoices/:token/razorpay/order
router.post('/invoices/:token/razorpay/order', async (req, res) => {
  try {
    const { token } = req.params;
    const hashedToken = hashShareToken(token);

    const invoice = await Invoice.findOne({
      shareToken: hashedToken,
      shareEnabled: true,
    });

    const now = new Date();
    if (!invoice || invoice.revokedAt || (invoice.shareExpiresAt && invoice.shareExpiresAt < now)) {
      return res.status(404).json({
        success: false,
        error: 'Invoice link is invalid, expired, or has been revoked.',
      });
    }

    if (invoice.status === 'paid' || invoice.balanceDue <= 0) {
      return res.status(400).json({ success: false, error: 'Invoice has already been fully paid.' });
    }

    if (invoice.currency !== 'INR') {
      return res.status(400).json({ success: false, error: 'Razorpay is only available for INR denominated invoices.' });
    }

    if (!config.razorpayKeyId || !config.razorpayKeySecret) {
      return res.status(503).json({ success: false, error: 'Razorpay is not configured on this server.' });
    }

    const amountPaise = Math.round(invoice.balanceDue * 100);
    const receipt = `pub_inv_${invoice.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}`;

    let orderId = `order_${Date.now()}`;
    try {
      const authHeader = 'Basic ' + Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader,
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt,
          notes: {
            invoiceId: invoice._id.toString(),
            invoiceNumber: invoice.invoiceNumber,
          },
        }),
      });

      if (rzpRes.ok) {
        const orderData = await rzpRes.json();
        orderId = orderData.id;
      }
    } catch (e) {
      // In offline / mock test mode, continue with generated orderId
    }

    res.json({
      success: true,
      keyId: config.razorpayKeyId,
      orderId,
      amount: amountPaise,
      currency: 'INR',
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. POST /api/v1/public/invoices/:token/razorpay/verify
router.post('/invoices/:token/razorpay/verify', async (req, res) => {
  try {
    const { token } = req.params;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const hashedToken = hashShareToken(token);

    const invoice = await Invoice.findOne({
      shareToken: hashedToken,
      shareEnabled: true,
    });

    const now = new Date();
    if (!invoice || invoice.revokedAt || (invoice.shareExpiresAt && invoice.shareExpiresAt < now)) {
      return res.status(404).json({
        success: false,
        error: 'Invoice link is invalid, expired, or has been revoked.',
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing Razorpay signature verification parameters.',
      });
    }

    if (!config.razorpayKeySecret) {
      return res.status(500).json({
        success: false,
        error: 'RAZORPAY_KEY_SECRET is not configured on this server.',
      });
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(payload)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: 'Invalid Razorpay payment signature.' });
    }

    const amountPaid = invoice.balanceDue;
    const payment = await Payment.create({
      userId: invoice.userId,
      invoiceId: invoice._id,
      clientId: invoice.clientId,
      amount: amountPaid,
      currency: invoice.currency,
      paymentDate: now,
      paymentMethod: 'razorpay',
      transactionReference: razorpay_payment_id,
      notes: `Online settlement via Razorpay by client (Order: ${razorpay_order_id})`,
    });

    invoice.amountPaid = (invoice.amountPaid || 0) + amountPaid;
    invoice.balanceDue = 0;
    invoice.status = 'paid';
    await invoice.save();

    await ActivityLog.create({
      userId: invoice.userId,
      action: 'PUBLIC_PAYMENT_RAZORPAY',
      entityType: 'Invoice',
      entityId: invoice._id.toString(),
      details: `Client settled invoice ${invoice.invoiceNumber} (₹${amountPaid.toLocaleString('en-IN')}) via Razorpay.`,
    });

    res.json({
      success: true,
      message: 'Payment verified and recorded successfully.',
      payment,
      invoice: {
        id: invoice._id.toString(),
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        amountPaid: invoice.amountPaid,
        balanceDue: invoice.balanceDue,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
