import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { loadDemoData, clearDemoData, hasDemoData, hasRealInvoices } from '../services/demoDataService.js';

const router = express.Router();
router.use(requireAuth);

// GET /api/v1/demo/status
router.get('/status', async (req, res) => {
  try {
    const [demoExists, realInvoicesExist] = await Promise.all([
      hasDemoData(req.user._id),
      hasRealInvoices(req.user._id),
    ]);
    res.json({
      success: true,
      hasDemoData: demoExists,
      hasRealInvoices: realInvoicesExist,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/demo/load
router.post('/load', async (req, res) => {
  try {
    const realInvoicesExist = await hasRealInvoices(req.user._id);
    if (realInvoicesExist && !req.body?.confirmed) {
      return res.status(409).json({
        success: false,
        requiresConfirmation: true,
        message: 'You have real invoices created in your account. Loading demo data will add sample records alongside your actual invoices. Do you want to proceed?',
      });
    }

    const result = await loadDemoData(req.user._id, req.user);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/demo/clear
router.post('/clear', async (req, res) => {
  try {
    await clearDemoData(req.user._id);
    res.json({ success: true, message: 'All demo workspace records cleared successfully. Real records remain intact.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
