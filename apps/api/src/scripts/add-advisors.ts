#!/usr/bin/env tsx
/**
 * AI_DECISION: Script de carga natural de asesores iniciales
 * Justificación: Crear usuarios vía la misma capa de datos que usa la app, con hash de contraseña y validaciones básicas
 * Impacto: Inserta usuarios con rol 'advisor' si no existen; no afecta rutas ni lógica de producción
 */

import { db, users } from '@maatwork/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

type SeedAdvisor = {
  username: string;
  password?: string; // Optional - will be generated if not provided
  email: string;
};

// Generate random password for each advisor
function generatePassword(): string {
  return Math.random().toString(36).substring(2, 12);
}

const seedAdvisors: SeedAdvisor[] = [
  { username: 'Mvicente', email: 'Mvicente@grupoabax.com' },
  { username: 'Nzappia', email: 'Nzappia@grupoabax.com' },
  { username: 'TDanziger', email: 'Tdanziger@grupoabax.com' },
  { username: 'PMolina', email: 'Pmolina@grupoabax.com' },
  { username: 'NIngilde', email: 'Ningilde@grupoabax.com' },
  { username: 'Fandreacchio', email: 'Fandreacchio@grupoabax.com' },
];

export async function upsertAdvisor({ username, password, email }: SeedAdvisor): Promise<void> {
  // Normalizamos username para unicidad case-insensitive
  const normalized = username.toLowerCase();

  // Si ya existe por email, no duplicamos
  const existing = await db().query.users.findFirst({
    where: eq(users.email, email),
  });
  if (existing) {
    console.log(`✓ Ya existe: ${email} (id=${existing.id})`);
    return;
  }

  // Use provided password or generate a random one
  const actualPassword = password || generatePassword();
  const passwordHash = await bcrypt.hash(actualPassword, 10);

  const [created] = await db()
    .insert(users)
    .values({
      email,
      fullName: username,
      role: 'advisor',
      passwordHash,
      isActive: true,
      username,
      usernameNormalized: normalized,
    })
    .returning();

  console.log(`✅ Creado: ${email} -> id=${created.id} | password: ${actualPassword}`);
}

async function main(): Promise<void> {
  console.log('\n👥 Creando asesores iniciales...\n');
  console.log('⚠️  SECURITY WARNING: Contraseñas generadas se mostrarán abajo.');
  console.log('   Por favor cambia las contraseñas después del primer login.\n');

  for (const advisor of seedAdvisors) {
    try {
      await upsertAdvisor(advisor);
    } catch (err) {
      console.error(`❌ Error creando ${advisor.email}:`, err);
    }
  }
  console.log('\n🎉 Listo. Puedes ajustar roles desde el panel de admin.\n');
}

if (process.env.NODE_ENV !== 'test') {
  main()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
