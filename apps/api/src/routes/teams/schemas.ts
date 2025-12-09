/**
 * Teams Validation Schemas
 *
 * Zod schemas for validating teams CRUD and membership operations
 */
import { z } from 'zod';
import { uuidSchema } from '../../utils/common-schemas';
import { optionalEmailSchema } from '../../utils/validation-common';

// ==========================================================
// Team CRUD Schemas
// ==========================================================

export const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  managerUserId: z.string().uuid().optional().nullable(),
  calendarUrl: z.string().url().max(500).optional().nullable(),
});

export const updateTeamSchema = createTeamSchema.partial();

// ==========================================================
// Member Management Schemas
// ==========================================================

export const addMemberSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['member', 'manager']).default('member'),
});

export const inviteMemberSchema = z
  .object({
    userId: z.string().uuid().optional(),
    email: optionalEmailSchema,
  })
  .refine((data) => data.userId || data.email, {
    message: 'Either userId or email must be provided',
  });

export const createInvitationSchema = z.object({
  userId: z.string().uuid(),
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

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
