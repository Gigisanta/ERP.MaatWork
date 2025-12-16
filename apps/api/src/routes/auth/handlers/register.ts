/**
 * Auth Register Handler
 *
 * POST /auth/register - User registration
 */
import type { Request, Response } from 'express';
import { db, users, teamMembershipRequests } from '@cactus/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createAsyncHandler, HttpError } from '../../../utils/route-handler';
import { registerSchema } from '../schemas';
import { z } from 'zod';

export const handleRegister = createAsyncHandler(async (req: Request, res: Response) => {
  const { email, fullName, password, role, requestedManagerId, username } = req.body as z.infer<
    typeof registerSchema
  >;
  const providedUsername: string | undefined = username?.trim();
  const usernameNormalized = providedUsername ? providedUsername.toLowerCase() : undefined;

  // Verificar que el email no exista
  const existingUser = await db().select().from(users).where(eq(users.email, email)).limit(1);

  if (existingUser.length > 0) {
    throw new HttpError(409, 'Este email ya está registrado');
  }

  // Verificar que el username no exista (si se envió)
  if (usernameNormalized) {
    const existingUsername = await db()
      .select()
      .from(users)
      .where(eq(users.usernameNormalized, usernameNormalized))
      .limit(1);
    if (existingUsername.length > 0) {
      throw new HttpError(409, 'Este nombre de usuario ya está en uso');
    }
  }

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(password, 10);

  // Crear usuario con isActive: false (pendiente de aprobación)
  const [newUser] = await db()
    .insert(users)
    .values({
      email,
      username: providedUsername,
      usernameNormalized,
      fullName,
      role,
      passwordHash: hashedPassword,
      isActive: false,
    })
    .returning();

  // Si es advisor y proporciona requestedManagerId, crear solicitud de membresía
  if (role === 'advisor' && requestedManagerId) {
    await db().insert(teamMembershipRequests).values({
      userId: newUser.id,
      managerId: requestedManagerId,
      status: 'pending',
    });

    req.log.info(
      {
        userId: newUser.id,
        managerId: requestedManagerId,
      },
      'Team membership request created'
    );
  }

  req.log.info(
    {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      username: newUser.username,
    },
    'User registered successfully'
  );

  // AI_DECISION: Mensaje detallado de registro exitoso
  return res.status(201).json({
    success: true,
    message:
      '¡Registro exitoso! Tu cuenta ha sido creada y está pendiente de aprobación por un administrador. Te notificaremos cuando puedas iniciar sesión.',
    userId: newUser.id,
    status: 'pending_approval',
    requestId: req.requestId,
  });
});
