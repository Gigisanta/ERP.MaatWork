#!/usr/bin/env tsx
/**
 * AI_DECISION: Script de carga natural de asesores iniciales
 * Justificación: Crear usuarios vía la misma capa de datos que usa la app, con hash de contraseña y validaciones básicas
 * Impacto: Inserta usuarios con rol 'advisor' si no existen; no afecta rutas ni lógica de producción
 */

import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

type SeedAdvisor = {
  username: string;
  password: string;
  email: string;
};

const seedAdvisors: SeedAdvisor[] = [
  { username: 'Mvicente', password: 'Mvicente123', email: 'Mvicente@grupoabax.com' },
  { username: 'Nzappia', password: 'Nzappia123', email: 'Nzappia@grupoabax.com' },
  { username: 'TDanziger', password: 'TDanziger123', email: 'Tdanziger@grupoabax.com' },
  { username: 'PMolina', password: 'PMolina123', email: 'Pmolina@grupoabax.com' },
  { username: 'NIngilde', password: 'NIngilde123', email: 'Ningilde@grupoabax.com' },
  { username: 'Fandreacchio', password: 'Fandreacchio123', email: 'Fandreacchio@grupoabax.com' },
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

  const passwordHash = await bcrypt.hash(password, 10);

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

  console.log(`✅ Creado: ${email} -> id=${created.id}`);
}

async function main(): Promise<void> {
  console.log('\n👥 Creando asesores iniciales...\n');
  for (const advisor of seedAdvisors) {
    try {
      await upsertAdvisor(advisor);
    } catch (err) {
      console.error(`❌ Error creando ${advisor.email}:`, err);
    }
  }
  console.log('\n🎉 Listo. Puedes ajustar roles desde el panel de admin.\n');
}

main()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
