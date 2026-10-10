import express from 'express';
import { Expense } from '../models/Expense.js';
import { Project } from '../models/Project.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

const CATEGORY_MAP = {
  api_credits: 'Hosting and infrastructure',
  'api credits': 'Hosting and infrastructure',
  'API Credits': 'Hosting and infrastructure',
  'API credits': 'Hosting and infrastructure',
  'API Credits (Maps, LLM, Twilio)': 'Hosting and infrastructure',
  'Api Credits': 'Hosting and infrastructure',
  hosting: 'Hosting and infrastructure',
  'Cloud Hosting & Storage': 'Hosting and infrastructure',
  software: 'Software and subscriptions',
  'Software & Subscriptions': 'Software and subscriptions',
  'Software & Licenses': 'Tools and licenses',
  contractor: 'Contractors and freelancers',
  'Contractor & Freelancer': 'Contractors and freelancers',
  'Subcontractor Assistance': 'Contractors and freelancers',
  domain: 'Hosting and infrastructure',
  'Domain & SSL': 'Hosting and infrastructure',
  other: 'Other',
  'Other Direct Expense': 'Other',
  'Other Out-of-pocket': 'Other',
};

function normalizeCategory(cat) {
  if (!cat) return 'Software and subscriptions';
  if (CATEGORY_MAP[cat]) return CATEGORY_MAP[cat];
  return cat;
}

