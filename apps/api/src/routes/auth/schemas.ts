/**
 * Auth Validation Schemas
 *
 * Zod schemas for validating authentication operations
 */
import { z } from 'zod';

import { emailSchema, uuidSchema } from '../../utils/validation/common-schemas';

// Username case-insensitive [a-z0-9._-], 3-20 chars
const usernameRegex = /^[a-z0-9._-]{3,20}$/;

// AI_DECISION: Login via identifier (email or username)
// Justificación: Permite autenticación flexible y más rápida por username
// Impacto: Cambia payload de /login y lógica de búsqueda
export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(6),
  rememberMe: z.union([z.boolean(), z.string().transform((val) => val === 'true')]).optional(),
});

// AI_DECISION: Roles disponibles en registro público (admin solo por admin)
// Justificación: Usuarios pueden registrarse con roles operativos, admin es exclusivo
// Impacto: Todos los roles excepto admin disponibles en registro con aprobación
export const registerSchema = z.object({
  email: emailSchema,
  fullName: z.string().min(1).max(255),
  username: z.string().regex(usernameRegex, 'Username inválido').optional(),
  password: z.string().min(6),
  role: z.enum(['advisor', 'manager', 'owner', 'staff']),
  requestedManagerId: uuidSchema.optional(), // Solo para advisors
});

// ==========================================================
// Type Exports
// ==========================================================

type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;




