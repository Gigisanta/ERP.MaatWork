/**
 * Encryption Utilities for Google OAuth Tokens
 *
 * AI_DECISION: Usar AES-256-GCM para encriptación de tokens
 * Justificación: AES-256-GCM es más seguro que AES-256-CBC, proporciona autenticación integrada
 * Impacto: Tokens almacenados en DB están protegidos incluso si la DB es comprometida
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Deriva una clave de encriptación desde la clave maestra usando scrypt
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return scryptSync(masterKey, salt, KEY_LENGTH);
}

/**
 * Encripta un token usando AES-256-GCM
 *
 * @param token - Token a encriptar
 * @param masterKey - Clave maestra (debe ser al menos 32 caracteres)
 * @returns Token encriptado en formato: salt:iv:tag:encrypted
 *
 * @example
 * ```typescript
 * const encrypted = encryptToken('my-access-token', process.env.GOOGLE_ENCRYPTION_KEY!);
 * ```
 */
export function encryptToken(token: string, masterKey: string): string {
  if (!masterKey || masterKey.length < 32) {
    throw new Error('GOOGLE_ENCRYPTION_KEY must be at least 32 characters');
  }

  const salt = randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  // Formato: salt:iv:tag:encrypted
  return `${salt.toString('hex')}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Desencripta un token encriptado usando AES-256-GCM
 *
 * @param encryptedToken - Token encriptado en formato salt:iv:tag:encrypted
 * @param masterKey - Clave maestra (debe ser la misma usada para encriptar)
 * @returns Token desencriptado
 *
 * @example
 * ```typescript
 * const decrypted = decryptToken(encryptedToken, process.env.GOOGLE_ENCRYPTION_KEY!);
 * ```
 */
export function decryptToken(encryptedToken: string, masterKey: string): string {
  const parts = encryptedToken.split(':');
  if (parts.length !== 4) {
    throw new Error('Invalid encrypted token format');
  }

  const [saltHex, ivHex, tagHex, encrypted] = parts;
  const salt = Buffer.from(saltHex, 'hex');
  const key = deriveKey(masterKey, salt);
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}








