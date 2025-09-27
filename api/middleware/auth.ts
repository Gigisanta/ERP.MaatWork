import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/supabase.js';

// Extender el tipo Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    // Verificar el token con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(403).json({ error: 'Token inválido o expirado' });
    }

    // Agregar información del usuario al request
    req.user = {
      id: user.id,
      email: user.email || '',
      role: user.user_metadata?.role || 'user'
    };

    next();
  } catch (error) {
    console.error('Error en autenticación:', error);
    return res.status(500).json({ error: 'Error interno de autenticación' });
  }
};

// Middleware para verificar roles específicos
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const userRole = req.user.role || 'user';
    if (!roles.includes(userRole)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }

    next();
  };
};

// Middleware para verificar que el usuario sea propietario del recurso
export const requireOwnership = (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.userId || req.body.userId || req.query.userId;
  
  if (!req.user) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  if (req.user.id !== userId && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado' });
  }

  next();
};