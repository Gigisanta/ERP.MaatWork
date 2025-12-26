/**
 * Teams Routes - Modular Router
 *
 * AI_DECISION: Refactorización de teams-legacy.ts (1661 líneas) en módulos por funcionalidad
 * Justificación: Mejor organización, navegabilidad y mantenibilidad del código
 * Impacto: Código más testeable, handlers reutilizables, archivos <300 líneas
 *
 * Estructura modular:
 * - schemas.ts                          # Validation schemas
 * - handlers/list.ts                    # GET /, GET /my-teams
 * - handlers/crud.ts                    # GET /:id, POST /, PUT /:id, DELETE /:id
 * - handlers/members.ts                 # Member management
 * - handlers/membership-requests.ts     # Membership requests
 * - handlers/invitations.ts             # Invitations and eligible advisors
 * - handlers/metrics.ts                 # Team and member metrics
 * - handlers/detail.ts                  # GET /:id/detail
 */

import { Router } from 'express';
import { requireAuth } from '@/auth/middlewares';
import { validate } from '@/utils/validation';
import { createRouteHandler, createAsyncHandler } from '@/utils/route-handler';
import { idParamSchema } from '@/utils/validation/common-schemas';

// Import handlers
import { listTeams, getMyTeams } from './handlers/list';
import { getTeam, createTeam, updateTeam, deleteTeam } from './handlers/crud';
import {
  getAllTeamMembers,
  getTeamMembers,
  getTeamMember,
  addTeamMember,
  removeTeamMember,
} from './handlers/members';
import {
  listMembershipRequests,
  approveAllRequests,
  approveRequest,
  rejectRequest,
  deleteRequest,
} from './handlers/membership-requests';
import {
  listPendingInvitations,
  acceptInvitation,
  rejectInvitation,
  createInvitation,
  listEligibleAdvisors,
} from './handlers/invitations';
import { getMemberDashboard } from './handlers/member-dashboard';
import {
  getTeamMetrics,
  getMemberMetrics,
  getTeamMembersActivity,
  getTeamHistory,
} from './handlers/metrics';
import { getTeamDetail } from './handlers/detail';
import { getTeamGoals, updateTeamGoal } from './handlers/goals';
import { getUnassignedOrStalledLeads, reassignLeads } from './handlers/lead-distribution';
import { getTeamCapacity } from './handlers/capacity';
import {
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
  createInvitationSchema,
  teamMemberParamsSchema,
  teamMemberDeleteParamsSchema,
} from './schemas';

const router = Router();

// ==========================================================
// List Routes
// ==========================================================
router.get('/', requireAuth, listTeams);
router.get('/my-teams', requireAuth, getMyTeams);
router.get('/member-dashboard', requireAuth, getMemberDashboard);
router.get('/members', requireAuth, getAllTeamMembers);

// ==========================================================
// Membership Requests Routes
// ==========================================================
router.get('/membership-requests', requireAuth, listMembershipRequests);
router.post('/membership-requests/approve-all', requireAuth, approveAllRequests);
router.post(
  '/membership-requests/:id/approve',
  requireAuth,
  validate({ params: idParamSchema }),
  approveRequest
);
router.post(
  '/membership-requests/:id/reject',
  requireAuth,
  validate({ params: idParamSchema }),
  rejectRequest
);
router.delete(
  '/membership-requests/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  deleteRequest
);

// ==========================================================
// Invitations Routes (user perspective)
// ==========================================================
router.get('/invitations/pending', requireAuth, listPendingInvitations);
router.post(
  '/invitations/:id/accept',
  requireAuth,
  validate({ params: idParamSchema }),
  acceptInvitation
);
router.post(
  '/invitations/:id/reject',
  requireAuth,
  validate({ params: idParamSchema }),
  rejectInvitation
);

// ==========================================================
// Team CRUD Routes
// ==========================================================
router.get('/:id', requireAuth, validate({ params: idParamSchema }), getTeam);
router.post('/', requireAuth, validate({ body: createTeamSchema }), createTeam);
router.put(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema, body: updateTeamSchema }),
  updateTeam
);
router.delete('/:id', requireAuth, validate({ params: idParamSchema }), deleteTeam);

// ==========================================================
// Team Members Routes
// ==========================================================
router.get('/:id/members', requireAuth, validate({ params: idParamSchema }), getTeamMembers);
router.get(
  '/:id/members/:memberId',
  requireAuth,
  validate({ params: teamMemberParamsSchema }),
  getTeamMember
);
router.post(
  '/:id/members',
  requireAuth,
  validate({ params: idParamSchema, body: addMemberSchema }),
  addTeamMember
);
router.delete(
  '/:id/members/:userId',
  requireAuth,
  validate({ params: teamMemberDeleteParamsSchema }),
  removeTeamMember
);

// ==========================================================
// Team Detail and Metrics Routes
// ==========================================================
router.get('/:id/detail', requireAuth, validate({ params: idParamSchema }), getTeamDetail);
router.get('/:id/metrics', requireAuth, validate({ params: idParamSchema }), getTeamMetrics);
router.get('/:id/history', requireAuth, validate({ params: idParamSchema }), getTeamHistory);
router.get(
  '/:id/members-activity',
  requireAuth,
  validate({ params: idParamSchema }),
  getTeamMembersActivity
);
router.get(
  '/:id/members/:memberId/metrics',
  requireAuth,
  validate({ params: teamMemberParamsSchema }),
  getMemberMetrics
);

// ==========================================================
// Team Goals Routes
// ==========================================================
router.get('/:id/goals', requireAuth, validate({ params: idParamSchema }), getTeamGoals);
router.post('/:id/goals', requireAuth, validate({ params: idParamSchema }), updateTeamGoal);

// ==========================================================
// Lead Distribution Routes
// ==========================================================
router.get(
  '/:id/leads/unassigned',
  requireAuth,
  validate({ params: idParamSchema }),
  getUnassignedOrStalledLeads
);
router.post('/:id/leads/reassign', requireAuth, validate({ params: idParamSchema }), reassignLeads);

// ==========================================================
// Capacity Routes
// ==========================================================
router.get('/:id/capacity', requireAuth, validate({ params: idParamSchema }), getTeamCapacity);

// ==========================================================
// Team Invitations Routes (manager perspective)
// ==========================================================
router.post(
  '/:id/invitations',
  requireAuth,
  validate({ params: idParamSchema, body: createInvitationSchema }),
  createInvitation
);
router.get('/:id/advisors', requireAuth, validate({ params: idParamSchema }), listEligibleAdvisors);

export default router;
