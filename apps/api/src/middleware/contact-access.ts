import type { Request, Response, NextFunction } from 'express';
import { canAccessContact } from '../auth/authorization';
import type { UserRole } from '../auth/types';

/**
 * Middleware para verificar acceso a un contacto
 * Busca contactId en req.params.id, req.params.contactId, req.body.contactId o req.query.contactId
 */
export async function requireContactAccess(req: Request, res: Response, next: NextFunction) {
  const userId = req.user?.id;
  const role = req.user?.role as UserRole;

  if (!userId || !role) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  // Buscar contactId en diferentes ubicaciones
  const contactId = 
    req.params.id || 
    req.params.contactId || 
    req.body.contactId || 
    req.query.contactId;

  if (!contactId || typeof contactId !== 'string') {
    return res.status(400).json({ error: 'contactId is required' });
  }

  try {
    // Verificar acceso de forma asíncrona
    const hasAccess = await canAccessContact(userId, role, contactId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'No tienes acceso a este contacto' });
    }
    
    // Guardar contactId en req para uso posterior
    (req as any).contactId = contactId;
    next();
  } catch (error) {
    req.log?.error({ err: error, contactId }, 'Error checking contact access');
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}
