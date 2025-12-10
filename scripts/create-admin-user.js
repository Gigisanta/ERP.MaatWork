#!/usr/bin/env tsx

/**
 * Script para crear usuario admin inicial
 * Usado durante el setup inicial del proyecto
 */

import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';

// Cargar variables de entorno para conexión a DB
import 'dotenv/config';

/**
 * Crear usuario admin inicial
 */
export async function createAdminUser(options = {}) {
  const email = options.email || 'admin@cactus.local';
  const fullName = options.fullName || 'Admin Usuario';
  const password = options.password || 'admin123';

  try {
    // Verificar si ya existe un usuario con este email
    const existingUsers = await db().query.users.findMany({
      where: eq(users.email, email),
      limit: 1,
    });

    if (existingUsers.length > 0) {
      return {
        success: true,
        user: existingUsers[0],
        message: `Usuario ya existe: ${email}`,
      };
    }

    // Verificar si hay algún usuario admin en la base de datos
    const adminUsers = await db().select().from(users).where(eq(users.role, 'admin')).limit(1);

    if (adminUsers.length > 0) {
      console.log('ℹ️  Ya existe un usuario admin en la base de datos');
      return {
        success: true,
        user: adminUsers[0],
        message: 'Ya existe un usuario admin',
      };
    }

    // Crear nuevo usuario admin
    // Nota: En producción, deberías usar bcrypt para hashear la contraseña
    // Por ahora, el sistema de auth puede manejar usuarios sin passwordHash
    const [newUser] = await db()
      .insert(users)
      .values({
        email: email,
        fullName: fullName,
        role: 'admin',
        isActive: true,
        username: email.split('@')[0],
        usernameNormalized: email.split('@')[0].toLowerCase(),
      })
      .returning();

    return {
      success: true,
      user: newUser,
      message: `Usuario admin creado: ${email}`,
    };
  } catch (err) {
    const error = err;
    if (error.message && error.message.includes('duplicate key')) {
      return {
        success: true,
        message: `Usuario ya existe: ${email}`,
      };
    }
    return {
      success: false,
      message: `Error al crear usuario: ${error.message || String(err)}`,
    };
  }
}

/**
 * Función principal para ejecutar desde línea de comandos
 */
async function main() {
  const args = process.argv.slice(2);
  const emailArg = args.find((arg) => arg.startsWith('--email='));
  const fullNameArg = args.find((arg) => arg.startsWith('--fullName='));
  const passwordArg = args.find((arg) => arg.startsWith('--password='));

  const email = emailArg ? emailArg.split('=')[1] : undefined;
  const fullName = fullNameArg ? fullNameArg.split('=')[1] : undefined;
  const password = passwordArg ? passwordArg.split('=')[1] : undefined;

  console.log('\n🔐 Creando usuario admin inicial...\n');

  const result = await createAdminUser({
    email,
    fullName,
    password,
  });

  if (result.success) {
    if (result.user) {
      console.log('✅ Usuario admin creado exitosamente!');
      console.log(`  ID: ${result.user.id}`);
      console.log(`  Email: ${result.user.email}`);
      console.log(`  Nombre: ${result.user.fullName}`);
      console.log(`  Role: ${result.user.role}`);
      console.log(`  Activo: ${result.user.isActive}`);
      console.log('\n🎉 Ya puedes hacer login con este email!\n');
    } else {
      console.log(`ℹ️  ${result.message}\n`);
    }
    process.exit(0);
  } else {
    console.error(`❌ ${result.message}`);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}` || require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Error fatal:', err);
      process.exit(1);
    });
}