// List expenses
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const expenses = await Expense.find({ userId }).populate('projectId').sort({ date: -1 });

    const formatted = expenses.map((e) => {
      const obj = e.toObject();
      obj.id = e._id.toString();
      obj.projectTitle = obj.projectId?.title || 'General overhead';
      obj.category = normalizeCategory(obj.category);
      return obj;
    });

    res.json({ success: true, expenses: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create expense
router.post('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      projectId,
      category,
      vendor,
      description,
      amount,
      currency,
      date,
      billableToClient,
      markupPercent,
      billedOnInvoice,
      recurring,
      taxDeductible,
      paymentMethod,
      notes,
      receiptUrl,
    } = req.body;

    if (!description || amount === undefined || amount === null || amount === '') {
      return res.status(400).json({ success: false, error: 'Description and amount are required' });
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      return res.status(400).json({ success: false, error: 'Valid positive amount is required' });
    }

    // Next recurring date computation if recurring is set
    let recurringObj = { interval: 'none', nextDate: null, isPaused: false };
    if (recurring && typeof recurring === 'object') {
      recurringObj = {
        interval: recurring.interval || 'none',
        nextDate: recurring.nextDate ? new Date(recurring.nextDate) : null,
        isPaused: Boolean(recurring.isPaused),
      };
      if (recurringObj.interval !== 'none' && !recurringObj.nextDate) {
        const baseDate = date ? new Date(date) : new Date();
        const next = new Date(baseDate);
        if (recurringObj.interval === 'monthly') next.setMonth(next.getMonth() + 1);
        else if (recurringObj.interval === 'yearly') next.setFullYear(next.getFullYear() + 1);
        recurringObj.nextDate = next;
      }
    }

    const newExpense = await Expense.create({
      userId,
      projectId: projectId || null,
      category: normalizeCategory(category),
      vendor: (vendor || '').trim(),
      description: description.trim(),
      amount: numAmount,
      currency: currency || req.user.currency || 'USD',
      date: date ? new Date(date) : new Date(),
      billableToClient: Boolean(billableToClient),
      markupPercent: Number(markupPercent) || 0,
      billedOnInvoice: (billedOnInvoice || '').trim(),
      recurring: recurringObj,
      taxDeductible: taxDeductible !== undefined ? Boolean(taxDeductible) : true,
      paymentMethod: paymentMethod || 'card',
      notes: (notes || '').trim(),
      receiptUrl: (receiptUrl || '').trim(),
    });

    await ActivityLog.create({
      userId,
      action: 'CREATE_EXPENSE',
      entityType: 'Expense',
      entityId: newExpense._id.toString(),
      details: `Logged expense ${newExpense.currency} ${newExpense.amount.toLocaleString()} for "${newExpense.description}"`,
    });

    const populated = await Expense.findById(newExpense._id).populate('projectId');
    const obj = populated.toObject();
    obj.id = populated._id.toString();
    obj.projectTitle = obj.projectId?.title || 'General overhead';
    obj.category = normalizeCategory(obj.category);

    res.status(201).json({ success: true, expense: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Update expense
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const expense = await Expense.findOne({ _id: req.params.id, userId });
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    const updatable = [
      'projectId',
      'category',
      'vendor',
      'description',
      'amount',
      'currency',
      'date',
      'billableToClient',
      'markupPercent',
      'billedOnInvoice',
      'recurring',
      'taxDeductible',
      'paymentMethod',
      'notes',
      'receiptUrl',
    ];

    for (const field of updatable) {
      if (req.body[field] !== undefined) {
        if (field === 'category') {
          expense.category = normalizeCategory(req.body.category);
        } else if (field === 'projectId') {
          expense.projectId = req.body.projectId || null;
        } else if (field === 'amount') {
          expense.amount = Number(req.body.amount) || 0;
        } else if (field === 'recurring') {
          const rec = req.body.recurring;
          if (rec && typeof rec === 'object') {
            expense.recurring = {
              interval: rec.interval || 'none',
              nextDate: rec.nextDate ? new Date(rec.nextDate) : null,
              isPaused: Boolean(rec.isPaused),
            };
          }
        } else {
          expense[field] = req.body[field];
        }
      }
    }

    await expense.save();

    const populated = await Expense.findById(expense._id).populate('projectId');
    const obj = populated.toObject();
    obj.id = populated._id.toString();
    obj.projectTitle = obj.projectId?.title || 'General overhead';
    obj.category = normalizeCategory(obj.category);

    res.json({ success: true, expense: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Toggle pause on recurring expense
router.patch('/:id/toggle-pause', async (req, res) => {
  try {
    const userId = req.user._id;
    const expense = await Expense.findOne({ _id: req.params.id, userId });
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    if (!expense.recurring || expense.recurring.interval === 'none') {
      return res.status(400).json({ success: false, error: 'This is not a recurring expense' });
    }

    expense.recurring.isPaused = !expense.recurring.isPaused;
    await expense.save();

    const populated = await Expense.findById(expense._id).populate('projectId');
    const obj = populated.toObject();
    obj.id = populated._id.toString();
    obj.projectTitle = obj.projectId?.title || 'General overhead';

    res.json({ success: true, expense: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Duplicate expense
router.post('/:id/duplicate', async (req, res) => {
  try {
    const userId = req.user._id;
    const orig = await Expense.findOne({ _id: req.params.id, userId });
    if (!orig) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }

    const dup = await Expense.create({
      userId,
      projectId: orig.projectId,
      category: orig.category,
      vendor: orig.vendor,
      description: `${orig.description} (Copy)`,
      amount: orig.amount,
      currency: orig.currency,
      date: new Date(),
      billableToClient: orig.billableToClient,
      markupPercent: orig.markupPercent,
      billedOnInvoice: '',
      recurring: { interval: 'none', nextDate: null, isPaused: false },
      taxDeductible: orig.taxDeductible,
      paymentMethod: orig.paymentMethod,
      notes: orig.notes,
      receiptUrl: orig.receiptUrl,
    });

    const populated = await Expense.findById(dup._id).populate('projectId');
    const obj = populated.toObject();
    obj.id = populated._id.toString();
    obj.projectTitle = obj.projectId?.title || 'General overhead';

    res.status(201).json({ success: true, expense: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk delete expenses
router.post('/bulk-delete', async (req, res) => {
  try {
    const userId = req.user._id;
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of ids required' });
    }

    await Expense.deleteMany({ _id: { $in: ids }, userId });
    res.json({ success: true, count: ids.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bulk toggle billable
router.patch('/bulk-billable', async (req, res) => {
  try {
    const userId = req.user._id;
    const { ids, billableToClient } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'Array of ids required' });
    }

    await Expense.updateMany(
      { _id: { $in: ids }, userId },
      { $set: { billableToClient: Boolean(billableToClient) } }
    );

    res.json({ success: true, count: ids.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete expense
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const expense = await Expense.findOneAndDelete({ _id: req.params.id, userId });
    if (!expense) {
      return res.status(404).json({ success: false, error: 'Expense not found' });
    }
    res.json({ success: true, message: 'Expense deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
