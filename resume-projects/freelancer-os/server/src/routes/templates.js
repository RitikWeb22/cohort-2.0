import express from 'express';
import { Clause } from '../models/Clause.js';
import { MessageTemplate } from '../models/MessageTemplate.js';
import { Proposal } from '../models/Proposal.js';
import { requireAuth } from '../middleware/auth.js';
import { STARTER_CLAUSES, STARTER_MESSAGES } from '../services/templateDefaults.js';

const router = express.Router();
router.use(requireAuth);

/**
 * Helper: count how many proposals use a given clause
 */
async function getClauseUsageCounts(userId, clauses) {
  try {
    const proposals = await Proposal.find({ userId }, { termsAndConditions: 1, title: 1 }).lean();
    const counts = {};
    for (const c of clauses) {
      let count = 0;
      const searchTitle = (c.title || '').trim().toLowerCase();
      // Count matches by title in termsAndConditions
      for (const p of proposals) {
        const terms = (p.termsAndConditions || '').toLowerCase();
        if (terms && searchTitle && terms.includes(searchTitle)) {
          count++;
        }
      }
      counts[c._id.toString()] = count;
    }
    return counts;
  } catch (err) {
    return {};
  }
}

/**
 * Helper: ensure initial starter clauses exist for a user
 */
async function ensureSeedClauses(userId) {
  const count = await Clause.countDocuments({ userId });
  if (count === 0) {
    const docs = STARTER_CLAUSES.map((s, idx) => ({
      userId,
      title: s.title,
      category: s.category,
      body: s.body,
      defaultOn: s.defaultOn,
      appliesTo: s.appliesTo,
      order: idx,
      isStarter: true,
      starterKey: s.starterKey,
      archived: false,
      version: 1,
      history: [
        {
          version: 1,
          title: s.title,
          body: s.body,
          category: s.category,
          savedAt: new Date(),
        },
      ],
    }));
    await Clause.insertMany(docs);
  }
}

/**
 * Helper: ensure initial message templates exist for a user
 */
async function ensureSeedMessages(userId) {
  const existing = await MessageTemplate.find({ userId });
  const existingKeys = new Set(existing.map((m) => m.key));
  const missing = STARTER_MESSAGES.filter((s) => !existingKeys.has(s.key));
  if (missing.length > 0) {
    const docs = missing.map((m) => ({
      userId,
      key: m.key,
      title: m.title,
      subject: m.subject,
      body: m.body,
      version: 1,
      history: [
        {
          version: 1,
          subject: m.subject,
          body: m.body,
          savedAt: new Date(),
        },
      ],
    }));
    await MessageTemplate.insertMany(docs);
  }
}

// -------------------------------------------------------------
// CLAUSES ENDPOINTS
// -------------------------------------------------------------

