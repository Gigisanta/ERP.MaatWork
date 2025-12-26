/**
 * Teams Validation Schemas
 *
 * Zod schemas for validating teams CRUD and membership operations
 */
import { z } from 'zod';
import { uuidSchema } from '../../utils/validation/common-schemas';
import { optionalEmailSchema } from '../../utils/validation/validation-common';

// ==========================================================
// Team CRUD Schemas
// ==========================================================

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  managerUserId: uuidSchema.optional().nullable(),
  calendarUrl: z.string().url().max(500).optional().nullable(),
});

export const updateTeamSchema = createTeamSchema.partial();

// ==========================================================
// Member Management Schemas
// ==========================================================

export const addMemberSchema = z.object({
  userId: uuidSchema,
  role: z.enum(['member', 'manager']).default('member'),
});

const inviteMemberSchema = z
  .object({
    userId: uuidSchema.optional(),
    email: optionalEmailSchema,
  })
  .refine((data) => data.userId || data.email, {
    message: 'Either userId or email must be provided',
  });

export const createInvitationSchema = z.object({
  userId: uuidSchema,
});

// ==========================================================
// Path Parameter Schemas
// ==========================================================

export const teamMemberParamsSchema = z.object({
  id: uuidSchema,
  memberId: uuidSchema,
});

export const teamMemberDeleteParamsSchema = z.object({
  id: uuidSchema,
  userId: uuidSchema,
});

// ==========================================================
// Type Exports
// ==========================================================

type CreateTeamInput = z.infer<typeof createTeamSchema>;
type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
type AddMemberInput = z.infer<typeof addMemberSchema>;
type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
