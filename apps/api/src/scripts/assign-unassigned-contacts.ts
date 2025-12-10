#!/usr/bin/env tsx
/**
 * Script para asignar contactos sin assignedAdvisorId a un usuario específico.
 *
 * AI_DECISION: Parametrizar script para aceptar nombre de usuario como argumento
 * Justificación: Hace el script reutilizable para cualquier usuario
 * Impacto: Mejor developer experience y flexibilidad
 *
 * Uso:
 *   pnpm -F @cactus/api run assign-unassigned-contacts "Nombre Usuario"
 *
 * Ejemplo:
 *   pnpm -F @cactus/api run assign-unassigned-contacts "giolivo santarelli"
 */

import { db, contacts, users } from '@cactus/db';
import { eq, and, isNull, sql, or, ilike } from 'drizzle-orm';

async function assignUnassignedContacts() {
  // Obtener nombre de usuario desde argumentos CLI
  const targetUserName = process.argv[2] || 'giolivo santarelli'; // Default para backward compatibility

  if (process.argv.length <= 2) {
    console.log('\n💡 Tip: Puedes especificar un usuario como argumento:');
    console.log('   pnpm -F @cactus/api run assign-unassigned-contacts "Nombre Usuario"\n');
  }

  console.log(`\n🔍 Buscando usuario "${targetUserName}"...\n`);

  try {
    // Buscar usuario por nombre (case-insensitive) o email
    const searchPattern = `%${targetUserName}%`;
    const targetUser = await db()
      .select()
      .from(users)
      .where(
        or(
          sql`LOWER(${users.fullName}) LIKE LOWER(${searchPattern})`,
          sql`LOWER(${users.email}) LIKE LOWER(${searchPattern})`
        )
      )
      .limit(1);

    if (targetUser.length === 0) {
      console.error(`❌ No se encontró el usuario "${targetUserName}"`);
      console.log('\nSugerencias:');
      console.log('  - Verifica que el usuario exista en la base de datos');
      console.log('  - El nombre puede ser parcial (busca con LIKE)');
      console.log('  - Prueba con el email si conoces el dominio\n');
      console.log('📋 Usuarios disponibles:');
      const allUsers = await db()
        .select({ id: users.id, email: users.email, fullName: users.fullName, role: users.role })
        .from(users)
        .limit(20);
      allUsers.forEach((u: { fullName: string | null; email: string; role: string }) => {
        console.log(`   - ${u.fullName} (${u.email}) - ${u.role}`);
      });
      process.exit(1);
    }

    const user = targetUser[0];
    console.log(`✅ Usuario encontrado: ${user.fullName} (${user.email})`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Role: ${user.role}\n`);

    await assignContactsToUser(user.id, user.fullName);
  } catch (err) {
    console.error('❌ Error al buscar usuario:', err);
    process.exit(1);
  }
}

async function assignContactsToUser(userId: string, userName: string) {
  console.log('🔍 Buscando contactos sin assignedAdvisorId...\n');

  try {
    // Contar contactos sin asignar
    const unassignedCount = await db()
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(and(isNull(contacts.assignedAdvisorId), isNull(contacts.deletedAt)));

    const count = Number(unassignedCount[0]?.count || 0);

    if (count === 0) {
      console.log('✅ No hay contactos sin asignar. Todo está correcto!\n');

      // Verificar contactos totales para estadísticas
      const totalContacts = await db()
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(isNull(contacts.deletedAt));

      const assignedContacts = await db()
        .select({ count: sql<number>`count(*)` })
        .from(contacts)
        .where(and(sql`${contacts.assignedAdvisorId} IS NOT NULL`, isNull(contacts.deletedAt)));

      console.log('📊 Estadísticas:');
      console.log(`   Total contactos: ${Number(totalContacts[0]?.count || 0)}`);
      console.log(`   Contactos asignados: ${Number(assignedContacts[0]?.count || 0)}`);
      console.log(`   Contactos sin asignar: ${count}\n`);

      return;
    }

    console.log(`📊 Encontrados ${count} contactos sin asignar\n`);
    console.log('🔄 Asignando contactos...\n');

    // Obtener lista de contactos a asignar (primeros 10 para mostrar)
    const sampleContacts = await db()
      .select({
        id: contacts.id,
        fullName: contacts.fullName,
        email: contacts.email,
      })
      .from(contacts)
      .where(and(isNull(contacts.assignedAdvisorId), isNull(contacts.deletedAt)))
      .limit(10);

    console.log('📋 Ejemplos de contactos a asignar:');
    sampleContacts.forEach((c: { fullName: string | null; email: string | null }, i: number) => {
      console.log(`   ${i + 1}. ${c.fullName || 'Sin nombre'} (${c.email || 'Sin email'})`);
    });
    if (count > 10) {
      console.log(`   ... y ${count - 10} más\n`);
    } else {
      console.log('');
    }

    // Asignar todos los contactos sin assignedAdvisorId
    const updateResult = await db()
      .update(contacts)
      .set({
        assignedAdvisorId: userId,
        updatedAt: new Date(),
      })
      .where(and(isNull(contacts.assignedAdvisorId), isNull(contacts.deletedAt)))
      .returning({ id: contacts.id });

    const assignedCount = updateResult.length;

    console.log(`✅ ${assignedCount} contactos asignados exitosamente a ${userName}\n`);

    // Verificación: contar contactos ahora asignados a este usuario
    const verificationResult = await db()
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(and(eq(contacts.assignedAdvisorId, userId), isNull(contacts.deletedAt)));

    const verifiedCount = Number(verificationResult[0]?.count || 0);
    console.log(`🔍 Verificación: ${verifiedCount} contactos ahora asignados a ${userName}\n`);

    // Estadísticas finales
    const totalContacts = await db()
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(isNull(contacts.deletedAt));

    const stillUnassigned = await db()
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(and(isNull(contacts.assignedAdvisorId), isNull(contacts.deletedAt)));

    console.log('📊 Estadísticas finales:');
    console.log(`   Total contactos: ${Number(totalContacts[0]?.count || 0)}`);
    console.log(`   Contactos asignados a ${userName}: ${verifiedCount}`);
    console.log(`   Contactos sin asignar restantes: ${Number(stillUnassigned[0]?.count || 0)}\n`);

    if (Number(stillUnassigned[0]?.count || 0) === 0) {
      console.log('✅ ¡Todos los contactos están correctamente asignados!\n');
    } else {
      console.log('⚠️  Aún hay contactos sin asignar. Revisar configuración.\n');
    }
  } catch (err) {
    console.error('❌ Error al asignar contactos:', err);
    process.exit(1);
  }
}

assignUnassignedContacts()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
