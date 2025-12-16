/**
 * Script para verificar variables de entorno de Google OAuth
 *
 * AI_DECISION: Script de verificación de configuración
 * Justificación: Ayuda a detectar problemas de configuración antes de deployment
 * Impacto: Reduce errores en producción, facilita debugging
 *
 * Uso: pnpm tsx apps/api/src/scripts/verify-google-oauth-env.ts
 */

import { config } from 'dotenv';
import { resolve } from 'node:path';
import { env } from '../config/env';

// Cargar .env
config({ path: resolve(__dirname, '../../.env') });

interface EnvCheck {
  name: string;
  value: string | undefined;
  required: boolean;
  minLength?: number;
  description: string;
}

const checks: EnvCheck[] = [
  {
    name: 'GOOGLE_CLIENT_ID',
    value: env.GOOGLE_CLIENT_ID,
    required: true,
    description: 'Google OAuth Client ID from Google Cloud Console',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    value: env.GOOGLE_CLIENT_SECRET,
    required: true,
    description: 'Google OAuth Client Secret from Google Cloud Console',
  },
  {
    name: 'GOOGLE_REDIRECT_URI',
    value: env.GOOGLE_REDIRECT_URI,
    required: true,
    description: 'OAuth redirect URI (must match Google Cloud Console)',
  },
  {
    name: 'GOOGLE_ENCRYPTION_KEY',
    value: env.GOOGLE_ENCRYPTION_KEY,
    required: true,
    minLength: 32,
    description: 'Encryption key for storing tokens (min 32 chars)',
  },
  {
    name: 'FRONTEND_URL',
    value: process.env.FRONTEND_URL,
    required: true,
    description: 'Frontend URL for OAuth redirects',
  },
];

console.log('🔍 Verificando configuración de Google OAuth...\n');

let hasErrors = false;
let hasWarnings = false;

for (const check of checks) {
  const status = check.value ? '✅' : '❌';
  const prefix = check.required ? '[REQUIRED]' : '[OPTIONAL]';

  console.log(`${status} ${prefix} ${check.name}`);
  console.log(`   ${check.description}`);

  if (!check.value && check.required) {
    console.log(`   ⚠️  ERROR: Variable no configurada`);
    hasErrors = true;
  } else if (check.value) {
    // Mask sensitive values
    const displayValue =
      check.name.includes('SECRET') || check.name.includes('KEY')
        ? `${check.value.substring(0, 4)}...${check.value.substring(check.value.length - 4)}`
        : check.value;

    console.log(`   Valor: ${displayValue}`);

    // Check minimum length
    if (check.minLength && check.value.length < check.minLength) {
      console.log(
        `   ⚠️  WARNING: Debe tener al menos ${check.minLength} caracteres (actual: ${check.value.length})`
      );
      hasWarnings = true;
    }

    // Check for placeholder values
    if (check.value.includes('your-') || check.value.includes('change-me')) {
      console.log(`   ⚠️  WARNING: Parece ser un valor placeholder, debe ser reemplazado`);
      hasWarnings = true;
    }
  }

  console.log('');
}

// Additional checks
console.log('📋 Verificaciones adicionales:\n');

// Check redirect URI format
if (env.GOOGLE_REDIRECT_URI) {
  const redirectUri = env.GOOGLE_REDIRECT_URI;
  if (!redirectUri.startsWith('http://') && !redirectUri.startsWith('https://')) {
    console.log('❌ GOOGLE_REDIRECT_URI debe empezar con http:// o https://');
    hasErrors = true;
  } else if (!redirectUri.includes('/v1/auth/google/callback')) {
    console.log('⚠️  WARNING: GOOGLE_REDIRECT_URI debería terminar en /v1/auth/google/callback');
    hasWarnings = true;
  } else {
    console.log('✅ GOOGLE_REDIRECT_URI tiene formato correcto');
  }
  console.log('');
}

// Check frontend URL format
if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl.startsWith('http://') && !frontendUrl.startsWith('https://')) {
    console.log('❌ FRONTEND_URL debe empezar con http:// o https://');
    hasErrors = true;
  } else {
    console.log('✅ FRONTEND_URL tiene formato correcto');
  }
  console.log('');
}

// Summary
console.log('═'.repeat(60));
console.log('\n📊 Resumen:\n');

if (hasErrors) {
  console.log('❌ Se encontraron ERRORES críticos');
  console.log('   La integración de Google OAuth NO funcionará correctamente');
  console.log('   Por favor, configura las variables requeridas en apps/api/.env\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log('⚠️  Se encontraron WARNINGS');
  console.log('   La integración podría funcionar pero revisa las advertencias\n');
  process.exit(0);
} else {
  console.log('✅ Todas las verificaciones pasaron');
  console.log('   La configuración de Google OAuth está correcta\n');
  process.exit(0);
}
