import express from 'express';
import { Project } from '../models/Project.js';
import { Client } from '../models/Client.js';
import { RequirementAnalysis } from '../models/RequirementAnalysis.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { requireAuth } from '../middleware/auth.js';
import { AgentsDocGenerator } from '../services/agentsGenerator.js';
import { getProfessionConfig } from '../config/professions.js';

import { getSubscriptionDetails, enforcePlanLimits } from '../services/subscriptionService.js';

const router = express.Router();
router.use(requireAuth);

router.post('/generate', enforcePlanLimits('agents_doc'), async (req, res) => {
  try {
    const userId = req.user._id;



    const { projectId, analysisId } = req.body;

    let project = null;
    let client = null;

    if (projectId) {
      project = await Project.findOne({ _id: projectId, userId });
      if (project) {
        client = await Client.findOne({ _id: project.clientId, userId });
      }
    }

    if (!project && analysisId) {
      project = await RequirementAnalysis.findOne({ _id: analysisId, userId });
      if (project && project.clientId) {
        client = await Client.findOne({ _id: project.clientId, userId });
      }
    }

    if (!project) {
      project = await Project.findOne({ userId }).sort({ createdAt: -1 });
      if (project) {
        client = await Client.findOne({ _id: project.clientId, userId });
      } else {
        project = await RequirementAnalysis.findOne({ userId }).sort({ createdAt: -1 });
        if (project && project.clientId) {
          client = await Client.findOne({ _id: project.clientId, userId });
        }
      }
    }

    if (!project) {
      project = {
        title: `${req.user.businessName || req.user.name}'s Web Platform`,
        projectType: 'custom-web-apps',
        clientObjectives: 'Build a high-performance modern business web application with full responsive design and verified security.',
        targetAudience: 'End customers and operational team.',
        estimatedHours: 40,
        confirmedRequirements: [
          'Responsive UI supporting desktop and mobile devices',
          'Production build with optimized performance and accessibility',
          'Form validation, error handling, and clean feedback states',
        ],
        exclusions: ['Native mobile apps', 'Legacy system migrations'],
        deliverables: ['Production deployment', 'Technical documentation'],
        acceptanceCriteria: ['Passes automated test suite', 'Zero critical console errors'],
        pagesAndFeatures: [
          { name: 'Core Application Workflow', hours: 16, complexity: 'medium' },
          { name: 'User Dashboard & Settings', hours: 14, complexity: 'simple' },
          { name: 'Testing & Production Deployment', hours: 10, complexity: 'simple' },
        ],
        thirdPartyIntegrations: ['Transactional Email', 'Analytics'],
      };
    } else if (typeof project.toObject === 'function') {
      project = project.toObject();
    }

    const markdown = AgentsDocGenerator.generate({
      project,
      client: client ? client.toObject() : { name: 'Client Partner', company: 'Client Enterprise' },
      user: req.user,
    });

    await ActivityLog.create({
      userId,
      action: 'GENERATE_AGENTS_DOC',
      entityType: 'AgentsDoc',
      entityId: project?._id ? project._id.toString() : userId.toString(),
      details: `Generated client-specific instructions for "${project.title || project.projectTitle}"`,
    });

    const profConfig = getProfessionConfig(req.user?.field);

    res.json({
      success: true,
      markdown,
      projectTitle: project.title || project.projectTitle,
      filename: profConfig.artifactName || 'AGENTS.md',
      docType: profConfig.instructionsDocType,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
