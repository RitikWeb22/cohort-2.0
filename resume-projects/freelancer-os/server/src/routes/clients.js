import express from 'express';
import { Client } from '../models/Client.js';
import { Project } from '../models/Project.js';
import { Invoice } from '../models/Invoice.js';
import { Proposal } from '../models/Proposal.js';
import { RequirementAnalysis } from '../models/RequirementAnalysis.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { requireAuth } from '../middleware/auth.js';
import { getSubscriptionDetails, enforcePlanLimits } from '../services/subscriptionService.js';

const router = express.Router();
router.use(requireAuth);

// List clients with live calculated financial aggregates
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const { search, status } = req.query;

    const filter = { userId };
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const clients = await Client.find(filter).sort({ createdAt: -1 }).lean();
    if (clients.length === 0) {
      return res.json({ success: true, clients: [] });
    }

    const clientIds = clients.map(c => c._id);
    const now = new Date();
    const [allProjects, allInvoices, allProposals] = await Promise.all([
      Project.find({ clientId: { $in: clientIds }, userId }, 'clientId contractValue createdAt updatedAt').lean(),
      Invoice.find({ clientId: { $in: clientIds }, userId }, 'clientId totalAmount amountPaid status dueDate createdAt updatedAt').lean(),
      Proposal.find({ clientId: { $in: clientIds }, userId }, 'clientId status pricingBreakdown createdAt updatedAt').lean(),
    ]);

    const projectMap = new Map();
    for (const p of allProjects) {
      const cId = p.clientId?.toString();
      if (!cId) continue;
      if (!projectMap.has(cId)) projectMap.set(cId, { totalContracted: 0, count: 0, lastDate: p.updatedAt || p.createdAt });
      const entry = projectMap.get(cId);
      entry.totalContracted += (p.contractValue || 0);
      entry.count += 1;
      const pDate = new Date(p.updatedAt || p.createdAt);
      if (pDate > new Date(entry.lastDate)) entry.lastDate = pDate;
    }

    const invoiceMap = new Map();
    for (const i of allInvoices) {
      const cId = i.clientId?.toString();
      if (!cId) continue;
      if (!invoiceMap.has(cId)) invoiceMap.set(cId, { totalBilled: 0, amountReceived: 0, count: 0, overdueCount: 0, lastDate: i.updatedAt || i.createdAt });
      const entry = invoiceMap.get(cId);
      if (i.status !== 'cancelled') {
        entry.totalBilled += (i.totalAmount || 0);
        entry.amountReceived += (i.amountPaid || 0);
      }
      entry.count += 1;
      const isOverdue = i.status === 'overdue' || (i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate && new Date(i.dueDate) < now);
      if (isOverdue) entry.overdueCount += 1;
      const iDate = new Date(i.updatedAt || i.createdAt);
      if (iDate > new Date(entry.lastDate)) entry.lastDate = iDate;
    }

    const proposalMap = new Map();
    for (const prop of allProposals) {
      const cId = prop.clientId?.toString();
      if (!cId) continue;
      if (!proposalMap.has(cId)) proposalMap.set(cId, { count: 0, acceptedCount: 0, contracted: 0, lastDate: prop.updatedAt || prop.createdAt });
      const entry = proposalMap.get(cId);
      entry.count += 1;
      if (prop.status === 'accepted') {
        entry.acceptedCount += 1;
        const val = prop.pricingBreakdown?.totalAmount || prop.pricingBreakdown?.subtotal || prop.pricingBreakdown?.recommendedPrice || 0;
        entry.contracted += val;
      }
      const prDate = new Date(prop.updatedAt || prop.createdAt);
      if (prDate > new Date(entry.lastDate)) entry.lastDate = prDate;
    }

    const sub = getSubscriptionDetails(req.user);
    const maxAllowed = sub.limits.maxClients;

    const enriched = clients.map((client, index) => {
      const cId = client._id.toString();
      const projData = projectMap.get(cId) || { totalContracted: 0, count: 0, lastDate: null };
      const invData = invoiceMap.get(cId) || { totalBilled: 0, amountReceived: 0, count: 0, overdueCount: 0, lastDate: null };
      const propData = proposalMap.get(cId) || { count: 0, acceptedCount: 0, contracted: 0, lastDate: null };

      const billed = invData.totalBilled;
      const paid = invData.amountReceived;
      const outstandingBalance = Math.max(0, billed - paid);

      // Latest activity calculation
      const dates = [
        new Date(client.updatedAt || client.createdAt),
        projData.lastDate ? new Date(projData.lastDate) : null,
        invData.lastDate ? new Date(invData.lastDate) : null,
        propData.lastDate ? new Date(propData.lastDate) : null,
      ].filter(Boolean);
      const lastActivity = new Date(Math.max(...dates.map(d => d.getTime())));

      // On downgrade, clients beyond the Starter limit become read-only / archived-candidates (never deleted)
      const isReadOnly = client.status !== 'archived' && index >= maxAllowed;

      return {
        ...client,
        id: cId,
        totalBilled: billed,
        totalPaid: paid,
        totalInvoiced: billed, // alias for backwards compatibility
        amountReceived: paid, // alias for backwards compatibility
        outstandingBalance,
        totalContracted: propData.contracted || projData.totalContracted,
        projectsCount: projData.count,
        invoicesCount: invData.count,
        proposalsCount: propData.count,
        acceptedProposalsCount: propData.acceptedCount,
        overdueInvoicesCount: invData.overdueCount,
        lastActivity,
        isReadOnly,
        isArchivedCandidate: isReadOnly,
      };
    });

    res.json({ success: true, clients: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create client (with server-side plan limits check)
router.post('/', enforcePlanLimits('create_client'), async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      name,
      company,
      contactPerson,
      email,
      phone,
      website,
      country,
      billingAddress,
      taxId,
      currency,
      paymentTerms,
      notes,
      status,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Client or business name is required' });
    }

    const client = await Client.create({
      userId,
      name: name.trim(),
      company: company?.trim() || name.trim(),
      contactPerson: contactPerson?.trim() || '',
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      website: website?.trim() || '',
      country: country?.trim() || '',
      billingAddress: billingAddress?.trim() || '',
      taxId: taxId?.trim() || '',
      currency: currency || req.user.currency || 'USD',
      paymentTerms: paymentTerms || 'Due on receipt',
      status: status || 'lead',
      notes: notes || '',
      notesList: [],
    });

    await ActivityLog.create({
      userId,
      action: 'CREATE_CLIENT',
      entityType: 'Client',
      entityId: client._id.toString(),
      details: `Created new client record "${client.name}"`,
    });

    const clientObj = client.toObject();
    clientObj.id = client._id.toString();

    res.status(201).json({ success: true, client: clientObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Get single client with full project/proposal/invoice history and totals
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const client = await Client.findOne({ _id: req.params.id, userId });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const [projects, proposals, invoices, analyses] = await Promise.all([
      Project.find({ clientId: client._id, userId }).sort({ createdAt: -1 }),
      Proposal.find({ clientId: client._id, userId }).sort({ createdAt: -1 }),
      Invoice.find({ clientId: client._id, userId }).sort({ createdAt: -1 }),
      RequirementAnalysis.find({ clientId: client._id, userId }).sort({ createdAt: -1 }),
    ]);

    const now = new Date();
    let totalBilled = 0;
    let totalPaid = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    for (const inv of invoices) {
      if (inv.status !== 'cancelled') {
        totalBilled += (inv.totalAmount || 0);
        totalPaid += (inv.amountPaid || 0);
      }
      const isOverdue = inv.status === 'overdue' || (inv.status !== 'paid' && inv.status !== 'cancelled' && inv.dueDate && new Date(inv.dueDate) < now);
      if (isOverdue) {
        overdueCount += 1;
        overdueAmount += Math.max(0, (inv.totalAmount || 0) - (inv.amountPaid || 0));
      }
    }

    let contracted = 0;
    for (const prop of proposals) {
      if (prop.status === 'accepted') {
        const val = prop.pricingBreakdown?.totalAmount || prop.pricingBreakdown?.subtotal || prop.pricingBreakdown?.recommendedPrice || 0;
        contracted += val;
      }
    }

    const outstandingBalance = Math.max(0, totalBilled - totalPaid);

    const clientObj = client.toObject();
    clientObj.id = client._id.toString();

    res.json({
      success: true,
      client: clientObj,
      totals: {
        totalBilled,
        totalPaid,
        outstandingBalance,
        overdueCount,
        overdueAmount,
        contracted,
      },
      projects,
      proposals,
      invoices,
      analyses,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update client
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const sub = getSubscriptionDetails(req.user);
    if (sub.effectivePlan === 'free') {
      const activeClients = await Client.find({ userId, status: { $ne: 'archived' } }).sort({ createdAt: -1 }).select('_id');
      const idx = activeClients.findIndex(c => c._id.toString() === req.params.id);
      if (idx >= sub.limits.maxClients) {
        return res.status(403).json({
          success: false,
          code: 'CLIENT_READ_ONLY',
          error: `Client is in read-only mode under the Starter plan (${sub.limits.maxClients} client limit). Upgrade to edit over-limit clients.`,
        });
      }
    }

    const allowed = [
      'name',
      'company',
      'contactPerson',
      'email',
      'phone',
      'website',
      'country',
      'billingAddress',
      'taxId',
      'currency',
      'paymentTerms',
      'notes',
      'notesList',
      'status',
    ];
    const updates = {};
    for (const f of allowed) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    const client = await Client.findOneAndUpdate({ _id: req.params.id, userId }, updates, { new: true });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const clientObj = client.toObject();
    clientObj.id = client._id.toString();

    res.json({ success: true, client: clientObj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Add private note
router.post('/:id/notes', async (req, res) => {
  try {
    const userId = req.user._id;
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, error: 'Note text is required' });
    }

    const newNote = {
      id: `note-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      text: text.trim(),
      createdAt: new Date(),
    };

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $push: { notesList: newNote } },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, note: newNote, notesList: client.notesList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete private note
router.delete('/:id/notes/:noteId', async (req, res) => {
  try {
    const userId = req.user._id;
    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $pull: { notesList: { id: req.params.noteId } } },
      { new: true }
    );

    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    res.json({ success: true, notesList: client.notesList });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete client (with cascade or check)
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const client = await Client.findOne({ _id: req.params.id, userId });
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    // Check linked records
    const [linkedProposals, linkedInvoices, linkedProjects] = await Promise.all([
      Proposal.countDocuments({ clientId: client._id, userId }),
      Invoice.countDocuments({ clientId: client._id, userId }),
      Project.countDocuments({ clientId: client._id, userId }),
    ]);

    await Client.findByIdAndDelete(client._id);

    // If cascade requested or cleanup
    if (linkedProposals > 0) {
      await Proposal.deleteMany({ clientId: client._id, userId });
    }
    if (linkedInvoices > 0) {
      await Invoice.deleteMany({ clientId: client._id, userId });
    }
    if (linkedProjects > 0) {
      await Project.deleteMany({ clientId: client._id, userId });
    }

    res.json({
      success: true,
      message: 'Client and associated records deleted successfully',
      removed: {
        proposals: linkedProposals,
        invoices: linkedInvoices,
        projects: linkedProjects,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
