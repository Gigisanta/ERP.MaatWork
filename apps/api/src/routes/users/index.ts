/**
 * Users Routes - Module Index
 *
 * Combines all user-related routes into a single router.
 *
 * Routes:
 * - GET /users - List users with pagination (list.ts)
 * - GET /users/pending - List pending users (list.ts)
 * - GET /users/managers - List active managers (list.ts)
 * - GET /users/advisors - List active advisors (list.ts)
 * - GET /users/me - Get current user profile (profile.ts)
 * - GET /users/:id - Get user by ID (crud.ts)
 * - POST /users - Create user (crud.ts)
 * - POST /users/change-password - Change password (password.ts)
 * - POST /users/:id/approve - Approve user (status.ts)
 * - POST /users/:id/reject - Reject user (status.ts)
 * - PATCH /users/me - Update current user profile (profile.ts)
 * - PATCH /users/:id/status - Update user status (status.ts)
 * - PATCH /users/:id/role - Update user role (role.ts)
 * - DELETE /users/:id - Delete user (crud.ts)
 */
import { Router } from 'express';
import { requireAuth, requireRole } from '../../auth/middlewares';
import { validate } from '../../utils/validation';
import {
  listUsersQuerySchema,
  idParamSchema,
  createUserWithPasswordSchema,
  updateStatusSchema,
  updateRoleSchema,
  updateProfileSchema,
  changePasswordSchema,
} from './schemas';

// Import handlers
import {
  handleListUsers,
  handleListPendingUsers,
  handleListManagers,
  handleListAdvisors,
} from './handlers/list';
import {
  handleCreateUser,
  handleGetUser,
  handleDeleteUser,
} from './handlers/crud';
import {
  handleUpdateUserStatus,
  handleApproveUser,
  handleRejectUser,
} from './handlers/status';
import { handleUpdateUserRole } from './handlers/role';
import {
  handleGetCurrentUser,
  handleUpdateCurrentUserProfile,
} from './handlers/profile';
import { handleChangePassword } from './handlers/password';

const router = Router();

// ==========================================================
// List Routes (must come before /:id routes)
// ==========================================================

router.get(
  '/',
  requireAuth,
  requireRole(['manager', 'admin']),
  validate({ query: listUsersQuerySchema }),
  handleListUsers
);

router.get('/pending', requireAuth, requireRole(['admin']), handleListPendingUsers);

router.get('/managers', handleListManagers); // Public for registration

router.get('/advisors', requireAuth, handleListAdvisors);

// ==========================================================
// Current User Routes
// ==========================================================

router.get('/me', requireAuth, handleGetCurrentUser);

router.patch(
  '/me',
  requireAuth,
  validate({ body: updateProfileSchema }),
  handleUpdateCurrentUserProfile
);

router.post(
  '/change-password',
  requireAuth,
  validate({ body: changePasswordSchema }),
  handleChangePassword
);

// ==========================================================
// CRUD Routes
// ==========================================================

router.post(
  '/',
  requireAuth,
  requireRole(['admin']),
  validate({ body: createUserWithPasswordSchema }),
  handleCreateUser
);

router.get('/:id', requireAuth, requireRole(['manager', 'admin']), validate({ params: idParamSchema }), handleGetUser);

router.delete(
  '/:id',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema }),
  handleDeleteUser
);

// ==========================================================
// Status Routes
// ==========================================================

router.patch(
  '/:id/status',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema, body: updateStatusSchema }),
  handleUpdateUserStatus
);

router.post('/:id/approve', requireAuth, requireRole(['admin']), validate({ params: idParamSchema }), handleApproveUser);

router.post('/:id/reject', requireAuth, requireRole(['admin']), validate({ params: idParamSchema }), handleRejectUser);

// ==========================================================
// Role Routes
// ==========================================================

router.patch(
  '/:id/role',
  requireAuth,
  requireRole(['admin']),
  validate({ params: idParamSchema, body: updateRoleSchema }),
  handleUpdateUserRole
);

export default router;

// Re-export schemas for external use
export {
  createUserSchema,
  updateStatusSchema,
  updateRoleSchema,
  updateProfileSchema,
  changePasswordSchema,
  createUserWithPasswordSchema,
  listUsersQuerySchema,
  idParamSchema,
  type CreateUserInput,
  type UpdateStatusInput,
  type UpdateRoleInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
  type CreateUserWithPasswordInput,
} from './schemas';






















