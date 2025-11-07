#!/usr/bin/env tsx
/**
 * Script de verificación: Asignación de Contactos
 * 
 * Verifica que todos los contactos estén correctamente asignados a asesores.
 * 
 * Uso: pnpm -F @cactus/api verify-contacts-assignment
 */

import { config } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { db, contacts, users } from '@cactus/db';
import { eq, and, isNull, sql } from 'drizzle-orm';

// Cargar .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..', '..', '..');
config({ path: join(projectRoot, 'apps', 'api', '.env') });

interface VerificationResult {
  totalContacts: number;
  assignedContacts: number;
  unassignedContacts: number;
  invalidAssignments: number;
  unassignedList: Array<{ id: string; fullName: string | null; email: string | null }>;
  invalidAssignmentIds: string[];
  contactsByAdvisor: Array<{ advisorId: string; advisorName: string; advisorEmail: string; count: number }>;
}

async function verifyContactsAssignment(): Promise<VerificationResult> {
  console.log('='.repeat(80));
  console.log('VERIFICACIÓN: ASIGNACIÓN DE CONTACTOS');
  console.log('='.repeat(80));
  console.log('');
  
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
    
    // Obtener lista de contactos sin asignar
    const unassignedList = await db()
      .select({
        id: contacts.id,
        fullName: contacts.fullName,
        email: contacts.email
      })
      .from(contacts)
      .where(and(isNull(contacts.assignedAdvisorId), isNull(contacts.deletedAt)))
      .limit(10);
    
    // Estadísticas por advisor
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
    
    const contactsByAdvisorList: Array<{ advisorId: string; advisorName: string; advisorEmail: string; count: number }> = [];
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
        contactsByAdvisorList.push({
          advisorId: a.id,
          advisorName: a.fullName || 'Sin nombre',
          advisorEmail: a.email,
          count
        });
      }
    }

    return {
      totalContacts: total,
      assignedContacts: assigned,
      unassignedContacts: unassigned,
      invalidAssignments: invalidAssignments.length,
      unassignedList: unassignedList.map(c => ({
        id: c.id,
        fullName: c.fullName,
        email: c.email
      })),
      invalidAssignmentIds: invalidAssignments,
      contactsByAdvisor: contactsByAdvisorList
    };
  } catch (err) {
    console.error('❌ Error al verificar contactos:', err);
    throw err;
  }
}

function printReport(result: VerificationResult): void {
  console.log('\n' + '='.repeat(80));
  console.log('REPORTE DE VERIFICACIÓN');
  console.log('='.repeat(80));

  // Resumen general
  console.log('\n📊 RESUMEN GENERAL:');
  console.log(`   Total contactos: ${result.totalContacts}`);
  console.log(`   Contactos asignados: ${result.assignedContacts}`);
  console.log(`   Contactos sin asignar: ${result.unassignedContacts}`);
  console.log(`   Asignaciones inválidas: ${result.invalidAssignments}`);

  // Contactos sin asignar
  if (result.unassignedContacts > 0) {
    console.log('\n⚠️  CONTACTOS SIN ASIGNAR:');
    console.log(`   Total: ${result.unassignedContacts}`);
    result.unassignedList.slice(0, 10).forEach((c, i) => {
      console.log(`   ${i + 1}. ${c.fullName || 'Sin nombre'} (${c.email || 'Sin email'}) - ID: ${c.id}`);
    });
    if (result.unassignedContacts > 10) {
      console.log(`   ... y ${result.unassignedContacts - 10} más`);
    }
    console.log('\n   💡 Ejecuta: pnpm -F @cactus/api assign-unassigned-contacts');
  } else {
    console.log('\n✅ Todos los contactos están correctamente asignados');
  }

  // Asignaciones inválidas
  if (result.invalidAssignments > 0) {
    console.log('\n❌ ASIGNACIONES INVÁLIDAS:');
    console.log(`   Total: ${result.invalidAssignments}`);
    console.log(`   Contactos asignados a advisors que no existen`);
    console.log(`   IDs: ${result.invalidAssignmentIds.slice(0, 10).join(', ')}`);
    if (result.invalidAssignmentIds.length > 10) {
      console.log(`   ... y ${result.invalidAssignmentIds.length - 10} más`);
    }
  } else {
    console.log('\n✅ Todas las asignaciones son válidas');
  }

  // Estadísticas por advisor
  if (result.contactsByAdvisor.length > 0) {
    console.log('\n📊 ESTADÍSTICAS POR ADVISOR:');
    result.contactsByAdvisor.forEach(a => {
      console.log(`   ${a.advisorName} (${a.advisorEmail}): ${a.count} contactos`);
    });
  }

  // Resumen final
  console.log('\n' + '='.repeat(80));
  console.log('RESUMEN FINAL');
  console.log('='.repeat(80));

  const totalIssues = result.unassignedContacts + result.invalidAssignments;

  if (totalIssues === 0) {
    console.log('\n✅ VERIFICACIÓN EXITOSA');
    console.log('   Todos los contactos están correctamente asignados.\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  VERIFICACIÓN CON PROBLEMAS');
    console.log(`   Total de problemas encontrados: ${totalIssues}`);
    if (result.unassignedContacts > 0) {
      console.log(`   - Contactos sin asignar: ${result.unassignedContacts}`);
    }
    if (result.invalidAssignments > 0) {
      console.log(`   - Asignaciones inválidas: ${result.invalidAssignments}`);
    }
    console.log('');
    process.exit(1);
  }
}

async function main() {
  try {
    const result = await verifyContactsAssignment();
    printReport(result);
  } catch (error) {
    console.error('\n❌ Error durante la verificación:');
    console.error(error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();


