import express from 'express';
import { Project } from '../models/Project.js';
import { Client } from '../models/Client.js';
import { Proposal } from '../models/Proposal.js';
import { Invoice } from '../models/Invoice.js';
import { Expense } from '../models/Expense.js';
import { PricingSetting } from '../models/PricingSetting.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
router.use(requireAuth);

// Helper to calculate project task progress & hours
function calculateProjectStats(project) {
  const tasks = project.tasks || [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done' || t.completed).length;

  const totalEstimatedHours = tasks.reduce((sum, t) => sum + (Number(t.estimatedHours) || 0), 0);
  const totalLoggedHours = tasks.reduce((sum, t) => {
    const fromEntries = (t.timeEntries || []).reduce((eSum, e) => eSum + (Number(e.hours) || 0), 0);
    return sum + (fromEntries > 0 ? fromEntries : Number(t.actualHours) || 0);
  }, 0);

  const changeOrders = project.changeRequests || [];
  const openChangeOrders = changeOrders.filter((cr) => cr.status === 'draft' || cr.status === 'sent' || cr.status === 'pending_approval');
  const openChangeOrdersCount = openChangeOrders.length;
  const openChangeOrdersValue = openChangeOrders.reduce((sum, cr) => sum + (Number(cr.impactCost) || 0), 0);

  const contractVal = Number(project.contractValue) || 0;
  const effectiveRate = totalLoggedHours > 0 ? Math.round(contractVal / totalLoggedHours) : (totalEstimatedHours > 0 ? Math.round(contractVal / totalEstimatedHours) : 0);

  return {
    totalTasks,
    completedTasks,
    totalEstimatedHours,
    totalLoggedHours,
    openChangeOrdersCount,
    openChangeOrdersValue,
    effectiveRate,
  };
}

// 1. List projects
router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const { search, status } = req.query;

    const filter = { userId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    const projects = await Project.find(filter)
      .populate('clientId')
      .populate('proposalId')
      .sort({ createdAt: -1 })
      .lean();

    if (projects.length === 0) {
      return res.json({ success: true, projects: [] });
    }

    const projectIds = projects.map((p) => p._id);
    const [allInvoices, allExpenses] = await Promise.all([
      Invoice.find({ projectId: { $in: projectIds }, userId }, 'projectId totalAmount amountPaid status').lean(),
      Expense.find({ projectId: { $in: projectIds }, userId }, 'projectId amount').lean(),
    ]);

    const invoiceStats = new Map();
    for (const inv of allInvoices) {
      const pId = inv.projectId?.toString();
      if (!pId) continue;
      if (!invoiceStats.has(pId)) invoiceStats.set(pId, { totalInvoiced: 0, amountPaid: 0 });
      const stat = invoiceStats.get(pId);
      if (inv.status !== 'cancelled') {
        stat.totalInvoiced += (inv.totalAmount || 0);
        stat.amountPaid += (inv.amountPaid || 0);
      }
    }

    const expenseStats = new Map();
    for (const exp of allExpenses) {
      const pId = exp.projectId?.toString();
      if (!pId) continue;
      if (!expenseStats.has(pId)) expenseStats.set(pId, 0);
      expenseStats.set(pId, expenseStats.get(pId) + (exp.amount || 0));
    }

    const enriched = projects.map((p) => {
      const pId = p._id.toString();
      const inv = invoiceStats.get(pId) || { totalInvoiced: 0, amountPaid: 0 };
      const totalExpenses = expenseStats.get(pId) || 0;
      const stats = calculateProjectStats(p);

      return {
        ...p,
        id: pId,
        client: p.clientId,
        proposal: p.proposalId,
        totalInvoiced: inv.totalInvoiced,
        amountPaid: inv.amountPaid,
        totalExpenses,
        netProfit: inv.amountPaid - totalExpenses,
        ...stats,
      };
    });

    res.json({ success: true, projects: enriched });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Create project manually
router.post('/', async (req, res) => {
  try {
    const userId = req.user._id;
    const { clientId, title, contractValue, dueDate, milestones, tasks, notes } = req.body;

    if (!clientId || !title) {
      return res.status(400).json({ success: false, error: 'Client and project title are required' });
    }

    const client = await Client.findOne({ _id: clientId, userId }).lean();
    if (!client) {
      return res.status(404).json({ success: false, error: 'Client not found or unauthorized' });
    }

    const newProject = await Project.create({
      userId,
      clientId,
      title: title.trim(),
      status: 'not_started',
      contractValue: Number(contractValue) || 0,
      currency: client.currency || req.user.currency || 'USD',
      startDate: new Date(),
      dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      milestones: milestones || [
        {
          id: `m-1-${Date.now()}`,
          title: 'Deposit milestone',
          percentage: 50,
          amount: Math.round((Number(contractValue) || 0) * 0.5),
          dueTrigger: 'Upon agreement execution',
          status: 'ready_to_invoice',
        },
        {
          id: `m-2-${Date.now()}`,
          title: 'Final sign-off & delivery',
          percentage: 50,
          amount: Math.round((Number(contractValue) || 0) * 0.5),
          dueTrigger: 'Upon production launch',
          status: 'upcoming',
        },
      ],
      tasks: (tasks || []).map((t, idx) => ({
        id: `task-${idx + 1}-${Date.now()}`,
        title: t.title || `Task ${idx + 1}`,
        description: t.description || '',
        status: 'todo',
        completed: false,
        estimatedHours: Number(t.estimatedHours) || 0,
        actualHours: 0,
        priority: 'medium',
        timeEntries: [],
      })),
      changeRequests: [],
      activity: [
        {
          id: `act-${Date.now()}`,
          action: 'PROJECT_CREATED',
          details: `Project "${title.trim()}" created`,
          actor: req.user.name || 'Freelancer',
          createdAt: new Date(),
        },
      ],
      notes: notes || '',
    });

    await ActivityLog.create({
      userId,
      action: 'CREATE_PROJECT',
      entityType: 'Project',
      entityId: newProject._id.toString(),
      details: `Created project "${newProject.title}"`,
    });

    const obj = newProject.toObject();
    obj.id = newProject._id.toString();

    res.status(201).json({ success: true, project: obj });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get single project
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const project = await Project.findOne({ _id: req.params.id, userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const [client, proposal, invoices, expenses, pricingSettings] = await Promise.all([
      Client.findOne({ _id: project.clientId, userId }),
      project.proposalId ? Proposal.findOne({ _id: project.proposalId, userId }) : null,
      Invoice.find({ projectId: project._id, userId }),
      Expense.find({ projectId: project._id, userId }),
      PricingSetting.findOne({ userId }),
    ]);

    const obj = project.toObject();
    obj.id = project._id.toString();
    const stats = calculateProjectStats(project);

    res.json({
      success: true,
      project: {
        ...obj,
        ...stats,
      },
      client,
      proposal,
      invoices,
      expenses,
      standardRate: pricingSettings?.hourlyRate || 50,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update project (with automated status rules & task sync)
router.patch('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const project = await Project.findOne({ _id: req.params.id, userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const allowed = ['title', 'status', 'contractValue', 'dueDate', 'milestones', 'tasks', 'notes'];
    for (const f of allowed) {
      if (req.body[f] !== undefined) {
        project[f] = req.body[f];
      }
    }

    // Auto-status logic if status wasn't manually set to on_hold or completed
    if (project.status !== 'on_hold' && project.status !== 'completed') {
      const tasks = project.tasks || [];
      const hasAnyStarted = tasks.some(
        (t) => t.status === 'in_progress' || t.status === 'done' || (t.timeEntries && t.timeEntries.length > 0)
      );
      const allDone = tasks.length > 0 && tasks.every((t) => t.status === 'done');

      if (allDone) {
        project.status = 'in_review';
      } else if (hasAnyStarted) {
        project.status = 'in_progress';
      } else if (tasks.length > 0) {
        project.status = 'not_started';
      }
    }

    await project.save();

    // Auto-update Client status: 'completed' when all projects are done, or 'active' if ongoing
    if (project.clientId) {
      const clientProjects = await Project.find({ clientId: project.clientId, userId });
      const allDone = clientProjects.length > 0 && clientProjects.every((p) => p.status === 'completed');
      if (allDone) {
        await Client.findByIdAndUpdate(project.clientId, { status: 'completed' });
      } else {
        const hasActive = clientProjects.some((p) => ['in_progress', 'in_review', 'not_started'].includes(p.status));
        if (hasActive) {
          await Client.findByIdAndUpdate(project.clientId, { status: 'active' });
        }
      }
    }

    const obj = project.toObject();
    obj.id = project._id.toString();
    const stats = calculateProjectStats(project);

    res.json({
      success: true,
      project: {
        ...obj,
        ...stats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Add Task
router.post('/:id/tasks', async (req, res) => {
  try {
    const userId = req.user._id;
    const project = await Project.findOne({ _id: req.params.id, userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const { title, description, estimatedHours, priority, dueDate, status } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Task title is required' });
    }

    const newTask = {
      id: `task-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      description: description || '',
      status: status || 'todo',
      completed: status === 'done',
      estimatedHours: Number(estimatedHours) || 0,
      actualHours: 0,
      priority: priority || 'medium',
      dueDate: dueDate ? new Date(dueDate) : null,
      timeEntries: [],
    };

    project.tasks.push(newTask);

    // Record activity
    project.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'TASK_CREATED',
      details: `Added task "${newTask.title}" (${newTask.estimatedHours} hrs)`,
      actor: req.user.name || 'Freelancer',
      createdAt: new Date(),
    });

    await project.save();

    const stats = calculateProjectStats(project);
    res.status(201).json({ success: true, task: newTask, project: { ...project.toObject(), id: project._id.toString(), ...stats } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Log Time against Task
router.post('/:id/tasks/:taskId/time', async (req, res) => {
  try {
    const userId = req.user._id;
    const project = await Project.findOne({ _id: req.params.id, userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const task = project.tasks.find((t) => t.id === req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    const { hours, note, date } = req.body;
    const numHours = Number(hours);
    if (!numHours || numHours <= 0) {
      return res.status(400).json({ success: false, error: 'Valid hours required' });
    }

    const entry = {
      id: `entry-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      hours: numHours,
      note: (note || '').trim(),
      date: date ? new Date(date) : new Date(),
      createdAt: new Date(),
    };

    task.timeEntries.push(entry);
    task.actualHours = task.timeEntries.reduce((s, e) => s + (Number(e.hours) || 0), 0);

    // Auto-advance project to in_progress if not_started
    if (project.status === 'not_started') {
      project.status = 'in_progress';
    }

    project.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'TIME_LOGGED',
      details: `Logged ${numHours} hrs on "${task.title}": ${entry.note || 'Work completed'}`,
      actor: req.user.name || 'Freelancer',
      createdAt: new Date(),
    });

    await project.save();

    const stats = calculateProjectStats(project);
    res.json({
      success: true,
      timeEntry: entry,
      task,
      project: {
        ...project.toObject(),
        id: project._id.toString(),
        ...stats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Add Change Order (Scope Change Request)
router.post('/:id/change-requests', async (req, res) => {
  try {
    const userId = req.user._id;
    const project = await Project.findOne({ _id: req.params.id, userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const { title, description, extraTasks, impactHours, impactCost, reason } = req.body;
    if (!description || !description.trim()) {
      return res.status(400).json({ success: false, error: 'Description is required for change order' });
    }

    const parsedExtraTasks = Array.isArray(extraTasks) ? extraTasks : [];
    const calculatedHours = Number(impactHours) || parsedExtraTasks.reduce((s, t) => s + (Number(t.estimatedHours) || 0), 0) || 8;
    const calculatedCost = Number(impactCost) || calculatedHours * 50;

    const changeOrder = {
      id: `cr-${Date.now().toString().slice(-6)}`,
      title: title?.trim() || 'Scope Change Order',
      description: description.trim(),
      reason: reason || 'client_request',
      extraTasks: parsedExtraTasks.map((t) => ({
        title: t.title || 'Additional work item',
        estimatedHours: Number(t.estimatedHours) || 0,
      })),
      impactHours: calculatedHours,
      impactCost: calculatedCost,
      status: 'draft',
      createdAt: new Date(),
    };

    project.changeRequests.push(changeOrder);

    project.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'CHANGE_ORDER_CREATED',
      details: `Drafted change order "${changeOrder.title}" (+${calculatedHours} hrs, +$${calculatedCost})`,
      actor: req.user.name || 'Freelancer',
      createdAt: new Date(),
    });

    await project.save();

    const stats = calculateProjectStats(project);
    res.status(201).json({
      success: true,
      changeRequest: changeOrder,
      project: {
        ...project.toObject(),
        id: project._id.toString(),
        ...stats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Approve Change Order -> Adds tasks to board, adds hours and value
router.post('/:id/change-requests/:crId/approve', async (req, res) => {
  try {
    const userId = req.user._id;
    const project = await Project.findOne({ _id: req.params.id, userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const cr = project.changeRequests.find((c) => c.id === req.params.crId);
    if (!cr) {
      return res.status(404).json({ success: false, error: 'Change request not found' });
    }

    cr.status = 'approved';
    cr.approvedAt = new Date();

    // Add extra tasks to the project board tagged as from change order
    if (Array.isArray(cr.extraTasks) && cr.extraTasks.length > 0) {
      cr.extraTasks.forEach((et, idx) => {
        project.tasks.push({
          id: `task-cr-${cr.id}-${idx + 1}-${Date.now().toString(36)}`,
          title: et.title,
          description: `From approved Change Order: ${cr.title}`,
          status: 'todo',
          completed: false,
          estimatedHours: Number(et.estimatedHours) || 0,
          actualHours: 0,
          isFromChangeOrder: true,
          priority: 'medium',
          timeEntries: [],
        });
      });
    } else {
      // Create at least one task for the change order
      project.tasks.push({
        id: `task-cr-${cr.id}-${Date.now().toString(36)}`,
        title: cr.title,
        description: cr.description,
        status: 'todo',
        completed: false,
        estimatedHours: cr.impactHours,
        actualHours: 0,
        isFromChangeOrder: true,
        priority: 'high',
        timeEntries: [],
      });
    }

    // Add value to contract total
    project.contractValue = (project.contractValue || 0) + cr.impactCost;

    // Record in activity
    project.activity.unshift({
      id: `act-${Date.now()}`,
      action: 'CHANGE_ORDER_APPROVED',
      details: `Approved "${cr.title}". Added ${cr.impactHours} hrs and increased contract by $${cr.impactCost}.`,
      actor: req.user.name || 'Freelancer',
      createdAt: new Date(),
    });

    await project.save();

    const stats = calculateProjectStats(project);
    res.json({
      success: true,
      approvedCr: cr,
      project: {
        ...project.toObject(),
        id: project._id.toString(),
        ...stats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Delete project
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user._id;
    const project = await Project.findOneAndDelete({ _id: req.params.id, userId });
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }

    await ActivityLog.create({
      userId,
      action: 'DELETE_PROJECT',
      entityType: 'Project',
      entityId: project._id.toString(),
      details: `Deleted project "${project.title}"`,
    });

    res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
