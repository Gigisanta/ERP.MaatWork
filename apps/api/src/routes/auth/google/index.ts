/**
 * Google OAuth Routes - Module Index
 *
 * Routes:
 * - GET /auth/google/init - Inicia el flujo OAuth2 (handlers.ts)
 * - GET /auth/google/callback - Callback después de autorización (handlers.ts)
 * - DELETE /auth/google/disconnect - Desconecta la cuenta (handlers.ts)
 */

import { Router } from 'express';
import {
  handleGoogleAuthInit,
  handleGoogleAuthCallback,
  handleGoogleAuthDisconnect,
} from './handlers';
import { requireAuth } from '../../../auth/middlewares';

const router = Router();

// ==========================================================
// Google OAuth Routes
// ==========================================================

router.get('/init', handleGoogleAuthInit);

router.get('/callback', handleGoogleAuthCallback);

router.delete('/disconnect', requireAuth, handleGoogleAuthDisconnect);

export default router;
