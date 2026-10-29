import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import workspaceRoutes from './workspace.routes.js';
import projectRoutes from './project.routes.js';
import taskRoutes from './task.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);

export default router;