// 1. GET /api/v1/templates/clauses
router.get('/clauses', async (req, res) => {
  try {
    const userId = req.user._id;
    await ensureSeedClauses(userId);

    const clauses = await Clause.find({ userId }).sort({ order: 1, createdAt: 1 });
    const usageCounts = await getClauseUsageCounts(userId, clauses);

    const formatted = clauses.map((c) => {
      const obj = c.toObject();
      obj.id = c._id.toString();
      obj.usedCount = usageCounts[c._id.toString()] || 0;
      return obj;
    });

    res.json({ success: true, clauses: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. POST /api/v1/templates/clauses
router.post('/clauses', async (req, res) => {
  try {
    const userId = req.user._id;
    const { title, category, body, defaultOn, appliesTo } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Clause title is required (max 100 characters)' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, error: 'Clause text is required (max 2,000 characters)' });
    }

    const highestOrderDoc = await Clause.findOne({ userId }).sort({ order: -1 }).select('order');
    const nextOrder = (highestOrderDoc?.order ?? -1) + 1;

    const newClause = await Clause.create({
      userId,
      title: title.trim(),
      category: category || 'Other',
      body: body.trim(),
      defaultOn: defaultOn ?? true,
      appliesTo: Array.isArray(appliesTo) && appliesTo.length > 0 ? appliesTo : ['proposals'],
      order: nextOrder,
      isStarter: false,
      version: 1,
      history: [
        {
          version: 1,
          title: title.trim(),
          body: body.trim(),
          category: category || 'Other',
          savedAt: new Date(),
        },
      ],
    });

    const obj = newClause.toObject();
    obj.id = newClause._id.toString();
    obj.usedCount = 0;

    res.status(201).json({ success: true, clause: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. PATCH /api/v1/templates/clauses/:id
router.patch('/clauses/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const clause = await Clause.findOne({ _id: req.params.id, userId });
    if (!clause) {
      return res.status(404).json({ success: false, error: 'Clause not found' });
    }

    const { title, category, body, defaultOn, appliesTo, archived } = req.body;

    let hasContentChange = false;
    if (title !== undefined && title.trim() !== clause.title) {
      clause.title = title.trim();
      hasContentChange = true;
    }
    if (category !== undefined && category !== clause.category) {
      clause.category = category;
      hasContentChange = true;
    }
    if (body !== undefined && body.trim() !== clause.body) {
      clause.body = body.trim();
      hasContentChange = true;
    }
    if (defaultOn !== undefined) {
      clause.defaultOn = Boolean(defaultOn);
    }
    if (appliesTo !== undefined && Array.isArray(appliesTo)) {
      clause.appliesTo = appliesTo;
    }
    if (archived !== undefined) {
      clause.archived = Boolean(archived);
    }

    if (hasContentChange) {
      clause.version = (clause.version || 1) + 1;
      clause.history = clause.history || [];
      clause.history.unshift({
        version: clause.version,
        title: clause.title,
        body: clause.body,
        category: clause.category,
        savedAt: new Date(),
      });
      if (clause.history.length > 5) {
        clause.history = clause.history.slice(0, 5);
      }
    }

    await clause.save();

    const obj = clause.toObject();
    obj.id = clause._id.toString();

    res.json({ success: true, clause: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. DELETE /api/v1/templates/clauses/:id (Archive or hard delete depending on usage)
router.delete('/clauses/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const clause = await Clause.findOne({ _id: req.params.id, userId });
    if (!clause) {
      return res.status(404).json({ success: false, error: 'Clause not found' });
    }

    const { hardDelete } = req.query;
    // Check if clause is used in sent proposals
    const proposals = await Proposal.find({ userId, status: { $ne: 'draft' } }, { termsAndConditions: 1 }).lean();
    const isUsedInSent = proposals.some((p) => (p.termsAndConditions || '').includes(clause.title));

    if (isUsedInSent && hardDelete === 'true') {
      // Force archive instead of breaking historical references
      clause.archived = true;
      await clause.save();
      return res.json({
        success: true,
        archived: true,
        message: 'Clause was used in sent proposals and has been archived instead of permanently deleted.',
      });
    }

    if (hardDelete === 'true' && !isUsedInSent) {
      await Clause.deleteOne({ _id: clause._id });
      return res.json({ success: true, deleted: true, message: 'Clause permanently removed.' });
    }

    // Default toggle/set archive
    clause.archived = !clause.archived;
    await clause.save();
    res.json({
      success: true,
      archived: clause.archived,
      message: clause.archived ? 'Clause archived.' : 'Clause restored.',
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. POST /api/v1/templates/clauses/reorder
router.post('/clauses/reorder', async (req, res) => {
  try {
    const userId = req.user._id;
    const { orderList } = req.body; // array of { id, order }

    if (!Array.isArray(orderList)) {
      return res.status(400).json({ success: false, error: 'orderList array is required' });
    }

    const bulkOps = orderList.map((item) => ({
      updateOne: {
        filter: { _id: item.id, userId },
        update: { $set: { order: item.order } },
      },
    }));

    if (bulkOps.length > 0) {
      await Clause.bulkWrite(bulkOps);
    }

    res.json({ success: true, message: 'Clauses reordered successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. POST /api/v1/templates/clauses/:id/restore-starter
router.post('/clauses/:id/restore-starter', async (req, res) => {
  try {
    const userId = req.user._id;
    const clause = await Clause.findOne({ _id: req.params.id, userId });
    if (!clause) {
      return res.status(404).json({ success: false, error: 'Clause not found' });
    }

    const starter = STARTER_CLAUSES.find((s) => s.starterKey === clause.starterKey || s.title === clause.title);
    if (!starter) {
      return res.status(400).json({ success: false, error: 'No original starter version found for this clause' });
    }

    clause.title = starter.title;
    clause.category = starter.category;
    clause.body = starter.body;
    clause.version = (clause.version || 1) + 1;
    clause.history = clause.history || [];
    clause.history.unshift({
      version: clause.version,
      title: clause.title,
      body: clause.body,
      category: clause.category,
      savedAt: new Date(),
    });
    if (clause.history.length > 5) clause.history = clause.history.slice(0, 5);

    await clause.save();

    const obj = clause.toObject();
    obj.id = clause._id.toString();

    res.json({ success: true, clause: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. POST /api/v1/templates/clauses/:id/restore-version
router.post('/clauses/:id/restore-version', async (req, res) => {
  try {
    const userId = req.user._id;
    const { version } = req.body;
    const clause = await Clause.findOne({ _id: req.params.id, userId });
    if (!clause) {
      return res.status(404).json({ success: false, error: 'Clause not found' });
    }

    const target = (clause.history || []).find((h) => h.version === Number(version));
    if (!target) {
      return res.status(404).json({ success: false, error: 'Historical version not found' });
    }

    clause.title = target.title || clause.title;
    clause.category = target.category || clause.category;
    clause.body = target.body || clause.body;
    clause.version = (clause.version || 1) + 1;
    clause.history.unshift({
      version: clause.version,
      title: clause.title,
      body: clause.body,
      category: clause.category,
      savedAt: new Date(),
    });
    if (clause.history.length > 5) clause.history = clause.history.slice(0, 5);

    await clause.save();

    const obj = clause.toObject();
    obj.id = clause._id.toString();

    res.json({ success: true, clause: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. POST /api/v1/templates/clauses/:id/duplicate
router.post('/clauses/:id/duplicate', async (req, res) => {
  try {
    const userId = req.user._id;
    const original = await Clause.findOne({ _id: req.params.id, userId });
    if (!original) {
      return res.status(404).json({ success: false, error: 'Original clause not found' });
    }

    const highestOrderDoc = await Clause.findOne({ userId }).sort({ order: -1 }).select('order');
    const nextOrder = (highestOrderDoc?.order ?? original.order) + 1;

    const copy = await Clause.create({
      userId,
      title: `${original.title} (Copy)`,
      category: original.category,
      body: original.body,
      defaultOn: original.defaultOn,
      appliesTo: original.appliesTo,
      order: nextOrder,
      isStarter: false,
      starterKey: null,
      version: 1,
      history: [
        {
          version: 1,
          title: `${original.title} (Copy)`,
          body: original.body,
          category: original.category,
          savedAt: new Date(),
        },
      ],
    });

    const obj = copy.toObject();
    obj.id = copy._id.toString();
    obj.usedCount = 0;

    res.status(201).json({ success: true, clause: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. GET /api/v1/templates/starter-library
router.get('/starter-library', async (req, res) => {
  try {
    const userId = req.user._id;
    const userClauses = await Clause.find({ userId, archived: false }).select('starterKey title');
    const addedKeys = new Set(userClauses.map((c) => c.starterKey).filter(Boolean));
    const addedTitles = new Set(userClauses.map((c) => c.title.toLowerCase().trim()));

    const library = STARTER_CLAUSES.map((s) => ({
      ...s,
      isAdded: addedKeys.has(s.starterKey) || addedTitles.has(s.title.toLowerCase().trim()),
    }));

    res.json({ success: true, library });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. POST /api/v1/templates/starter-library/add
router.post('/starter-library/add', async (req, res) => {
  try {
    const userId = req.user._id;
    const { starterKey } = req.body;
    const starter = STARTER_CLAUSES.find((s) => s.starterKey === starterKey);
    if (!starter) {
      return res.status(404).json({ success: false, error: 'Starter clause not found in library' });
    }

    const highestOrderDoc = await Clause.findOne({ userId }).sort({ order: -1 }).select('order');
    const nextOrder = (highestOrderDoc?.order ?? -1) + 1;

    const clause = await Clause.create({
      userId,
      title: starter.title,
      category: starter.category,
      body: starter.body,
      defaultOn: starter.defaultOn,
      appliesTo: starter.appliesTo,
      order: nextOrder,
      isStarter: true,
      starterKey: starter.starterKey,
      version: 1,
      history: [
        {
          version: 1,
          title: starter.title,
          body: starter.body,
          category: starter.category,
          savedAt: new Date(),
        },
      ],
    });

    const obj = clause.toObject();
    obj.id = clause._id.toString();
    obj.usedCount = 0;

    res.status(201).json({ success: true, clause: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// MESSAGES TAB ENDPOINTS
// -------------------------------------------------------------

// 11. GET /api/v1/templates/messages
router.get('/messages', async (req, res) => {
  try {
    const userId = req.user._id;
    await ensureSeedMessages(userId);

    const messages = await MessageTemplate.find({ userId }).sort({ createdAt: 1 });
    const formatted = messages.map((m) => {
      const obj = m.toObject();
      obj.id = m._id.toString();
      return obj;
    });

    res.json({ success: true, messages: formatted });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 12. PATCH /api/v1/templates/messages/:key
router.patch('/messages/:key', async (req, res) => {
  try {
    const userId = req.user._id;
    const { subject, body } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({ success: false, error: 'Message subject is required' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, error: 'Message body is required' });
    }

    let message = await MessageTemplate.findOne({ userId, key: req.params.key });
    if (!message) {
      const defaultDef = STARTER_MESSAGES.find((s) => s.key === req.params.key);
      if (!defaultDef) {
        return res.status(404).json({ success: false, error: 'Invalid message key' });
      }
      message = new MessageTemplate({
        userId,
        key: defaultDef.key,
        title: defaultDef.title,
        subject: defaultDef.subject,
        body: defaultDef.body,
        version: 1,
        history: [],
      });
    }

    message.subject = subject.trim();
    message.body = body.trim();
    message.version = (message.version || 1) + 1;
    message.history = message.history || [];
    message.history.unshift({
      version: message.version,
      subject: message.subject,
      body: message.body,
      savedAt: new Date(),
    });
    if (message.history.length > 5) message.history = message.history.slice(0, 5);

    await message.save();

    const obj = message.toObject();
    obj.id = message._id.toString();

    res.json({ success: true, message: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. POST /api/v1/templates/messages/:key/restore-default
router.post('/messages/:key/restore-default', async (req, res) => {
  try {
    const userId = req.user._id;
    const starter = STARTER_MESSAGES.find((s) => s.key === req.params.key);
    if (!starter) {
      return res.status(404).json({ success: false, error: 'Default message not found' });
    }

    let message = await MessageTemplate.findOne({ userId, key: req.params.key });
    if (!message) {
      message = new MessageTemplate({
        userId,
        key: starter.key,
        title: starter.title,
        subject: starter.subject,
        body: starter.body,
        version: 1,
        history: [],
      });
    }

    message.subject = starter.subject;
    message.body = starter.body;
    message.version = (message.version || 1) + 1;
    message.history = message.history || [];
    message.history.unshift({
      version: message.version,
      subject: message.subject,
      body: message.body,
      savedAt: new Date(),
    });
    if (message.history.length > 5) message.history = message.history.slice(0, 5);

    await message.save();

    const obj = message.toObject();
    obj.id = message._id.toString();

    res.json({ success: true, message: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. POST /api/v1/templates/messages/:key/restore-version
router.post('/messages/:key/restore-version', async (req, res) => {
  try {
    const userId = req.user._id;
    const { version } = req.body;
    const message = await MessageTemplate.findOne({ userId, key: req.params.key });
    if (!message) {
      return res.status(404).json({ success: false, error: 'Message template not found' });
    }

    const target = (message.history || []).find((h) => h.version === Number(version));
    if (!target) {
      return res.status(404).json({ success: false, error: 'Historical version not found' });
    }

    message.subject = target.subject;
    message.body = target.body;
    message.version = (message.version || 1) + 1;
    message.history.unshift({
      version: message.version,
      subject: message.subject,
      body: message.body,
      savedAt: new Date(),
    });
    if (message.history.length > 5) message.history = message.history.slice(0, 5);

    await message.save();

    const obj = message.toObject();
    obj.id = message._id.toString();

    res.json({ success: true, message: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 15. POST /api/v1/templates/messages/send-test
router.post('/messages/send-test', async (req, res) => {
  try {
    // Check if email service credentials are configured in environment
    const hasEmailConfig = Boolean(process.env.SMTP_HOST || process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY);
    if (!hasEmailConfig) {
      return res.status(400).json({
        success: false,
        error: 'No email service is currently configured on this environment. To enable live test email sending, configure SMTP or Resend credentials in server environment variables.',
        isConfigured: false,
      });
    }

    res.json({
      success: true,
      message: `Test email dispatched to ${req.user.email || req.user.businessEmail}`,
      isConfigured: true,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
