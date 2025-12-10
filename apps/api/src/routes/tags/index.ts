/**
 * Tags Router - Main Entry Point
 *
 * Combines all tag-related handlers into a single router:
 * - /tags/* - Tag CRUD operations
 * - Contact-tag relationships
 * - /rules/* - Tag rules
 * - /segments/* - Segments
 */

import { Router } from 'express';
import crudHandlers from './handlers/crud';
import contactTagsHandlers from './handlers/contact-tags';
import rulesHandlers from './handlers/rules';
import segmentsHandlers from './handlers/segments';

const router = Router();

// Tag CRUD (GET, POST, PUT, DELETE /tags)
router.use('/', crudHandlers);

// Contact-tag relationships
// These routes need to be mounted at root because some paths overlap
router.use('/', contactTagsHandlers);

// Tag rules (/rules/*)
router.use('/rules', rulesHandlers);

// Segments (/segments/*)
router.use('/segments', segmentsHandlers);

export default router;
