/**
 * Users Password Handlers
 *
 * POST /users/change-password - Change current user password
 */
import type { Request } from 'express';
import { db, users } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createRouteHandler, HttpError } from '../../../utils/route-handler';
import { changePasswordSchema } from '../schemas';

/**
 * POST /users/change-password - Change current user password
 */
export const handleChangePassword = createRouteHandler(async (req: Request) => {
  const userId = req.user!.id;
  const { currentPassword, newPassword } = req.body as {
    currentPassword: string;
    newPassword: string;
  };

  if (!currentPassword || !newPassword) {
    throw new HttpError(400, 'Se requiere contraseña actual y nueva contraseña');
  }

  if (newPassword.length < 6) {
    throw new HttpError(400, 'La nueva contraseña debe tener al menos 6 caracteres');
  }

  // Obtener usuario actual
  const [user] = await db()
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    throw new HttpError(404, 'Usuario no encontrado');
  }

  if (!user.passwordHash) {
    throw new HttpError(
      400,
      'No se puede cambiar contraseña: usuario no tiene contraseña configurada'
    );
  }

  // Verificar contraseña actual
  const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValidPassword) {
    throw new HttpError(401, 'Contraseña actual incorrecta');
  }

  // Hash nueva contraseña
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  // Actualizar contraseña
  await db().update(users).set({ passwordHash: hashedNewPassword }).where(eq(users.id, userId));

  req.log.info({ userId }, 'user password changed');

  return {
    message: 'Contraseña actualizada exitosamente',
  };
});
