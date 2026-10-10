import { Router } from 'express';
import { getHealthHandler } from '../../controllers/health.controller.js';
import { validateQuery } from '../../middleware/validate.js';
import { HealthQuerySchema } from '../../../../../packages/shared/src/schemas.js';

const router = Router();

// GET /api/v1/health
router.get('/', validateQuery(HealthQuerySchema), getHealthHandler);

export default router;
