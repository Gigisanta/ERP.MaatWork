/**
 * Uploads Routes - Module Index
 *
 * Routes:
 * - POST /v1/uploads/images - Upload image for email templates
 */

import { Router } from 'express';
import imagesRouter from './images';

const router = Router();

// Mount sub-routes
router.use('/images', imagesRouter);

export default router;
