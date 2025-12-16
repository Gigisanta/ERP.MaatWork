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
router.get('/:id', requireAuth, validate({ params: idParamSchema }), createRouteHandler(getTeam));
router.post(
  '/',
  requireAuth,
  validate({ body: createTeamSchema }),
  createAsyncHandler(async (req, res) => {
    const result = await createTeam(req);
    return res.status(201).json({ success: true, data: result, requestId: req.requestId });
  })
);
router.put(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema, body: updateTeamSchema }),
  createRouteHandler(updateTeam)
);
router.delete(
  '/:id',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(deleteTeam)
);

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
router.get(
  '/:id/detail',
  requireAuth,
  validate({ params: idParamSchema }),
  createRouteHandler(getTeamDetail)
);
router.get('/:id/metrics', requireAuth, validate({ params: idParamSchema }), getTeamMetrics);
router.get('/:id/history', requireAuth, validate({ params: idParamSchema }), getTeamHistory);
router.get(
  '/:id/members-activity',
  requireAuth,
  validate({ params: idParamSchema }),
  getTeamMembersActivity
);
router.get('/:id/members/:memberId/metrics', requireAuth, getMemberMetrics);

// ==========================================================
// Team Goals Routes
// ==========================================================
router.get('/:id/goals', requireAuth, getTeamGoals);
router.post('/:id/goals', requireAuth, updateTeamGoal);

// ==========================================================
// Lead Distribution Routes
// ==========================================================
router.get('/:id/leads/unassigned', requireAuth, getUnassignedOrStalledLeads);
router.post('/:id/leads/reassign', requireAuth, reassignLeads);

// ==========================================================
// Capacity Routes
// ==========================================================
router.get('/:id/capacity', requireAuth, getTeamCapacity);

// ==========================================================
// Team Invitations Routes (manager perspective)
// ==========================================================
router.post(
  '/:id/invitations',
  requireAuth,
  validate({ body: createInvitationSchema }),
  createInvitation
);
router.get('/:id/advisors', requireAuth, listEligibleAdvisors);

export default router;

// Export schemas for external use
export {
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
  inviteMemberSchema,
  type CreateTeamInput,
  type UpdateTeamInput,
  type AddMemberInput,
  type InviteMemberInput,
} from './schemas';
