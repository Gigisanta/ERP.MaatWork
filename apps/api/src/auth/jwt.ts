import { SignJWT, jwtVerify } from 'jose';
import type { AuthUser } from './types';
import { ROLES, type UserRole } from './types';

const JWT_ISSUER = 'maatwork-api';
const JWT_AUDIENCE = 'maatwork-web';

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret) {
    if (isProduction) {
      throw new Error(
        'CRITICAL: JWT_SECRET environment variable is required in production. Set it in your environment variables.'
      );
    }
    // Development fallback only - still warns for security
    console.warn(
      '[SECURITY WARNING] Using insecure JWT secret fallback. Set JWT_SECRET environment variable for production deployment.'
    );
    return new TextEncoder().encode('dev-insecure-secret-change-me');
  }

  return new TextEncoder().encode(secret);
}

/**
 * Validar que un role sea válido
 */
function isValidRole(role: unknown): role is UserRole {
  return typeof role === 'string' && ROLES.includes(role as UserRole);
}

export async function signUserToken(user: AuthUser, expiresIn: string = '7d'): Promise<string> {
  // Validar que el role esté en ROLES antes de crear token
  if (!isValidRole(user.role)) {
    throw new Error(`Invalid role: ${user.role}. Must be one of: ${ROLES.join(', ')}`);
  }

  const token = await new SignJWT({
    role: user.role,
    email: user.email,
    fullName: user.fullName,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(user.id)
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(expiresIn)
    .sign(getSecretKey());
  return token;
}

export async function verifyUserToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

  const id = payload.sub as string | undefined;
  if (!id) throw new Error('invalid token: missing sub');

  // Validar role contra ROLES permitidos
  const role = payload.role;
  if (!isValidRole(role)) {
    throw new Error(`Invalid role in token: ${role}. Must be one of: ${ROLES.join(', ')}`);
  }

  const user: AuthUser = {
    id,
    email: (payload.email as string) || '',
    role,
  };
  const name = payload.fullName as string | undefined;
  if (name !== undefined) {
    user.fullName = name;
  }
  return user;
}
