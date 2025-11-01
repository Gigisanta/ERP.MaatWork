#!/usr/bin/env tsx
/**
 * Script para verificar que todos los contactos están correctamente asignados
 * Uso: pnpm -F @cactus/api run tsx src/scripts/verify-contacts-assignment.ts
 */

import { db, contacts, users } from '@cactus/db';
import { eq, and, isNull, sql } from 'drizzle-orm';

async function verifyContactsAssignment() {
  console.log('\n🔍 Verificando asignación de contactos...\n');
  
  try {
    // Estadísticas generales
    const totalContacts = await db()
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(isNull(contacts.deletedAt));
    
    const assignedContacts = await db()
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(and(
        sql`${contacts.assignedAdvisorId} IS NOT NULL`,
        isNull(contacts.deletedAt)
      ));
    
    const unassignedContacts = await db()
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(and(isNull(contacts.assignedAdvisorId), isNull(contacts.deletedAt)));
    
    const total = Number(totalContacts[0]?.count || 0);
    const assigned = Number(assignedContacts[0]?.count || 0);
    const unassigned = Number(unassignedContacts[0]?.count || 0);
    
    console.log('📊 Estadísticas generales:');
    console.log(`   Total contactos: ${total}`);
    console.log(`   Contactos asignados: ${assigned}`);
    console.log(`   Contactos sin asignar: ${unassigned}\n`);
    
    if (unassigned > 0) {
      console.log('⚠️  ATENCIÓN: Hay contactos sin asignar!\n');
      
      const unassignedList = await db()
        .select({
          id: contacts.id,
          fullName: contacts.fullName,
          email: contacts.email,
          createdAt: contacts.createdAt
        })
        .from(contacts)
        .where(and(isNull(contacts.assignedAdvisorId), isNull(contacts.deletedAt)))
        .limit(10);
      
      console.log('📋 Ejemplos de contactos sin asignar:');
      unassignedList.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.fullName || 'Sin nombre'} (${c.email || 'Sin email'}) - ID: ${c.id}`);
      });
      if (unassigned > 10) {
        console.log(`   ... y ${unassigned - 10} más\n`);
      }
      
      console.log('💡 Ejecuta: pnpm -F @cactus/api run assign-unassigned-contacts\n');
    } else {
      console.log('✅ Todos los contactos están correctamente asignados!\n');
    }
    
    // Estadísticas por advisor
    console.log('📊 Estadísticas por advisor:\n');
    
    const contactsByAdvisor = await db()
      .select({
        advisorId: contacts.assignedAdvisorId,
        count: sql<number>`count(*)`
      })
      .from(contacts)
      .where(and(
        sql`${contacts.assignedAdvisorId} IS NOT NULL`,
        isNull(contacts.deletedAt)
      ))
      .groupBy(contacts.assignedAdvisorId);
    
    for (const row of contactsByAdvisor) {
      const advisorId = row.advisorId;
      const count = Number(row.count || 0);
      
      const advisor = await db()
        .select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role
        })
        .from(users)
        .where(eq(users.id, advisorId!))
        .limit(1);
      
      if (advisor.length > 0) {
        const a = advisor[0];
        console.log(`   ${a.fullName} (${a.email}):`);
        console.log(`      - Role: ${a.role}`);
        console.log(`      - Contactos asignados: ${count}\n`);
      } else {
        console.log(`   Advisor ID ${advisorId} (no encontrado): ${count} contactos\n`);
      }
    }
    
    // Verificar contactos con assignedAdvisorId inválido
    const allAssignedContacts = await db()
      .select({
        contactId: contacts.id,
        assignedAdvisorId: contacts.assignedAdvisorId
      })
      .from(contacts)
      .where(and(
        sql`${contacts.assignedAdvisorId} IS NOT NULL`,
        isNull(contacts.deletedAt)
      ))
      .limit(100);
    
    const invalidAssignments: string[] = [];
    for (const contact of allAssignedContacts) {
      if (!contact.assignedAdvisorId) continue;
      
      const advisor = await db()
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, contact.assignedAdvisorId))
        .limit(1);
      
      if (advisor.length === 0) {
        invalidAssignments.push(contact.contactId);
      }
    }
    
    if (invalidAssignments.length > 0) {
      console.log(`⚠️  ATENCIÓN: ${invalidAssignments.length} contactos asignados a advisors que no existen!\n`);
    } else {
      console.log('✅ Todos los contactos están asignados a advisors válidos!\n');
    }
    
    // Resumen final
    console.log('='.repeat(60));
    if (unassigned === 0 && invalidAssignments.length === 0) {
      console.log('✅ VERIFICACIÓN COMPLETA: Todo está correctamente configurado!\n');
    } else {
      console.log('⚠️  VERIFICACIÓN: Se encontraron problemas que requieren atención.\n');
      if (unassigned > 0) {
        console.log(`   - ${unassigned} contactos sin asignar`);
      }
      if (invalidAssignments.length > 0) {
        console.log(`   - ${invalidAssignments.length} contactos con advisors inválidos`);
      }
      console.log('');
    }
    
  } catch (err) {
    console.error('❌ Error al verificar contactos:', err);
    process.exit(1);
  }
}

verifyContactsAssignment()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });


