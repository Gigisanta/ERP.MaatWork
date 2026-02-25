/**
 * Users Validation Schemas
 *
 * Zod schemas for validating users CRUD operations
 */
import { z } from 'zod';
import {
  paginationBaseSchema,
  idParamSchema,
  emailSchema,
  uuidSchema,
} from '../../utils/validation/common-schemas';

// ==========================================================
// Body Schemas
// ==========================================================

const createUserSchema = z.object({
  email: emailSchema,
  fullName: z.string().min(1).max(255),
  role: z.enum(['admin', 'manager', 'advisor', 'owner', 'staff']),
  isActive: z.boolean().default(true),
});

export const updateStatusSchema = z.object({
  isActive: z.boolean(),
});

export const updateRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'advisor', 'owner', 'staff']),
});

export const updateProfileSchema = z.object({
  phone: z
    .string()
    .min(1, 'El número de teléfono es obligatorio')
    .max(50, 'El número de teléfono no puede exceder 50 caracteres'),
  fullName: z.string().min(1).max(255).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Se requiere contraseña actual'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

export const createUserWithPasswordSchema = z.object({
  email: emailSchema,
  fullName: z.string().min(1).max(255),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  role: z.enum(['admin', 'manager', 'advisor', 'owner', 'staff']),
  requestedManagerId: uuidSchema.optional(),
});

// ==========================================================
// Query Schemas
// ==========================================================

export const listUsersQuerySchema = paginationBaseSchema.extend({
  isActive: z.enum(['true', 'false']).optional(),
});

// ==========================================================
// Param Schemas
// ==========================================================

export { idParamSchema };

// ==========================================================
// Type Exports
// ==========================================================

type CreateUserInput = z.infer<typeof createUserSchema>;
type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
type CreateUserWithPasswordInput = z.infer<typeof createUserWithPasswordSchema>;
