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
import { requireAuth } from '../../auth/middlewares';

// Import handlers
import { listTeams, getMyTeams } from './handlers/list';
import { getTeam, createTeam, updateTeam, deleteTeam } from './handlers/crud';
import { getTeamMembers, getTeamMember, addTeamMember, removeTeamMember } from './handlers/members';
import {
  listMembershipRequests,
  approveAllRequests,
  approveRequest,
  rejectRequest,
  deleteRequest
} from './handlers/membership-requests';
import {
  listPendingInvitations,
  acceptInvitation,
  rejectInvitation,
  createInvitation,
  listEligibleAdvisors
} from './handlers/invitations';
import { getTeamMetrics, getMemberMetrics } from './handlers/metrics';
import { getTeamDetail } from './handlers/detail';

const router = Router();

// ==========================================================
// List Routes
// ==========================================================
router.get('/', requireAuth, listTeams);
router.get('/my-teams', requireAuth, getMyTeams);

// ==========================================================
// Membership Requests Routes
// ==========================================================
router.get('/membership-requests', requireAuth, listMembershipRequests);
router.post('/membership-requests/approve-all', requireAuth, approveAllRequests);
router.post('/membership-requests/:id/approve', requireAuth, approveRequest);
router.post('/membership-requests/:id/reject', requireAuth, rejectRequest);
router.delete('/membership-requests/:id', requireAuth, deleteRequest);

// ==========================================================
// Invitations Routes (user perspective)
// ==========================================================
router.get('/invitations/pending', requireAuth, listPendingInvitations);
router.post('/invitations/:id/accept', requireAuth, acceptInvitation);
router.post('/invitations/:id/reject', requireAuth, rejectInvitation);

// ==========================================================
// Team CRUD Routes
// ==========================================================
router.get('/:id', requireAuth, getTeam);
router.post('/', requireAuth, createTeam);
router.put('/:id', requireAuth, updateTeam);
router.delete('/:id', requireAuth, deleteTeam);

// ==========================================================
// Team Members Routes
// ==========================================================
router.get('/:id/members', requireAuth, getTeamMembers);
router.get('/:id/members/:memberId', requireAuth, getTeamMember);
router.post('/:id/members', requireAuth, addTeamMember);
router.delete('/:id/members/:userId', requireAuth, removeTeamMember);

// ==========================================================
// Team Detail and Metrics Routes
// ==========================================================
router.get('/:id/detail', requireAuth, getTeamDetail);
router.get('/:id/metrics', requireAuth, getTeamMetrics);
router.get('/:id/members/:memberId/metrics', requireAuth, getMemberMetrics);

// ==========================================================
// Team Invitations Routes (manager perspective)
// ==========================================================
router.post('/:id/invitations', requireAuth, createInvitation);
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
  type InviteMemberInput
} from './schemas';
