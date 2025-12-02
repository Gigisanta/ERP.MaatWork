#!/usr/bin/env tsx
/**
 * Script para agregar usuario giolivosantarelli@gmail.com
 */

import { db, users } from '@cactus/db';
import { eq } from 'drizzle-orm';

async function addUser() {
  const email = 'giolivosantarelli@gmail.com';

  console.log(`\n🔐 Agregando usuario: ${email}\n`);

  try {
    // Verificar si ya existe
    const existingUsers = await db().query.users.findMany({
      where: eq(users.email, email),
      limit: 1,
    });

    if (existingUsers.length > 0) {
      console.log('✓ Usuario ya existe!');
      console.log(`  ID: ${existingUsers[0].id}`);
      console.log(`  Nombre: ${existingUsers[0].fullName}`);
      console.log(`  Role: ${existingUsers[0].role}`);
      console.log(`  Activo: ${existingUsers[0].isActive}`);
      console.log('\n✅ Puedes hacer login con este email.\n');
      return;
    }

    // Crear nuevo usuario
    const [newUser] = await db()
      .insert(users)
      .values({
        email: email,
        fullName: 'Gio Santarelli',
        role: 'admin', // Admin tiene todos los permisos
        isActive: true,
      })
      .returning();

    console.log('✅ Usuario creado exitosamente!');
    console.log(`  ID: ${newUser.id}`);
    console.log(`  Email: ${newUser.email}`);
    console.log(`  Nombre: ${newUser.fullName}`);
    console.log(`  Role: ${newUser.role}`);
    console.log(`  Activo: ${newUser.isActive}`);
    console.log('\n🎉 Ya puedes hacer login con este email!\n');

    console.log('📝 Para hacer login, envía una petición POST a:');
    console.log('   http://localhost:3001/auth/login');
    console.log('   Con body JSON:');
    console.log(`   { "email": "${email}" }\n`);
  } catch (err) {
    console.error('❌ Error al agregar usuario:', err);
    process.exit(1);
  }
}

addUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
