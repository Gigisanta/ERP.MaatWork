import { SignJWT, jwtVerify } from 'jose';
import type { AuthUser } from './types';

const JWT_ISSUER = 'cactus-api';
const JWT_AUDIENCE = 'cactus-web';

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'dev-insecure-secret-change-me';
  return new TextEncoder().encode(secret);
}

export async function signUserToken(user: AuthUser, expiresIn: string = '7d'): Promise<string> {
  const token = await new SignJWT({
    role: user.role,
    email: user.email,
    fullName: user.fullName
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
    audience: JWT_AUDIENCE
  });

  const id = payload.sub as string | undefined;
  if (!id) throw new Error('invalid token: missing sub');

  return {
    id,
    email: (payload.email as string) || '',
    role: (payload.role as any) || 'advisor',
    fullName: (payload.fullName as string) || undefined
  };
}


