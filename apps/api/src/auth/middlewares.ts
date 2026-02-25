import type { Request, Response, NextFunction } from 'express';
import { verifyUserToken } from './jwt';
import type { UserRole } from './types';
import { db, users } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import { getCachedUser, setCachedUser } from './cache';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const extracted = auth.slice('Bearer '.length);
      if (extracted !== 'undefined' && extracted !== 'null') {
        token = extracted;
      }
    }
    // AI_DECISION: Priorizar cookie httpOnly sobre Bearer token
    // Justificación: Cookie es más seguro (inmune a XSS), Bearer es fallback para compatibilidad
    // Impacto: La autenticación funciona principalmente vía cookies
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }
    // Fallback: parsear cookie manualmente si cookie-parser no funciona
    if (!token && req.headers.cookie) {
      // Regex mejorada para manejar múltiples cookies con espacios opcionales
      const m = /(?:^|;\s*)token=([^;]+)/.exec(req.headers.cookie);
      if (m && m[1]) {
        const decoded = decodeURIComponent(m[1]);
        // AI_DECISION: Explicit check for "undefined" string in cookie
        // Justificación: Client can sometimes send "token=undefined" which bypasses null checks
        if (decoded !== 'undefined' && decoded !== 'null') {
          token = decoded;
        }
      }
    }
    if (!token) {
      // AI_DECISION: Log detallado para debugging de auth issues
      req.log?.warn(
        {
          hasAuthHeader: !!auth,
          hasCookies: !!req.cookies,
          hasCookieHeader: !!req.headers.cookie,
          cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
          cookieHeaderLength: req.headers.cookie?.length || 0,
          origin: req.headers.origin,
          referer: req.headers.referer,
          userAgent: req.headers['user-agent'],
          host: req.headers.host, // Log host header
          url: req.url,
        },
        'No token found in request'
      );
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // AI_DECISION: Validate token format before attempting JWT verification
    // Justificación: JWSInvalid errors occur when token is empty, malformed, or not a valid JWT
    // Impacto: Provides clearer error messages and prevents cryptic jose library errors
    const tokenStr = token.trim();
    if (!tokenStr) {
      req.log?.warn({ tokenLength: token.length }, 'Token is empty or whitespace only');
      return res.status(401).json({ message: 'Unauthorized - Invalid token format' });
    }

    // JWT tokens must have 3 parts separated by dots (header.payload.signature)
    const parts = tokenStr.split('.');
    if (parts.length !== 3) {
      req.log?.warn(
        {
          tokenLength: tokenStr.length,
          parts: parts.length,
          tokenPreview: tokenStr.substring(0, 20) + '...',
        },
        'Token does not have valid JWT format (expected 3 parts)'
      );
      return res.status(401).json({ message: 'Unauthorized - Invalid token format' });
    }

    const user = await verifyUserToken(tokenStr);

    // AI_DECISION: Optimizar validación de usuario con cache
    // Justificación: Evita queries redundantes a DB en cada request para datos que cambian poco
    // Impacto: Reduce carga en DB y latencia de requests
    let dbUser = getCachedUser(user.id);

    if (!dbUser) {
      const [foundUser] = await db()
        .select({ id: users.id, role: users.role, isActive: users.isActive })
        .from(users)
        .where(eq(users.id, user.id))
        .limit(1);

      dbUser = foundUser;

      if (dbUser) {
        // Cachear solo usuarios válidos
        // Castear role a string genérico para guardar en cache y luego validar
        setCachedUser({ ...dbUser, role: dbUser.role as string });
      }
    }

    if (!dbUser) {
      // AI_DECISION: Limpiar cookie si el usuario no existe en DB
      // Justificación: Evita loops infinitos de reintentos y logs de warning si el usuario fue borrado
      // Impacto: El cliente detectará la sesión inválida y redirigirá a login limpiamente
      res.clearCookie('token');
      req.log?.warn({ userId: user.id }, 'User from token not found in database - clearing cookie');
      return res.status(401).json({ message: 'Unauthorized - User not found' });
    }

    if (!dbUser.isActive) {
      req.log?.warn({ userId: user.id }, 'User from token is inactive');
      return res.status(403).json({ message: 'User account is inactive' });
    }

    // Si el role cambió en DB, usar el role de DB (más reciente)
    if (dbUser.role !== user.role) {
      req.log?.warn(
        {
          userId: user.id,
          tokenRole: user.role,
          dbRole: dbUser.role,
        },
        'Role mismatch between token and database, using DB role'
      );
      user.role = dbUser.role as UserRole;
    }

    req.user = user;
    next();
  } catch (err: unknown) {
    const error = err as Error & { code?: string };
    req.log?.warn({ err: error.message, code: error.code }, 'auth verify failed');
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

/**
 * AI_DECISION: Middleware para bloquear operaciones de escritura para rol Owner
 * Justificación: Owner es un rol de solo lectura para métricas de negocio
 * Impacto: Bloquea POST/PUT/PATCH/DELETE para usuarios con rol 'owner'
 */
export function requireWriteAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  if (req.user.role === 'owner') {
    return res.status(403).json({
      message: 'Acceso de solo lectura. El rol Owner no puede modificar datos.',
      error: 'READ_ONLY_ACCESS',
    });
  }

  next();
}

/**
 * Middleware para bloquear acceso a contactos individuales para rol Owner
 * Owner solo puede ver métricas agregadas, no contactos individuales
 */
export function requireContactAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  if (req.user.role === 'owner') {
    return res.status(403).json({
      message: 'El rol Owner no tiene acceso a contactos individuales. Use las métricas agregadas.',
      error: 'NO_CONTACT_ACCESS',
    });
  }

  next();
}

/**
 * AI_DECISION: Middleware para restringir acceso a administración de sistema
 * Solo admin tiene acceso a gestión de usuarios, configuración del sistema, etc.
 * Staff puede hacer tareas operativas pero NO administrar usuarios
 */

