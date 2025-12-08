/**
 * Auth Routes - Module Index
 *
 * Combines all authentication-related routes into a single router.
 *
 * Routes:
 * - POST /auth/login - User login (login.ts)
 * - POST /auth/register - User registration (register.ts)
 * - GET /auth/me - Get current user (session.ts)
 * - POST /auth/refresh - Refresh token (session.ts)
 * - POST /auth/logout - Logout (session.ts)
 */
import { Router } from 'express';
import { requireAuth } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import { loginSchema, registerSchema } from './schemas';

// Import handlers
import { handleLogin } from './handlers/login';
import { handleRegister } from './handlers/register';
import { handleGetCurrentUser, handleRefreshToken, handleLogout } from './handlers/session';

const router = Router();

// ==========================================================
// Authentication Routes
// ==========================================================

router.post('/login', validate({ body: loginSchema }), handleLogin);

router.post('/register', validate({ body: registerSchema }), handleRegister);

// ==========================================================
// Session Routes
// ==========================================================

router.get('/me', requireAuth, handleGetCurrentUser);

router.post('/refresh', handleRefreshToken);

router.post('/logout', requireAuth, handleLogout);

export default router;

// Re-export schemas for external use
export { loginSchema, registerSchema, type LoginInput, type RegisterInput } from './schemas';
